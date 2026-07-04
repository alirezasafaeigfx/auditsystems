import { NextRequest } from "next/server";
import { prisma } from "../../../../lib/db";
import { createSession, verifyPassword } from "../../../../lib/auth";
import { normalizeEmail } from "../../../../lib/validators";
import { createRequestId, logEvent, respondJson } from "../../../../lib/observability";
import { csrfProtection } from "../../../../lib/csrf";

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

    const password = typeof payload.password === "string" ? payload.password : "";
    if (!password) {
      return respondJson({ error: "INVALID_CREDENTIALS", requestId }, requestId, { status: 401, headers: { "Cache-Control": "no-store" } });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !verifyPassword(password, user.passwordHash)) {
      return respondJson({ error: "INVALID_CREDENTIALS", requestId }, requestId, { status: 401, headers: { "Cache-Control": "no-store" } });
    }

    await createSession(user.id);

    logEvent("info", "login_success", { requestId, userId: user.id });
    return respondJson({ ok: true, requestId }, requestId, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    logEvent("error", "login_failed", { requestId, error: error instanceof Error ? error.message : String(error) });
    return respondJson({ error: "INTERNAL_ERROR", requestId }, requestId, { status: 500, headers: { "Cache-Control": "no-store" } });
  }
}
