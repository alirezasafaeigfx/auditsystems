import { NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  validateSession: vi.fn(),
  getOrganizationForUser: vi.fn(),
  csrfProtection: vi.fn(),
  checkTeamPermission: vi.fn(),
  getTeamMembers: vi.fn(),
  consumeDistributedRateLimit: vi.fn(),
  createTeamInvite: vi.fn(),
  resendTeamInvite: vi.fn(),
  revokeTeamInvite: vi.fn(),
  deliverTeamInvite: vi.fn(),
  membershipFindUnique: vi.fn(),
  membershipUpdate: vi.fn(),
  membershipDelete: vi.fn(),
  inviteFindMany: vi.fn(),
  logEvent: vi.fn(),
}));

vi.mock("../../../lib/auth", () => ({
  validateSession: mocks.validateSession,
  getOrganizationForUser: mocks.getOrganizationForUser,
}));

vi.mock("../../../lib/csrf", () => ({ csrfProtection: mocks.csrfProtection }));
vi.mock("../../../lib/team-auth", () => ({
  checkTeamPermission: mocks.checkTeamPermission,
  getTeamMembers: mocks.getTeamMembers,
}));
vi.mock("../../../lib/rateLimit", () => ({ consumeDistributedRateLimit: mocks.consumeDistributedRateLimit }));
vi.mock("../../../lib/team-invite-delivery", () => ({ deliverTeamInvite: mocks.deliverTeamInvite }));
vi.mock("../../../lib/team-invites", async () => {
  const actual = await vi.importActual<typeof import("../../../lib/team-invites")>("../../../lib/team-invites");
  return {
    ...actual,
    createTeamInvite: mocks.createTeamInvite,
    resendTeamInvite: mocks.resendTeamInvite,
    revokeTeamInvite: mocks.revokeTeamInvite,
  };
});
vi.mock("../../../lib/db", () => ({
  prisma: {
    membership: {
      findUnique: mocks.membershipFindUnique,
      update: mocks.membershipUpdate,
      delete: mocks.membershipDelete,
    },
    teamMemberInvite: { findMany: mocks.inviteFindMany },
  },
}));
vi.mock("../../../lib/observability", () => ({
  createRequestId: () => "request-team-1",
  logEvent: mocks.logEvent,
  respondJson: (body: unknown, requestId: string, init?: ResponseInit) => {
    const response = NextResponse.json(body, init);
    response.headers.set("x-request-id", requestId);
    return response;
  },
}));

function request(method: string, body: unknown) {
  return new Request("https://audit.example.com/api/team", {
    method,
    headers: { "content-type": "application/json", "x-csrf-token": "csrf" },
    body: JSON.stringify(body),
  });
}

describe("team API mutation policy", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    mocks.validateSession.mockResolvedValue({ id: "admin-1", email: "admin@example.com" });
    mocks.getOrganizationForUser.mockResolvedValue({ organizationId: "org-1", role: "ADMIN" });
    mocks.csrfProtection.mockResolvedValue({ valid: true });
    mocks.checkTeamPermission.mockResolvedValue({ allowed: true });
    mocks.consumeDistributedRateLimit.mockResolvedValue({
      allowed: true,
      remaining: 19,
      limit: 20,
      resetSec: 3600,
      backend: "local-redis",
    });
  });

  it("rejects OWNER assignment before reading or mutating membership state", async () => {
    const { PUT } = await import("./route");
    const response = await PUT(request("PUT", { userId: "member-1", role: "OWNER" }) as never);

    expect(response.status).toBe(400);
    expect((await response.json()).error).toBe("INVALID_PAYLOAD");
    expect(mocks.membershipFindUnique).not.toHaveBeenCalled();
    expect(mocks.membershipUpdate).not.toHaveBeenCalled();
  });

  it("returns 503 when invite delivery is not configured and does not log the raw email", async () => {
    const { TeamInviteError } = await import("../../../lib/team-invites");
    mocks.createTeamInvite.mockRejectedValue(new TeamInviteError("DELIVERY_NOT_CONFIGURED"));
    const { POST } = await import("./route");
    const response = await POST(request("POST", { email: "sensitive-invitee@example.com", role: "VIEWER" }) as never);

    expect(response.status).toBe(503);
    expect((await response.json()).error).toBe("DELIVERY_NOT_CONFIGURED");
    expect(JSON.stringify(mocks.logEvent.mock.calls)).not.toContain("sensitive-invitee@example.com");
  });

  it("applies the distributed limiter before resend or revoke", async () => {
    mocks.consumeDistributedRateLimit.mockResolvedValue({
      allowed: false,
      remaining: 0,
      limit: 20,
      resetSec: 120,
      backend: "local-redis",
    });
    const { PATCH } = await import("./route");
    const response = await PATCH(request("PATCH", { inviteId: "invite-1", action: "RESEND" }) as never);

    expect(response.status).toBe(429);
    expect(response.headers.get("retry-after")).toBe("120");
    expect(mocks.resendTeamInvite).not.toHaveBeenCalled();
    expect(mocks.revokeTeamInvite).not.toHaveBeenCalled();
  });
});
