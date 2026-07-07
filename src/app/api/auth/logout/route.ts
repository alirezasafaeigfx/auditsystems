import { NextRequest } from "next/server";
import { destroySession, validateSession } from "../../../../lib/auth";
import { createRequestId, logEvent, respondJson } from "../../../../lib/observability";
import { csrfProtection } from "../../../../lib/csrf";
import { logSecurityEvent } from "../../../../lib/security-log";
import { hashClientIp, getClientIp } from "../../../../lib/security";

export async function POST(request: NextRequest) {
  const requestId = createRequestId();

  try {
    const csrfCheck = await csrfProtection(request);
    if (!csrfCheck.valid) {
      logEvent("warn", "logout_csrf_failed", { requestId });
      return respondJson({ error: "FORBIDDEN", requestId }, requestId, { status: 403, headers: { "Cache-Control": "no-store" } });
    }

    const user = await validateSession();
    await destroySession();
    logSecurityEvent({ event: "session_destroyed", userId: user?.id, ipHash: hashClientIp(getClientIp(request)), requestId });
    logEvent("info", "logout_success", { requestId });
    return respondJson({ ok: true, requestId }, requestId, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    logEvent("error", "logout_failed", { requestId, error: error instanceof Error ? error.message : String(error) });
    return respondJson({ error: "INTERNAL_ERROR", requestId }, requestId, { status: 500, headers: { "Cache-Control": "no-store" } });
  }
}
