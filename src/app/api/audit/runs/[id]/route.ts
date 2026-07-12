import { prisma } from "../../../../../lib/db";
import { validateAdminSession } from "../../../../../lib/admin-auth";
import { observeApiRequest } from "../../../../../lib/metrics";
import { createRequestId, logEvent, respondJson } from "../../../../../lib/observability";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const requestId = createRequestId();
  const startedAt = Date.now();
  let statusCode = 200;
  try {
    const isAuthenticated = await validateAdminSession();
    if (!isAuthenticated) {
      statusCode = 401;
      return respondJson({ error: "UNAUTHORIZED", requestId }, requestId, { status: 401 });
    }

    const { id } = await context.params;

    const run = await prisma.auditRun.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        startedAt: true,
        finishedAt: true,
        errorCode: true,
        errorMessage: true
      }
    });

    if (!run) {
      statusCode = 404;
      logEvent("warn", "audit_run_status_not_found", { requestId, runId: id });
      return respondJson({ error: "NOT_FOUND", requestId }, requestId, { status: 404, headers: { "Cache-Control": "no-store" } });
    }

    logEvent("info", "audit_run_status_fetched", { requestId, runId: id, durationMs: Date.now() - startedAt });
    return respondJson({ ...run, requestId }, requestId, { headers: { "Cache-Control": "no-store" } });
  } finally {
    observeApiRequest("/api/audit/runs/[id]", statusCode, Date.now() - startedAt);
  }
}
