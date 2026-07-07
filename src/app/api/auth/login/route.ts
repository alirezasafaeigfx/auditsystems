import { NextRequest } from "next/server";
import { prisma } from "../../../../lib/db";
import { createSession, verifyPassword } from "../../../../lib/auth";
import { normalizeEmail } from "../../../../lib/validators";
import { createRequestId, logEvent, respondJson } from "../../../../lib/observability";
import { csrfProtection } from "../../../../lib/csrf";
import { checkAuthRateLimit } from "../../../../lib/authRateLimit";
import { isAccountLocked, recordFailedLogin, clearFailedLogins } from "../../../../lib/account-lockout";
import { logSecurityEvent } from "../../../../lib/security-log";
import { hashClientIp, getClientIp } from "../../../../lib/security";

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

    if (!body || typeof body !== "object") {
      return respondJson({ error: "INVALID_PAYLOAD", requestId }, requestId, { status: 400, headers: { "Cache-Control": "no-store" } });
    }

    const payload = body as { email?: unknown; password?: unknown };

    let email: string;
    try {
      email = normalizeEmail(payload.email);
    } catch {
      return respondJson({ error: "INVALID_EMAIL", requestId }, requestId, { status: 400, headers: { "Cache-Control": "no-store" } });
    }

    const clientIp = getClientIp(request);
    const ipHash = hashClientIp(clientIp);

    const lockCheck = isAccountLocked(email);
    if (lockCheck.locked) {
      logSecurityEvent({ event: "login_locked", email, ipHash, requestId });
      return respondJson({ error: "ACCOUNT_LOCKED", retryAfterSec: lockCheck.retryAfterSec, requestId }, requestId, { status: 423, headers: { "Cache-Control": "no-store" } });
    }

    const rateLimitKey = `auth:login:${email}`;
    const rateCheck = checkAuthRateLimit(rateLimitKey);
    if (!rateCheck.allowed) {
      logSecurityEvent({ event: "login_rate_limited", email, ipHash, requestId });
      return respondJson({ error: "RATE_LIMITED", requestId }, requestId, { status: 429, headers: { "Cache-Control": "no-store" } });
    }

    const password = typeof payload.password === "string" ? payload.password : "";
    if (!password) {
      logSecurityEvent({ event: "login_failed", email, ipHash, requestId, detail: "empty_password" });
      return respondJson({ error: "INVALID_CREDENTIALS", requestId }, requestId, { status: 401, headers: { "Cache-Control": "no-store" } });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !verifyPassword(password, user.passwordHash)) {
      const lockout = recordFailedLogin(email);
      logSecurityEvent({ event: "login_failed", email, ipHash, requestId, detail: lockout.locked ? "account_locked" : "bad_credentials" });
      if (lockout.locked) {
        return respondJson({ error: "ACCOUNT_LOCKED", retryAfterSec: lockout.retryAfterSec, requestId }, requestId, { status: 423, headers: { "Cache-Control": "no-store" } });
      }
      return respondJson({ error: "INVALID_CREDENTIALS", requestId }, requestId, { status: 401, headers: { "Cache-Control": "no-store" } });
    }

    clearFailedLogins(email);
    await createSession(user.id);

    logSecurityEvent({ event: "login_success", userId: user.id, email, ipHash, requestId });
    return respondJson({ ok: true, requestId }, requestId, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    logEvent("error", "login_failed", { requestId, error: error instanceof Error ? error.message : String(error) });
    return respondJson({ error: "INTERNAL_ERROR", requestId }, requestId, { status: 500, headers: { "Cache-Control": "no-store" } });
  }
}
