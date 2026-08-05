import { NextRequest } from "next/server";
import { prisma } from "../../../../lib/db";
import { createSession, hashPassword } from "../../../../lib/auth";
import { normalizeEmail } from "../../../../lib/validators";
import { createRequestId, logEvent, respondJson } from "../../../../lib/observability";
import { csrfProtection } from "../../../../lib/csrf";
import { createSlug } from "../../../../lib/organization";
import { enforceAuthAbuseLimit } from "../../../../lib/authRateLimit";
import { validatePasswordStrength } from "../../../../lib/passwordValidation";
import { logSecurityEvent } from "../../../../lib/security-log";
import { trackReferral } from "../../../../lib/referral";

function abuseResponse(
  result: Awaited<ReturnType<typeof enforceAuthAbuseLimit>>,
  requestId: string,
) {
  const unavailable = result.reason === "CLIENT_IDENTITY_UNAVAILABLE" || result.reason === "BACKEND_UNAVAILABLE";
  return respondJson(
    { error: unavailable ? "AUTH_ABUSE_CONTROL_UNAVAILABLE" : "RATE_LIMITED", requestId },
    requestId,
    {
      status: unavailable ? 503 : 429,
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
      logEvent("warn", "signup_csrf_failed", { requestId });
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

    const payload = body as { email?: unknown; password?: unknown; name?: unknown; ref?: unknown };
    const referralCode = typeof payload.ref === "string" ? payload.ref.trim().toUpperCase() : null;

    let email: string;
    try {
      email = normalizeEmail(payload.email);
    } catch {
      return respondJson({ error: "INVALID_EMAIL", requestId }, requestId, { status: 400, headers: { "Cache-Control": "no-store" } });
    }

    const abuse = await enforceAuthAbuseLimit({
      action: "signup",
      subject: email,
      request,
    });
    if (!abuse.allowed) {
      logEvent("warn", "signup_rate_limited", {
        requestId,
        identifierHash: abuse.subjectHash,
        ipHash: abuse.clientHash,
        reason: abuse.reason,
      });
      return abuseResponse(abuse, requestId);
    }

    const password = typeof payload.password === "string" ? payload.password : "";
    const passwordCheck = validatePasswordStrength(password);
    if (!passwordCheck.valid) {
      return respondJson({ error: "WEAK_PASSWORD", requestId }, requestId, { status: 400, headers: { "Cache-Control": "no-store" } });
    }

    const name = typeof payload.name === "string" ? payload.name.trim() : null;
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return respondJson({ error: "EMAIL_TAKEN", requestId }, requestId, { status: 409, headers: { "Cache-Control": "no-store" } });
    }

    const slug = createSlug(email.split("@")[0]);
    const user = await prisma.user.create({
      data: {
        email,
        name,
        passwordHash: hashPassword(password),
        memberships: {
          create: {
            role: "OWNER",
            organization: {
              create: {
                name: name || email.split("@")[0],
                slug: `${slug}-${Date.now().toString(36)}`,
              },
            },
          },
        },
      },
    });

    await createSession(user.id);
    if (referralCode) {
      await trackReferral(referralCode, user.id).catch((error) => {
        logEvent("warn", "referral_tracking_failed", { requestId, error: error instanceof Error ? error.message : String(error) });
      });
    }

    logSecurityEvent({
      event: "session_created",
      userId: user.id,
      identifierHash: abuse.subjectHash,
      ipHash: abuse.clientHash,
      requestId,
    });
    logEvent("info", "signup_success", { requestId, userId: user.id });
    return respondJson({ ok: true, requestId }, requestId, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    logEvent("error", "signup_failed", { requestId, error: error instanceof Error ? error.message : String(error) });
    return respondJson({ error: "INTERNAL_ERROR", requestId }, requestId, { status: 500, headers: { "Cache-Control": "no-store" } });
  }
}
