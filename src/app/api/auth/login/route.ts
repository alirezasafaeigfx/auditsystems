import { NextRequest } from "next/server";
import { prisma } from "../../../../lib/db";
import { createSession, verifyPassword } from "../../../../lib/auth";
import { normalizeEmail } from "../../../../lib/validators";
import { createRequestId, logEvent, respondJson } from "../../../../lib/observability";
import { csrfProtection } from "../../../../lib/csrf";
import { enforceAuthAbuseLimit } from "../../../../lib/authRateLimit";
import { logSecurityEvent } from "../../../../lib/security-log";

function abuseResponse(
  result: Awaited<ReturnType<typeof enforceAuthAbuseLimit>>,
  requestId: string,
) {
  const unavailable = result.reason === "CLIENT_IDENTITY_UNAVAILABLE" || result.reason === "BACKEND_UNAVAILABLE";
  const status = unavailable ? 503 : 429;
  return respondJson(
    { error: unavailable ? "AUTH_ABUSE_CONTROL_UNAVAILABLE" : "RATE_LIMITED", requestId },
    requestId,
    {
      status,
      headers: {
        "Cache-Control": "no-store",
        "Retry-After": String(Math.max(1, result.retryAfterSec)),
      },
    },
  );
}

export async function POST(request: NextRequest) {
  const requestId = createRequestId();

  try {
    const csrfCheck = await csrfProtection(request);
    if (!csrfCheck.valid) {
      logEvent("warn", "login_csrf_failed", { requestId });
      return respondJson({ error: "FORBIDDEN", requestId }, requestId, { status: 403, headers: { "Cache-Control": "no-store" } });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return respondJson({ error: "INVALID_JSON", requestId }, requestId, { status: 400, headers: { "Cache-Control": "no-store" } });
    }

    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return respondJson({ error: "INVALID_PAYLOAD", requestId }, requestId, { status: 400, headers: { "Cache-Control": "no-store" } });
    }

    const payload = body as { email?: unknown; password?: unknown };
    let email: string;
    try {
      email = normalizeEmail(payload.email);
    } catch {
      return respondJson({ error: "INVALID_EMAIL", requestId }, requestId, { status: 400, headers: { "Cache-Control": "no-store" } });
    }

    const abuse = await enforceAuthAbuseLimit({
      action: "user-login",
      subject: email,
      request,
    });
    if (!abuse.allowed) {
      logSecurityEvent({
        event: "login_rate_limited",
        identifierHash: abuse.subjectHash,
        ipHash: abuse.clientHash,
        requestId,
        detail: abuse.reason,
      });
      return abuseResponse(abuse, requestId);
    }

    const password = typeof payload.password === "string" ? payload.password : "";
    if (!password) {
      logSecurityEvent({
        event: "login_failed",
        identifierHash: abuse.subjectHash,
        ipHash: abuse.clientHash,
        requestId,
        detail: "empty_password",
      });
      return respondJson({ error: "INVALID_CREDENTIALS", requestId }, requestId, { status: 401, headers: { "Cache-Control": "no-store" } });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !verifyPassword(password, user.passwordHash)) {
      logSecurityEvent({
        event: "login_failed",
        identifierHash: abuse.subjectHash,
        ipHash: abuse.clientHash,
        requestId,
        detail: "bad_credentials",
      });
      return respondJson({ error: "INVALID_CREDENTIALS", requestId }, requestId, { status: 401, headers: { "Cache-Control": "no-store" } });
    }

    await createSession(user.id);
    logSecurityEvent({
      event: "login_success",
      userId: user.id,
      identifierHash: abuse.subjectHash,
      ipHash: abuse.clientHash,
      requestId,
    });
    return respondJson({ ok: true, requestId }, requestId, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    logEvent("error", "login_failed", { requestId, error: error instanceof Error ? error.message : String(error) });
    return respondJson({ error: "INTERNAL_ERROR", requestId }, requestId, { status: 500, headers: { "Cache-Control": "no-store" } });
  }
}
