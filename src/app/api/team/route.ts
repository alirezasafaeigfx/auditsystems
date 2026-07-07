import { NextRequest } from "next/server";
import crypto from "node:crypto";
import { prisma } from "../../../lib/db";
import { validateSession, getOrganizationForUser } from "../../../lib/auth";
import { createRequestId, logEvent, respondJson } from "../../../lib/observability";
import { csrfProtection } from "../../../lib/csrf";
import { checkTeamPermission, parseRole, getTeamMembers } from "../../../lib/team-auth";

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

    const members = await getTeamMembers(membership.organizationId);

    const invites = await prisma.teamMemberInvite.findMany({
      where: { organizationId: membership.organizationId, acceptedAt: null, expiresAt: { gt: new Date() } },
      select: { id: true, email: true, role: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    });

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
    const email = typeof payload.email === "string" ? payload.email.trim().toLowerCase() : "";
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return respondJson({ error: "INVALID_EMAIL", requestId }, requestId, { status: 400, headers: { "Cache-Control": "no-store" } });
    }

    if (email === user.email) {
      return respondJson({ error: "CANNOT_INVITE_SELF", requestId }, requestId, { status: 400, headers: { "Cache-Control": "no-store" } });
    }

    const role = typeof payload.role === "string" ? parseRole(payload.role) : "VIEWER";

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      const existingMembership = await prisma.membership.findUnique({
        where: { userId_organizationId: { userId: existingUser.id, organizationId: membership.organizationId } },
      });
      if (existingMembership) {
        return respondJson({ error: "ALREADY_MEMBER", requestId }, requestId, { status: 409, headers: { "Cache-Control": "no-store" } });
      }
    }

    const existingInvite = await prisma.teamMemberInvite.findUnique({
      where: { organizationId_email: { organizationId: membership.organizationId, email } },
    });
    if (existingInvite && !existingInvite.acceptedAt && existingInvite.expiresAt > new Date()) {
      return respondJson({ error: "INVITE_PENDING", requestId }, requestId, { status: 409, headers: { "Cache-Control": "no-store" } });
    }

    const token = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await prisma.teamMemberInvite.create({
      data: {
        organizationId: membership.organizationId,
        email,
        role,
        tokenHash,
        invitedById: user.id,
        expiresAt,
      },
    });

    logEvent("info", "team_invite_sent", { requestId, orgId: membership.organizationId, email, role });
    return respondJson({ ok: true, requestId }, requestId, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    logEvent("error", "team_invite_failed", { requestId, error: error instanceof Error ? error.message : String(error) });
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
    const newRole = typeof payload.role === "string" ? parseRole(payload.role) : "";

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

    logEvent("info", "team_role_changed", { requestId, orgId: membership.organizationId, targetUserId, newRole });
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

    logEvent("info", "team_member_removed", { requestId, orgId: membership.organizationId, targetUserId });
    return respondJson({ ok: true, requestId }, requestId, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    logEvent("error", "team_remove_failed", { requestId, error: error instanceof Error ? error.message : String(error) });
    return respondJson({ error: "INTERNAL_ERROR", requestId }, requestId, { status: 500, headers: { "Cache-Control": "no-store" } });
  }
}
