import { NextRequest } from "next/server";
import { validateSession } from "../../../../lib/auth";
import { createEmailVerificationToken } from "../../../../lib/emailVerification";
import { csrfProtection } from "../../../../lib/csrf";
import { createRequestId, logEvent, respondJson } from "../../../../lib/observability";

export async function POST(request: NextRequest) {
  const requestId = createRequestId();

  try {
    const csrfCheck = await csrfProtection(request);
    if (!csrfCheck.valid) {
      return respondJson({ error: "FORBIDDEN", requestId }, requestId, { status: 403, headers: { "Cache-Control": "no-store" } });
    }

    const user = await validateSession();
    if (!user) {
      return respondJson({ error: "UNAUTHORIZED", requestId }, requestId, { status: 401, headers: { "Cache-Control": "no-store" } });
    }

    const token = await createEmailVerificationToken(user.id);
    const verifyUrl = `/verify-email?token=${encodeURIComponent(token)}`;

    logEvent("info", "verification_email_sent", {
      requestId,
      userId: user.id,
      email: user.email
    });

    if (process.env.NODE_ENV !== "production") {
      console.log(`[DEV] Verification URL: ${verifyUrl}`);
    }

    return respondJson({
      ok: true,
      message: "Verification email queued.",
      requestId
    }, requestId, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    logEvent("error", "resend_verification_failed", {
      requestId,
      code: error instanceof Error ? error.message : String(error)
    });
    return respondJson({ error: "INTERNAL_ERROR", requestId }, requestId, { status: 500, headers: { "Cache-Control": "no-store" } });
  }
}
