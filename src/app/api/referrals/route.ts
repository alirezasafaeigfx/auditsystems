import { NextRequest } from "next/server";
import { validateSession } from "../../../lib/auth";
import { createRequestId, logEvent, respondJson } from "../../../lib/observability";
import { ensureReferralCode, getReferralStats, trackReferral } from "../../../lib/referral";

export async function GET() {
  const requestId = createRequestId();

  try {
    const user = await validateSession();
    if (!user) {
      return respondJson({ error: "UNAUTHORIZED", requestId }, requestId, { status: 401, headers: { "Cache-Control": "no-store" } });
    }

    const code = await ensureReferralCode(user.id);
    const stats = await getReferralStats(user.id);

    return respondJson({ ok: true, stats: { ...stats, referralCode: code }, requestId }, requestId, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    logEvent("error", "referral_stats_failed", { requestId, error: error instanceof Error ? error.message : String(error) });
    return respondJson({ error: "INTERNAL_ERROR", requestId }, requestId, { status: 500, headers: { "Cache-Control": "no-store" } });
  }
}

export async function POST(request: NextRequest) {
  const requestId = createRequestId();

  try {
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return respondJson({ error: "INVALID_PAYLOAD", requestId }, requestId, { status: 400, headers: { "Cache-Control": "no-store" } });
    }

    const { referralCode, userId } = body as { referralCode?: unknown; userId?: unknown };
    if (typeof referralCode !== "string" || typeof userId !== "string") {
      return respondJson({ error: "INVALID_PARAMS", requestId }, requestId, { status: 400, headers: { "Cache-Control": "no-store" } });
    }

    const referral = await trackReferral(referralCode, userId);
    if (!referral) {
      return respondJson({ ok: false, requestId }, requestId, { headers: { "Cache-Control": "no-store" } });
    }

    logEvent("info", "referral_tracked", { requestId, referrerId: referral.referrerId, referredId: referral.referredId });
    return respondJson({ ok: true, requestId }, requestId, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    logEvent("error", "referral_track_failed", { requestId, error: error instanceof Error ? error.message : String(error) });
    return respondJson({ error: "INTERNAL_ERROR", requestId }, requestId, { status: 500, headers: { "Cache-Control": "no-store" } });
  }
}
