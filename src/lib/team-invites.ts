import crypto from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "./db";
import { normalizeEmail } from "./validators";
import type { TeamInviteDeliveryInput } from "./team-invite-delivery";

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const INVITE_TOKEN_BYTES = 32;
const MAX_SERIALIZABLE_RETRIES = 3;

export const TEAM_INVITE_ROLES = ["ADMIN", "VIEWER"] as const;
export type TeamInviteRole = (typeof TEAM_INVITE_ROLES)[number];
export type TeamInviteDelivery = (input: TeamInviteDeliveryInput) => Promise<void>;

export type TeamInviteErrorCode =
  | "INVALID_EMAIL"
  | "INVALID_ROLE"
  | "INVALID_TOKEN"
  | "CANNOT_INVITE_SELF"
  | "ALREADY_MEMBER"
  | "INVITE_PENDING"
  | "INVITE_NOT_FOUND"
  | "INVITE_NOT_ACTIVE"
  | "INVITE_EXPIRED"
  | "INVITE_ALREADY_ACCEPTED"
  | "INVITE_EMAIL_MISMATCH"
  | "DELIVERY_NOT_CONFIGURED"
  | "DELIVERY_FAILED";

export class TeamInviteError extends Error {
  constructor(public readonly code: TeamInviteErrorCode) {
    super(code);
    this.name = "TeamInviteError";
  }
}

function parseInviteRole(value: unknown): TeamInviteRole {
  const role = typeof value === "string" ? value.trim().toUpperCase() : "";
  if (TEAM_INVITE_ROLES.includes(role as TeamInviteRole)) return role as TeamInviteRole;
  throw new TeamInviteError("INVALID_ROLE");
}

function normalizeInviteEmail(value: unknown): string {
  try {
    return normalizeEmail(value);
  } catch {
    throw new TeamInviteError("INVALID_EMAIL");
  }
}

function createRawToken(): string {
  return crypto.randomBytes(INVITE_TOKEN_BYTES).toString("hex");
}

export function hashTeamInviteToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function emailDigest(email: string): string {
  const salt = String(process.env.IP_HASH_SALT ?? "").trim();
  if (!salt) throw new Error("IP_HASH_SALT environment variable is required but not set");
  return crypto.createHmac("sha256", salt).update(email).digest("hex");
}

function isRetryableTransactionError(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034";
}

async function withSerializableRetry<T>(work: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= MAX_SERIALIZABLE_RETRIES; attempt += 1) {
    try {
      return await prisma.$transaction(work, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      });
    } catch (error) {
      lastError = error;
      if (!isRetryableTransactionError(error) || attempt === MAX_SERIALIZABLE_RETRIES) throw error;
    }
  }
  throw lastError;
}

async function recordEvent(
  tx: Prisma.TransactionClient,
  input: {
    organizationId: string;
    inviteId: string;
    eventType: string;
    actorId: string;
    email: string;
    role?: TeamInviteRole;
  },
): Promise<void> {
  await tx.billingEvent.create({
    data: {
      organizationId: input.organizationId,
      entityType: "TEAM_INVITE",
      entityId: input.inviteId,
      eventType: input.eventType,
      actor: input.actorId,
      details: {
        emailHash: emailDigest(input.email),
        ...(input.role ? { role: input.role } : {}),
      },
    },
  });
}

async function invalidateFailedDelivery(input: {
  inviteId: string;
  organizationId: string;
  tokenHash: string;
  actorId: string;
  email: string;
  now: Date;
}): Promise<void> {
  await withSerializableRetry(async (tx) => {
    const invalidated = await tx.teamMemberInvite.updateMany({
      where: {
        id: input.inviteId,
        organizationId: input.organizationId,
        tokenHash: input.tokenHash,
        acceptedAt: null,
      },
      data: { expiresAt: input.now },
    });

    if (invalidated.count === 1) {
      await recordEvent(tx, {
        organizationId: input.organizationId,
        inviteId: input.inviteId,
        eventType: "TEAM_INVITE_DELIVERY_FAILED",
        actorId: input.actorId,
        email: input.email,
      });
    }
  });
}

async function deliverPersistedInvite(input: {
  deliver: TeamInviteDelivery;
  inviteId: string;
  organizationId: string;
  organizationName: string;
  actorId: string;
  email: string;
  role: TeamInviteRole;
  token: string;
  tokenHash: string;
  expiresAt: Date;
  now: Date;
}): Promise<void> {
  try {
    await input.deliver({
      email: input.email,
      role: input.role,
      organizationName: input.organizationName,
      token: input.token,
      expiresAt: input.expiresAt,
    });
  } catch (error) {
    await invalidateFailedDelivery({
      inviteId: input.inviteId,
      organizationId: input.organizationId,
      tokenHash: input.tokenHash,
      actorId: input.actorId,
      email: input.email,
      now: input.now,
    });

    const code = error instanceof Error && error.message === "DELIVERY_NOT_CONFIGURED"
      ? "DELIVERY_NOT_CONFIGURED"
      : "DELIVERY_FAILED";
    throw new TeamInviteError(code);
  }
}

export async function createTeamInvite(input: {
  organizationId: string;
  invitedById: string;
  invitedByEmail: string;
  email: unknown;
  role: unknown;
  deliver: TeamInviteDelivery;
  now?: Date;
}): Promise<{ id: string; email: string; role: TeamInviteRole; expiresAt: Date }> {
  const email = normalizeInviteEmail(input.email);
  const inviterEmail = normalizeInviteEmail(input.invitedByEmail);
  const role = parseInviteRole(input.role);
  if (email === inviterEmail) throw new TeamInviteError("CANNOT_INVITE_SELF");

  const now = input.now ?? new Date();
  const expiresAt = new Date(now.getTime() + INVITE_TTL_MS);
  const token = createRawToken();
  const tokenHash = hashTeamInviteToken(token);

  const persisted = await withSerializableRetry(async (tx) => {
    const organization = await tx.organization.findUnique({
      where: { id: input.organizationId },
      select: { id: true, name: true },
    });
    if (!organization) throw new TeamInviteError("INVITE_NOT_FOUND");

    const existingUser = await tx.user.findUnique({
      where: { email },
      select: { id: true },
    });
    if (existingUser) {
      const membership = await tx.membership.findUnique({
        where: {
          userId_organizationId: {
            userId: existingUser.id,
            organizationId: input.organizationId,
          },
        },
        select: { id: true },
      });
      if (membership) throw new TeamInviteError("ALREADY_MEMBER");
    }

    const existing = await tx.teamMemberInvite.findUnique({
      where: {
        organizationId_email: {
          organizationId: input.organizationId,
          email,
        },
      },
    });

    if (existing && !existing.acceptedAt && existing.expiresAt > now) {
      throw new TeamInviteError("INVITE_PENDING");
    }

    const invite = existing
      ? await tx.teamMemberInvite.update({
        where: { id: existing.id },
        data: {
          role,
          tokenHash,
          invitedById: input.invitedById,
          expiresAt,
          acceptedAt: null,
          createdAt: now,
        },
      })
      : await tx.teamMemberInvite.create({
        data: {
          organizationId: input.organizationId,
          email,
          role,
          tokenHash,
          invitedById: input.invitedById,
          expiresAt,
          createdAt: now,
        },
      });

    await recordEvent(tx, {
      organizationId: input.organizationId,
      inviteId: invite.id,
      eventType: existing ? "TEAM_INVITE_RECREATED" : "TEAM_INVITE_CREATED",
      actorId: input.invitedById,
      email,
      role,
    });

    return { invite, organizationName: organization.name };
  });

  await deliverPersistedInvite({
    deliver: input.deliver,
    inviteId: persisted.invite.id,
    organizationId: input.organizationId,
    organizationName: persisted.organizationName,
    actorId: input.invitedById,
    email,
    role,
    token,
    tokenHash,
    expiresAt,
    now,
  });

  return { id: persisted.invite.id, email, role, expiresAt };
}

export async function resendTeamInvite(input: {
  organizationId: string;
  inviteId: string;
  actorId: string;
  deliver: TeamInviteDelivery;
  now?: Date;
}): Promise<{ id: string; email: string; role: TeamInviteRole; expiresAt: Date }> {
  const now = input.now ?? new Date();
  const expiresAt = new Date(now.getTime() + INVITE_TTL_MS);
  const token = createRawToken();
  const tokenHash = hashTeamInviteToken(token);

  const persisted = await withSerializableRetry(async (tx) => {
    const invite = await tx.teamMemberInvite.findFirst({
      where: { id: input.inviteId, organizationId: input.organizationId },
    });
    if (!invite) throw new TeamInviteError("INVITE_NOT_FOUND");
    if (invite.acceptedAt) throw new TeamInviteError("INVITE_ALREADY_ACCEPTED");

    const role = parseInviteRole(invite.role);
    const existingUser = await tx.user.findUnique({
      where: { email: invite.email },
      select: { id: true },
    });
    if (existingUser) {
      const membership = await tx.membership.findUnique({
        where: {
          userId_organizationId: {
            userId: existingUser.id,
            organizationId: input.organizationId,
          },
        },
        select: { id: true },
      });
      if (membership) throw new TeamInviteError("ALREADY_MEMBER");
    }

    const organization = await tx.organization.findUnique({
      where: { id: input.organizationId },
      select: { name: true },
    });
    if (!organization) throw new TeamInviteError("INVITE_NOT_FOUND");

    const updated = await tx.teamMemberInvite.update({
      where: { id: invite.id },
      data: {
        tokenHash,
        invitedById: input.actorId,
        expiresAt,
        acceptedAt: null,
        createdAt: now,
      },
    });

    await recordEvent(tx, {
      organizationId: input.organizationId,
      inviteId: invite.id,
      eventType: "TEAM_INVITE_RESENT",
      actorId: input.actorId,
      email: invite.email,
      role,
    });

    return { invite: updated, role, organizationName: organization.name };
  });

  await deliverPersistedInvite({
    deliver: input.deliver,
    inviteId: persisted.invite.id,
    organizationId: input.organizationId,
    organizationName: persisted.organizationName,
    actorId: input.actorId,
    email: persisted.invite.email,
    role: persisted.role,
    token,
    tokenHash,
    expiresAt,
    now,
  });

  return {
    id: persisted.invite.id,
    email: persisted.invite.email,
    role: persisted.role,
    expiresAt,
  };
}

export async function revokeTeamInvite(input: {
  organizationId: string;
  inviteId: string;
  actorId: string;
  now?: Date;
}): Promise<void> {
  const now = input.now ?? new Date();
  await withSerializableRetry(async (tx) => {
    const invite = await tx.teamMemberInvite.findFirst({
      where: { id: input.inviteId, organizationId: input.organizationId },
    });
    if (!invite) throw new TeamInviteError("INVITE_NOT_FOUND");
    if (invite.acceptedAt || invite.expiresAt <= now) throw new TeamInviteError("INVITE_NOT_ACTIVE");

    const revoked = await tx.teamMemberInvite.updateMany({
      where: {
        id: invite.id,
        organizationId: input.organizationId,
        acceptedAt: null,
        expiresAt: { gt: now },
      },
      data: { expiresAt: now },
    });
    if (revoked.count !== 1) throw new TeamInviteError("INVITE_NOT_ACTIVE");

    await recordEvent(tx, {
      organizationId: input.organizationId,
      inviteId: invite.id,
      eventType: "TEAM_INVITE_REVOKED",
      actorId: input.actorId,
      email: invite.email,
    });
  });
}

export async function acceptTeamInvite(input: {
  token: unknown;
  userId: string;
  userEmail: string;
  now?: Date;
}): Promise<{ membershipId: string; organizationId: string; role: string; reused: boolean }> {
  const token = typeof input.token === "string" ? input.token.trim() : "";
  if (!/^[a-f0-9]{64}$/i.test(token)) throw new TeamInviteError("INVALID_TOKEN");

  const email = normalizeInviteEmail(input.userEmail);
  const tokenHash = hashTeamInviteToken(token);
  const now = input.now ?? new Date();

  return withSerializableRetry(async (tx) => {
    const invite = await tx.teamMemberInvite.findUnique({ where: { tokenHash } });
    if (!invite) throw new TeamInviteError("INVITE_NOT_FOUND");
    if (invite.email !== email) throw new TeamInviteError("INVITE_EMAIL_MISMATCH");

    if (invite.acceptedAt) {
      const membership = await tx.membership.findUnique({
        where: {
          userId_organizationId: {
            userId: input.userId,
            organizationId: invite.organizationId,
          },
        },
      });
      if (!membership) throw new TeamInviteError("INVITE_ALREADY_ACCEPTED");
      return {
        membershipId: membership.id,
        organizationId: membership.organizationId,
        role: membership.role,
        reused: true,
      };
    }

    if (invite.expiresAt <= now) throw new TeamInviteError("INVITE_EXPIRED");
    const role = parseInviteRole(invite.role);

    const claimed = await tx.teamMemberInvite.updateMany({
      where: {
        id: invite.id,
        tokenHash,
        acceptedAt: null,
        expiresAt: { gt: now },
      },
      data: { acceptedAt: now },
    });
    if (claimed.count !== 1) throw new TeamInviteError("INVITE_NOT_ACTIVE");

    const existingMembership = await tx.membership.findUnique({
      where: {
        userId_organizationId: {
          userId: input.userId,
          organizationId: invite.organizationId,
        },
      },
    });

    const membership = existingMembership ?? await tx.membership.create({
      data: {
        userId: input.userId,
        organizationId: invite.organizationId,
        role,
      },
    });

    await recordEvent(tx, {
      organizationId: invite.organizationId,
      inviteId: invite.id,
      eventType: "TEAM_INVITE_ACCEPTED",
      actorId: input.userId,
      email: invite.email,
      role,
    });

    return {
      membershipId: membership.id,
      organizationId: membership.organizationId,
      role: membership.role,
      reused: false,
    };
  });
}
