import { prisma } from "../../../../lib/db";
import { verifyDownloadToken } from "../../../../lib/downloadToken";
import { observeApiRequest } from "../../../../lib/metrics";
import { createRequestId, respondJson } from "../../../../lib/observability";
import { buildAuditReportPdf } from "../../../../lib/pdf";
import { isReportShareAccessible } from "../../../../lib/reportShare";
import { NextRequest } from "next/server";

export async function GET(request: NextRequest, context: { params: Promise<{ token: string }> }) {
  const requestId = createRequestId();
  const startedAt = Date.now();
  let statusCode = 200;

  try {
    const { token } = await context.params;
    const dl = request.nextUrl.searchParams.get("dl") ?? "";

    const payload = verifyDownloadToken(dl);
    if (!payload) {
      statusCode = 401;
      return respondJson({ error: "INVALID_DOWNLOAD_TOKEN", requestId }, requestId, {
        status: statusCode,
        headers: { "Cache-Control": "no-store" }
      });
    }

    const share = await prisma.reportShare.findUnique({
      where: { token },
      include: {
        run: {
          include: {
            findings: { orderBy: { createdAt: "asc" } },
            orders: true
          }
        }
      }
    });

    if (!share || !isReportShareAccessible(share)) {
      statusCode = 404;
      return respondJson({ error: "NOT_FOUND", requestId }, requestId, { status: statusCode, headers: { "Cache-Control": "no-store" } });
    }

    if (payload.runId !== share.runId) {
      statusCode = 403;
      return respondJson({ error: "RUN_MISMATCH", requestId }, requestId, { status: statusCode, headers: { "Cache-Control": "no-store" } });
    }

    const paidOrder = share.run.orders.find((order) => order.id === payload.orderId && order.email === payload.email && order.status === "PAID");
    if (!paidOrder) {
      statusCode = 403;
      return respondJson({ error: "ORDER_NOT_PAID", requestId }, requestId, {
        status: statusCode,
        headers: { "Cache-Control": "no-store" }
      });
    }

    const pdfBytes = await buildAuditReportPdf({
      reportTitle: "Iran Readiness Audit Report",
      targetUrl: share.run.normalizedUrl ?? share.run.url,
      status: share.run.status,
      findings: share.run.findings.map((finding) => ({
        code: finding.code,
        title: finding.title,
        severity: finding.severity,
        recommendation: finding.recommendation
      })),
      generatedAt: new Date().toISOString(),
      locale: share.run.locale ?? "en"
    });

    return new Response(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="audit-${share.run.id}.pdf"`,
        "Cache-Control": "no-store",
        "x-request-id": requestId
      }
    });
  } finally {
    observeApiRequest("/api/pdf/[token]", statusCode, Date.now() - startedAt);
  }
}
