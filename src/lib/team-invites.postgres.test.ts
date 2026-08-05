import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "./db";
import {
  acceptTeamInvite,
  createTeamInvite,
  hashTeamInviteToken,
  resendTeamInvite,
  revokeTeamInvite,
} from "./team-invites";

const integrationEnabled = process.env.TEAM_INVITE_INTEGRATION === "true";
const describePostgres = integrationEnabled ? describe : describe.skip;
let fixtureSequence = 0;

type Fixture = Awaited<ReturnType<typeof createFixture>>;

async function createFixture() {
  fixtureSequence += 1;
  const suffix = `${fixtureSequence}-${Date.now()}`;
  const organization = await prisma.organization.create({
    data: { name: `Invite Org ${suffix}`, slug: `invite-org-${suffix}` },
  });
  const inviter = await prisma.user.create({
    data: {
      email: `owner-${suffix}@example.com`,
      passwordHash: "test-password-hash",
      emailVerifiedAt: new Date(),
    },
  });
  const invitee = await prisma.user.create({
    data: {
      email: `invitee-${suffix}@example.com`,
      passwordHash: "test-password-hash",
      emailVerifiedAt: new Date(),
    },
  });
  const other = await prisma.user.create({
    data: {
      email: `other-${suffix}@example.com`,
      passwordHash: "test-password-hash",
      emailVerifiedAt: new Date(),
    },
  });
  await prisma.membership.create({
    data: { userId: inviter.id, organizationId: organization.id, role: "OWNER" },
  });

  return { organization, inviter, invitee, other };
}

function captureDelivery(tokens: string[]) {
  return async (input: { token: string }) => {
    tokens.push(input.token);
  };
}

async function createInvite(fixture: Fixture, tokens: string[], now = new Date("2026-08-05T12:00:00.000Z")) {
  return createTeamInvite({
    organizationId: fixture.organization.id,
    invitedById: fixture.inviter.id,
    invitedByEmail: fixture.inviter.email,
    email: fixture.invitee.email,
    role: "VIEWER",
    deliver: captureDelivery(tokens),
    now,
  });
}

describePostgres("team invite lifecycle — PostgreSQL", () => {
  beforeAll(async () => {
    await prisma.$queryRaw`SELECT 1`;
  });

  afterEach(async () => {
    await prisma.billingEvent.deleteMany({ where: { entityType: "TEAM_INVITE" } });
    await prisma.teamMemberInvite.deleteMany();
    await prisma.membership.deleteMany();
    await prisma.user.deleteMany({ where: { email: { endsWith: "@example.com" } } });
    await prisma.organization.deleteMany({ where: { slug: { startsWith: "invite-org-" } } });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("stores only the token hash and binds acceptance to the invited email", async () => {
    const fixture = await createFixture();
    const tokens: string[] = [];
    const invite = await createInvite(fixture, tokens);
    expect(tokens).toHaveLength(1);

    const persisted = await prisma.teamMemberInvite.findUniqueOrThrow({ where: { id: invite.id } });
    expect(persisted.tokenHash).toBe(hashTeamInviteToken(tokens[0]));
    expect(JSON.stringify(persisted)).not.toContain(tokens[0]);

    await expect(acceptTeamInvite({
      token: tokens[0],
      userId: fixture.other.id,
      userEmail: fixture.other.email,
      now: new Date("2026-08-05T12:01:00.000Z"),
    })).rejects.toMatchObject({ code: "INVITE_EMAIL_MISMATCH" });

    expect(await prisma.membership.count({
      where: { userId: fixture.other.id, organizationId: fixture.organization.id },
    })).toBe(0);
  });

  it("accepts one occurrence exactly once across concurrent requests", async () => {
    const fixture = await createFixture();
    const tokens: string[] = [];
    await createInvite(fixture, tokens);
    const input = {
      token: tokens[0],
      userId: fixture.invitee.id,
      userEmail: fixture.invitee.email,
      now: new Date("2026-08-05T12:02:00.000Z"),
    };

    const results = await Promise.all([
      acceptTeamInvite(input),
      acceptTeamInvite(input),
    ]);

    expect(results.filter((result) => result.reused)).toHaveLength(1);
    expect(results.filter((result) => !result.reused)).toHaveLength(1);
    expect(await prisma.membership.count({
      where: { userId: fixture.invitee.id, organizationId: fixture.organization.id },
    })).toBe(1);
    expect(await prisma.billingEvent.count({
      where: {
        organizationId: fixture.organization.id,
        eventType: "TEAM_INVITE_ACCEPTED",
      },
    })).toBe(1);
  });

  it("resend supersedes the previous token and preserves the safe role", async () => {
    const fixture = await createFixture();
    const tokens: string[] = [];
    const invite = await createInvite(fixture, tokens);
    const firstToken = tokens[0];

    const resent = await resendTeamInvite({
      organizationId: fixture.organization.id,
      inviteId: invite.id,
      actorId: fixture.inviter.id,
      deliver: captureDelivery(tokens),
      now: new Date("2026-08-06T12:00:00.000Z"),
    });
    const secondToken = tokens[1];

    expect(secondToken).not.toBe(firstToken);
    expect(resent.role).toBe("VIEWER");
    await expect(acceptTeamInvite({
      token: firstToken,
      userId: fixture.invitee.id,
      userEmail: fixture.invitee.email,
      now: new Date("2026-08-06T12:01:00.000Z"),
    })).rejects.toMatchObject({ code: "INVITE_NOT_FOUND" });

    await expect(acceptTeamInvite({
      token: secondToken,
      userId: fixture.invitee.id,
      userEmail: fixture.invitee.email,
      now: new Date("2026-08-06T12:01:00.000Z"),
    })).resolves.toMatchObject({ reused: false, role: "VIEWER" });
  });

  it("revocation expires the active token and prevents acceptance", async () => {
    const fixture = await createFixture();
    const tokens: string[] = [];
    const invite = await createInvite(fixture, tokens);

    await revokeTeamInvite({
      organizationId: fixture.organization.id,
      inviteId: invite.id,
      actorId: fixture.inviter.id,
      now: new Date("2026-08-05T12:10:00.000Z"),
    });

    await expect(acceptTeamInvite({
      token: tokens[0],
      userId: fixture.invitee.id,
      userEmail: fixture.invitee.email,
      now: new Date("2026-08-05T12:10:01.000Z"),
    })).rejects.toMatchObject({ code: "INVITE_EXPIRED" });
    expect(await prisma.membership.count({
      where: { userId: fixture.invitee.id, organizationId: fixture.organization.id },
    })).toBe(0);
  });

  it("invalidates the persisted token when delivery fails", async () => {
    const fixture = await createFixture();
    const now = new Date("2026-08-05T12:00:00.000Z");

    await expect(createTeamInvite({
      organizationId: fixture.organization.id,
      invitedById: fixture.inviter.id,
      invitedByEmail: fixture.inviter.email,
      email: fixture.invitee.email,
      role: "ADMIN",
      deliver: async () => { throw new Error("DELIVERY_FAILED"); },
      now,
    })).rejects.toMatchObject({ code: "DELIVERY_FAILED" });

    const invite = await prisma.teamMemberInvite.findUniqueOrThrow({
      where: {
        organizationId_email: {
          organizationId: fixture.organization.id,
          email: fixture.invitee.email,
        },
      },
    });
    expect(invite.expiresAt.getTime()).toBeLessThanOrEqual(now.getTime());
    expect(await prisma.billingEvent.count({
      where: {
        organizationId: fixture.organization.id,
        entityId: invite.id,
        eventType: "TEAM_INVITE_DELIVERY_FAILED",
      },
    })).toBe(1);
  });

  it("rejects an unsafe OWNER role even if database state is malformed", async () => {
    const fixture = await createFixture();
    const token = "e".repeat(64);
    await prisma.teamMemberInvite.create({
      data: {
        organizationId: fixture.organization.id,
        email: fixture.invitee.email,
        role: "OWNER",
        tokenHash: hashTeamInviteToken(token),
        invitedById: fixture.inviter.id,
        expiresAt: new Date("2026-08-12T12:00:00.000Z"),
      },
    });

    await expect(acceptTeamInvite({
      token,
      userId: fixture.invitee.id,
      userEmail: fixture.invitee.email,
      now: new Date("2026-08-05T12:00:00.000Z"),
    })).rejects.toMatchObject({ code: "INVALID_ROLE" });
    expect(await prisma.membership.count({
      where: { userId: fixture.invitee.id, organizationId: fixture.organization.id },
    })).toBe(0);
  });
});
