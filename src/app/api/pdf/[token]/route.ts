import { prisma } from "../../../../lib/db";
import { verifyDownloadToken } from "../../../../lib/downloadToken";
import { observeApiRequest } from "../../../../lib/metrics";
import { createRequestId, respondJson } from "../../../../lib/observability";
import { isPerformanceEvidenceBundle } from "../../../../lib/performance-evidence";
import { appendPerformanceEvidencePage } from "../../../../lib/performance-report";
import { buildAuditReportPdf } from "../../../../lib/pdf";
import { isReportShareAccessible } from "../../../../lib/reportShare";
import { calculateScore } from "../../../../lib/scoring";
import { getCurrentPlan } from "../../../../lib/usage";
import { NextRequest } from "next/server";

function hexToRgb(hex: string): [number, number, number] {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return [0.02, 0.59, 0.41];
  return [
    parseInt(result[1], 16) / 255,
    parseInt(result[2], 16) / 255,
    parseInt(result[3], 16) / 255
  ];
}

function performanceFromSummary(summary: unknown) {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) return undefined;
  const performance = (summary as Record<string, unknown>).performance;
  return isPerformanceEvidenceBundle(performance) ? performance : undefined;
}

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

    if (share.run.organizationId) {
      const plan = await getCurrentPlan(share.run.organizationId);
      if (!plan.pdfExport) {
        statusCode = 403;
        return respondJson({ error: "PLAN_NO_PDF", requestId }, requestId, {
          status: statusCode,
          headers: { "Cache-Control": "no-store" }
        });
      }
    }

    const findingsData = share.run.findings.map((finding) => ({
      code: finding.code,
      title: finding.title,
      severity: finding.severity,
      recommendation: finding.recommendation,
      category: finding.category
    }));

    const score = calculateScore(
      share.run.findings.map((f) => ({
        category: f.category,
        severity: f.severity
      }))
    );

    let agencyName: string | undefined;
    let agencyLogo: string | undefined;
    let primaryColor: [number, number, number] | undefined;
    let secondaryColor: [number, number, number] | undefined;

    if (share.run.organizationId) {
      const org = await prisma.organization.findUnique({
        where: { id: share.run.organizationId },
        select: { brandName: true, name: true, brandLogoBase64: true, primaryColor: true, secondaryColor: true }
      });
      agencyName = org?.brandName ?? org?.name ?? undefined;
      agencyLogo = org?.brandLogoBase64 ?? undefined;
      if (org?.primaryColor) primaryColor = hexToRgb(org.primaryColor);
      if (org?.secondaryColor) secondaryColor = hexToRgb(org.secondaryColor);
    }

    const basePdfBytes = await buildAuditReportPdf({
      reportTitle: "Iran Readiness Audit Report",
      targetUrl: share.run.normalizedUrl ?? share.run.url,
      status: share.run.status,
      findings: findingsData,
      generatedAt: new Date().toISOString(),
      locale: share.run.locale ?? "en",
      score: {
        overall: score.overall,
        grade: score.grade,
        categories: score.categories,
        severityCounts: score.severityCounts,
        totalFindings: score.totalFindings
      },
      agencyName,
      agencyLogo,
      primaryColor,
      secondaryColor
    });
    const pdfBytes = await appendPerformanceEvidencePage(
      basePdfBytes,
      performanceFromSummary(share.run.summary),
    );

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
