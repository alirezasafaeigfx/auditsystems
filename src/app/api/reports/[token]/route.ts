import { prisma } from "../../../../lib/db";
import { observeApiRequest } from "../../../../lib/metrics";
import { createRequestId, logEvent, respondJson } from "../../../../lib/observability";
import { isReportShareAccessible, hasPassword, verifyPassword } from "../../../../lib/reportShare";

export async function GET(request: Request, context: { params: Promise<{ token: string }> }) {
  const requestId = createRequestId();
  const startedAt = Date.now();
  let statusCode = 200;
  try {
    const { token } = await context.params;

    const share = await prisma.reportShare.findUnique({
      where: { token },
      include: {
        run: {
          include: {
            findings: {
              orderBy: [{ createdAt: "asc" }]
            }
          }
        }
      }
    });

    if (!share || !isReportShareAccessible(share)) {
      statusCode = 404;
      logEvent("warn", "report_fetch_not_found", { requestId, token });
      return respondJson({ error: "NOT_FOUND", requestId }, requestId, { status: 404, headers: { "Cache-Control": "no-store" } });
    }

    if (hasPassword(share)) {
      const url = new URL(request.url);
      const providedPassword = url.searchParams.get("password");
      if (!providedPassword || !verifyPassword(providedPassword, share.passwordHash!)) {
        statusCode = 401;
        return respondJson(
          { error: "PASSWORD_REQUIRED", requestId },
          requestId,
          { status: 401, headers: { "Cache-Control": "no-store" } }
        );
      }
    }

    await prisma.reportShare.update({
      where: { token },
      data: {
        viewCount: { increment: 1 },
        lastViewedAt: new Date()
      }
    });

    logEvent("info", "report_fetched", { requestId, runId: share.run.id, durationMs: Date.now() - startedAt });
    return respondJson(
      {
        run: {
          id: share.run.id,
          url: share.run.url,
          normalizedUrl: share.run.normalizedUrl,
          status: share.run.status,
          summary: share.run.summary
        },
        findings: share.run.findings,
        status: share.run.status,
        share: {
          viewCount: share.viewCount + 1,
          lastViewedAt: new Date().toISOString(),
          expiresAt: share.expiresAt?.toISOString()
        },
        requestId
      },
      requestId,
      { headers: { "Cache-Control": "no-store" } }
    );
  } finally {
    observeApiRequest("/api/reports/[token]", statusCode, Date.now() - startedAt);
  }
}
