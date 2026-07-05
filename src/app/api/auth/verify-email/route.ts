import { NextRequest } from "next/server";
import { verifyEmailToken } from "../../../../lib/emailVerification";
import { createRequestId, respondJson } from "../../../../lib/observability";

export async function GET(request: NextRequest) {
  const requestId = createRequestId();
  const token = request.nextUrl.searchParams.get("token");

  if (!token) {
    return respondJson({ valid: false, message: "Token is required.", requestId }, requestId, { status: 400 });
  }

  try {
    const result = await verifyEmailToken(token);

    if (result.valid) {
      return respondJson({ valid: true, message: "Email verified successfully.", requestId }, requestId);
    }

    const messages: Record<string, string> = {
      TOKEN_NOT_FOUND: "Invalid verification token.",
      TOKEN_ALREADY_USED: "This verification link has already been used.",
      TOKEN_EXPIRED: "This verification link has expired. Please request a new one."
    };

    return respondJson({
      valid: false,
      message: messages[result.reason ?? ""] || "Verification failed.",
      requestId
    }, requestId, { status: 400 });
  } catch {
    return respondJson({ valid: false, message: "Verification failed.", requestId }, requestId, { status: 500 });
  }
}
