import { NextRequest } from "next/server";
import { validateSession } from "../../../../lib/auth";
import { csrfProtection } from "../../../../lib/csrf";
import { consumeDistributedRateLimit } from "../../../../lib/rateLimit";
import { createRequestId, logEvent, respondJson } from "../../../../lib/observability";
import { TeamInviteError, acceptTeamInvite } from "../../../../lib/team-invites";

const ACCEPT_LIMIT = 10;
const ACCEPT_WINDOW_SEC = 15 * 60;

function teamInviteErrorResponse(error: TeamInviteError, requestId: string) {
  const statusByCode: Partial<Record<TeamInviteError["code"], number>> = {
    INVALID_TOKEN: 400,
    INVITE_NOT_FOUND: 404,
    INVITE_NOT_ACTIVE: 409,
    INVITE_EXPIRED: 410,
    INVITE_ALREADY_ACCEPTED: 409,
    INVITE_EMAIL_MISMATCH: 403,
    INVALID_ROLE: 409,
  };
  return respondJson(
    { error: error.code, requestId },
    requestId,
    { status: statusByCode[error.code] ?? 400, headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(request: NextRequest) {
  const requestId = createRequestId();

  try {
    const user = await validateSession();
    if (!user) {
      return respondJson({ error: "UNAUTHORIZED", requestId }, requestId, { status: 401, headers: { "Cache-Control": "no-store" } });
    }

    const csrfCheck = await csrfProtection(request);
    if (!csrfCheck.valid) {
      return respondJson({ error: "FORBIDDEN", requestId }, requestId, { status: 403, headers: { "Cache-Control": "no-store" } });
    }

    const limited = await consumeDistributedRateLimit({
      key: `team-invite-accept:${user.id}`,
      limit: ACCEPT_LIMIT,
      windowSec: ACCEPT_WINDOW_SEC,
    });
    if (!limited.allowed) {
      return respondJson(
        { error: "RATE_LIMITED", requestId },
        requestId,
        {
          status: 429,
          headers: {
            "Cache-Control": "no-store",
            "Retry-After": String(Math.max(1, limited.resetSec)),
            "x-ratelimit-limit": String(limited.limit),
            "x-ratelimit-remaining": String(limited.remaining),
          },
        },
      );
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return respondJson({ error: "INVALID_JSON", requestId }, requestId, { status: 400, headers: { "Cache-Control": "no-store" } });
    }

    const token = body && typeof body === "object" && "token" in body
      ? (body as { token?: unknown }).token
      : undefined;

    try {
      const accepted = await acceptTeamInvite({
        token,
        userId: user.id,
        userEmail: user.email,
      });

      logEvent("info", "team_invite_accepted", {
        requestId,
        organizationId: accepted.organizationId,
        membershipId: accepted.membershipId,
        reused: accepted.reused,
      });
      return respondJson(
        { ok: true, ...accepted, requestId },
        requestId,
        { headers: { "Cache-Control": "no-store" } },
      );
    } catch (error) {
      if (error instanceof TeamInviteError) return teamInviteErrorResponse(error, requestId);
      throw error;
    }
  } catch (error) {
    logEvent("error", "team_invite_accept_failed", {
      requestId,
      code: error instanceof Error ? error.name : "UNKNOWN",
    });
    return respondJson({ error: "INTERNAL_ERROR", requestId }, requestId, { status: 500, headers: { "Cache-Control": "no-store" } });
  }
}
