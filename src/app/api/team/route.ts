import { NextRequest } from "next/server";
import { prisma } from "../../../lib/db";
import { validateSession, getOrganizationForUser } from "../../../lib/auth";
import { createRequestId, logEvent, respondJson } from "../../../lib/observability";
import { csrfProtection } from "../../../lib/csrf";
import { checkTeamPermission, getTeamMembers } from "../../../lib/team-auth";
import { consumeDistributedRateLimit } from "../../../lib/rateLimit";
import { deliverTeamInvite } from "../../../lib/team-invite-delivery";
import {
  TeamInviteError,
  createTeamInvite,
  resendTeamInvite,
  revokeTeamInvite,
} from "../../../lib/team-invites";

const TEAM_MUTATION_LIMIT = 20;
const TEAM_MUTATION_WINDOW_SEC = 60 * 60;

type MutableTeamRole = "ADMIN" | "VIEWER";

function parseMutableRole(value: unknown): MutableTeamRole | null {
  const role = typeof value === "string" ? value.trim().toUpperCase() : "";
  return role === "ADMIN" || role === "VIEWER" ? role : null;
}

function inviteErrorResponse(error: TeamInviteError, requestId: string) {
  const statusByCode: Record<TeamInviteError["code"], number> = {
    INVALID_EMAIL: 400,
    INVALID_ROLE: 400,
    INVALID_TOKEN: 400,
    CANNOT_INVITE_SELF: 400,
    ALREADY_MEMBER: 409,
    INVITE_PENDING: 409,
    INVITE_NOT_FOUND: 404,
    INVITE_NOT_ACTIVE: 409,
    INVITE_EXPIRED: 410,
    INVITE_ALREADY_ACCEPTED: 409,
    INVITE_EMAIL_MISMATCH: 403,
    DELIVERY_NOT_CONFIGURED: 503,
    DELIVERY_FAILED: 503,
  };
  return respondJson(
    { error: error.code, requestId },
    requestId,
    { status: statusByCode[error.code], headers: { "Cache-Control": "no-store" } },
  );
}

async function enforceTeamMutationLimit(userId: string, organizationId: string, requestId: string) {
  const rateLimit = await consumeDistributedRateLimit({
    key: `team-mutation:${organizationId}:${userId}`,
    limit: TEAM_MUTATION_LIMIT,
    windowSec: TEAM_MUTATION_WINDOW_SEC,
  });
  if (rateLimit.allowed) return null;

  return respondJson(
    { error: "RATE_LIMITED", requestId },
    requestId,
    {
      status: 429,
      headers: {
        "Cache-Control": "no-store",
        "Retry-After": String(Math.max(1, rateLimit.resetSec)),
        "x-ratelimit-limit": String(rateLimit.limit),
        "x-ratelimit-remaining": String(rateLimit.remaining),
      },
    },
  );
}

export async function GET() {
  const requestId = createRequestId();

  try {
    const user = await validateSession();
    if (!user) {
      return respondJson({ error: "UNAUTHORIZED", requestId }, requestId, { status: 401, headers: { "Cache-Control": "no-store" } });
    }

    const membership = await getOrganizationForUser(user.id);
    if (!membership) {
      return respondJson({ error: "NO_ORGANIZATION", requestId }, requestId, { status: 400, headers: { "Cache-Control": "no-store" } });
    }

    const { allowed } = await checkTeamPermission(user.id, membership.organizationId, "VIEWER");
    if (!allowed) {
      return respondJson({ error: "FORBIDDEN", requestId }, requestId, { status: 403, headers: { "Cache-Control": "no-store" } });
    }

    const [members, invites] = await Promise.all([
      getTeamMembers(membership.organizationId),
      prisma.teamMemberInvite.findMany({
        where: {
          organizationId: membership.organizationId,
          acceptedAt: null,
          expiresAt: { gt: new Date() },
        },
        select: { id: true, email: true, role: true, expiresAt: true, createdAt: true },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    return respondJson({ members, invites, requestId }, requestId, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    logEvent("error", "team_list_failed", { requestId, error: error instanceof Error ? error.message : String(error) });
    return respondJson({ error: "INTERNAL_ERROR", requestId }, requestId, { status: 500, headers: { "Cache-Control": "no-store" } });
  }
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

    const membership = await getOrganizationForUser(user.id);
    if (!membership) {
      return respondJson({ error: "NO_ORGANIZATION", requestId }, requestId, { status: 400, headers: { "Cache-Control": "no-store" } });
    }

    const { allowed } = await checkTeamPermission(user.id, membership.organizationId, "ADMIN");
    if (!allowed) {
      return respondJson({ error: "FORBIDDEN", requestId }, requestId, { status: 403, headers: { "Cache-Control": "no-store" } });
    }

    const limited = await enforceTeamMutationLimit(user.id, membership.organizationId, requestId);
    if (limited) return limited;

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return respondJson({ error: "INVALID_JSON", requestId }, requestId, { status: 400, headers: { "Cache-Control": "no-store" } });
    }

    if (!body || typeof body !== "object") {
      return respondJson({ error: "INVALID_PAYLOAD", requestId }, requestId, { status: 400, headers: { "Cache-Control": "no-store" } });
    }

    const payload = body as { email?: unknown; role?: unknown };
    try {
      const invite = await createTeamInvite({
        organizationId: membership.organizationId,
        invitedById: user.id,
        invitedByEmail: user.email,
        email: payload.email,
        role: payload.role ?? "VIEWER",
        deliver: deliverTeamInvite,
      });

      logEvent("info", "team_invite_created", {
        requestId,
        organizationId: membership.organizationId,
        inviteId: invite.id,
        role: invite.role,
      });
      return respondJson(
        { ok: true, invite, requestId },
        requestId,
        { status: 201, headers: { "Cache-Control": "no-store" } },
      );
    } catch (error) {
      if (error instanceof TeamInviteError) return inviteErrorResponse(error, requestId);
      throw error;
    }
  } catch (error) {
    logEvent("error", "team_invite_failed", {
      requestId,
      code: error instanceof Error ? error.name : "UNKNOWN",
    });
    return respondJson({ error: "INTERNAL_ERROR", requestId }, requestId, { status: 500, headers: { "Cache-Control": "no-store" } });
  }
}

export async function PATCH(request: NextRequest) {
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

    const membership = await getOrganizationForUser(user.id);
    if (!membership) {
      return respondJson({ error: "NO_ORGANIZATION", requestId }, requestId, { status: 400, headers: { "Cache-Control": "no-store" } });
    }

    const { allowed } = await checkTeamPermission(user.id, membership.organizationId, "ADMIN");
    if (!allowed) {
      return respondJson({ error: "FORBIDDEN", requestId }, requestId, { status: 403, headers: { "Cache-Control": "no-store" } });
    }

    const limited = await enforceTeamMutationLimit(user.id, membership.organizationId, requestId);
    if (limited) return limited;

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return respondJson({ error: "INVALID_JSON", requestId }, requestId, { status: 400, headers: { "Cache-Control": "no-store" } });
    }

    if (!body || typeof body !== "object") {
      return respondJson({ error: "INVALID_PAYLOAD", requestId }, requestId, { status: 400, headers: { "Cache-Control": "no-store" } });
    }

    const payload = body as { inviteId?: unknown; action?: unknown };
    const inviteId = typeof payload.inviteId === "string" ? payload.inviteId.trim() : "";
    const action = typeof payload.action === "string" ? payload.action.trim().toUpperCase() : "";
    if (!inviteId || !["RESEND", "REVOKE"].includes(action)) {
      return respondJson({ error: "INVALID_PAYLOAD", requestId }, requestId, { status: 400, headers: { "Cache-Control": "no-store" } });
    }

    try {
      if (action === "REVOKE") {
        await revokeTeamInvite({
          organizationId: membership.organizationId,
          inviteId,
          actorId: user.id,
        });
        logEvent("info", "team_invite_revoked", { requestId, organizationId: membership.organizationId, inviteId });
        return respondJson({ ok: true, requestId }, requestId, { headers: { "Cache-Control": "no-store" } });
      }

      const invite = await resendTeamInvite({
        organizationId: membership.organizationId,
        inviteId,
        actorId: user.id,
        deliver: deliverTeamInvite,
      });
      logEvent("info", "team_invite_resent", { requestId, organizationId: membership.organizationId, inviteId });
      return respondJson({ ok: true, invite, requestId }, requestId, { headers: { "Cache-Control": "no-store" } });
    } catch (error) {
      if (error instanceof TeamInviteError) return inviteErrorResponse(error, requestId);
      throw error;
    }
  } catch (error) {
    logEvent("error", "team_invite_action_failed", {
      requestId,
      code: error instanceof Error ? error.name : "UNKNOWN",
    });
    return respondJson({ error: "INTERNAL_ERROR", requestId }, requestId, { status: 500, headers: { "Cache-Control": "no-store" } });
  }
}

export async function PUT(request: NextRequest) {
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

    const membership = await getOrganizationForUser(user.id);
    if (!membership) {
      return respondJson({ error: "NO_ORGANIZATION", requestId }, requestId, { status: 400, headers: { "Cache-Control": "no-store" } });
    }

    const { allowed } = await checkTeamPermission(user.id, membership.organizationId, "ADMIN");
    if (!allowed) {
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

    const payload = body as { userId?: unknown; role?: unknown };
    const targetUserId = typeof payload.userId === "string" ? payload.userId : "";
    const newRole = parseMutableRole(payload.role);

    if (!targetUserId || !newRole) {
      return respondJson({ error: "INVALID_PAYLOAD", requestId }, requestId, { status: 400, headers: { "Cache-Control": "no-store" } });
    }

    if (targetUserId === user.id) {
      return respondJson({ error: "CANNOT_CHANGE_OWN_ROLE", requestId }, requestId, { status: 400, headers: { "Cache-Control": "no-store" } });
    }

    const targetMembership = await prisma.membership.findUnique({
      where: { userId_organizationId: { userId: targetUserId, organizationId: membership.organizationId } },
    });
    if (!targetMembership) {
      return respondJson({ error: "MEMBER_NOT_FOUND", requestId }, requestId, { status: 404, headers: { "Cache-Control": "no-store" } });
    }

    if (targetMembership.role === "OWNER") {
      return respondJson({ error: "CANNOT_CHANGE_OWNER_ROLE", requestId }, requestId, { status: 403, headers: { "Cache-Control": "no-store" } });
    }

    await prisma.membership.update({
      where: { id: targetMembership.id },
      data: { role: newRole },
    });

    logEvent("info", "team_role_changed", { requestId, organizationId: membership.organizationId, targetUserId, newRole });
    return respondJson({ ok: true, requestId }, requestId, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    logEvent("error", "team_role_change_failed", { requestId, error: error instanceof Error ? error.message : String(error) });
    return respondJson({ error: "INTERNAL_ERROR", requestId }, requestId, { status: 500, headers: { "Cache-Control": "no-store" } });
  }
}

export async function DELETE(request: NextRequest) {
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

    const membership = await getOrganizationForUser(user.id);
    if (!membership) {
      return respondJson({ error: "NO_ORGANIZATION", requestId }, requestId, { status: 400, headers: { "Cache-Control": "no-store" } });
    }

    const { allowed } = await checkTeamPermission(user.id, membership.organizationId, "ADMIN");
    if (!allowed) {
      return respondJson({ error: "FORBIDDEN", requestId }, requestId, { status: 403, headers: { "Cache-Control": "no-store" } });
    }

    const url = new URL(request.url);
    const targetUserId = url.searchParams.get("userId");

    if (!targetUserId) {
      return respondJson({ error: "MISSING_USER_ID", requestId }, requestId, { status: 400, headers: { "Cache-Control": "no-store" } });
    }

    if (targetUserId === user.id) {
      return respondJson({ error: "CANNOT_REMOVE_SELF", requestId }, requestId, { status: 400, headers: { "Cache-Control": "no-store" } });
    }

    const targetMembership = await prisma.membership.findUnique({
      where: { userId_organizationId: { userId: targetUserId, organizationId: membership.organizationId } },
    });
    if (!targetMembership) {
      return respondJson({ error: "MEMBER_NOT_FOUND", requestId }, requestId, { status: 404, headers: { "Cache-Control": "no-store" } });
    }

    if (targetMembership.role === "OWNER") {
      return respondJson({ error: "CANNOT_REMOVE_OWNER", requestId }, requestId, { status: 403, headers: { "Cache-Control": "no-store" } });
    }

    await prisma.membership.delete({ where: { id: targetMembership.id } });

    logEvent("info", "team_member_removed", { requestId, organizationId: membership.organizationId, targetUserId });
    return respondJson({ ok: true, requestId }, requestId, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    logEvent("error", "team_remove_failed", { requestId, error: error instanceof Error ? error.message : String(error) });
    return respondJson({ error: "INTERNAL_ERROR", requestId }, requestId, { status: 500, headers: { "Cache-Control": "no-store" } });
  }
}
