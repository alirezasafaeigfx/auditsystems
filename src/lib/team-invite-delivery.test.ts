import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { deliverTeamInvite } from "./team-invite-delivery";

const originalEnv = { ...process.env };

describe("team invite delivery", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    process.env = { ...originalEnv, NODE_ENV: "test" };
    delete process.env.TEAM_INVITE_DELIVERY_WEBHOOK_URL;
    delete process.env.TEAM_INVITE_DELIVERY_WEBHOOK_SECRET;
    process.env.NEXT_PUBLIC_SITE_URL = "http://localhost:3000";
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.unstubAllGlobals();
  });

  it("fails closed when the delivery backend is not configured", async () => {
    await expect(deliverTeamInvite({
      email: "invitee@example.com",
      role: "VIEWER",
      organizationName: "Example Org",
      token: "a".repeat(64),
      expiresAt: new Date("2026-08-12T00:00:00.000Z"),
    })).rejects.toMatchObject({ code: "DELIVERY_NOT_CONFIGURED" });
  });

  it("requires HTTPS delivery and site URLs in production", async () => {
    process.env = { ...process.env, NODE_ENV: "production" };
    process.env.TEAM_INVITE_DELIVERY_WEBHOOK_URL = "http://delivery.internal/invites";
    process.env.TEAM_INVITE_DELIVERY_WEBHOOK_SECRET = "delivery-secret";
    process.env.NEXT_PUBLIC_SITE_URL = "https://audit.example.com";

    await expect(deliverTeamInvite({
      email: "invitee@example.com",
      role: "ADMIN",
      organizationName: "Example Org",
      token: "b".repeat(64),
      expiresAt: new Date("2026-08-12T00:00:00.000Z"),
    })).rejects.toMatchObject({ code: "DELIVERY_NOT_CONFIGURED" });
  });

  it("sends the raw token only to the configured delivery webhook", async () => {
    process.env.TEAM_INVITE_DELIVERY_WEBHOOK_URL = "https://delivery.example.com/team-invites";
    process.env.TEAM_INVITE_DELIVERY_WEBHOOK_SECRET = "delivery-secret";
    process.env.NEXT_PUBLIC_SITE_URL = "https://audit.example.com/base";
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 202 }));
    vi.stubGlobal("fetch", fetchMock);

    const token = "c".repeat(64);
    await deliverTeamInvite({
      email: "invitee@example.com",
      role: "VIEWER",
      organizationName: "Example Org",
      token,
      expiresAt: new Date("2026-08-12T00:00:00.000Z"),
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [URL, RequestInit];
    expect(url.toString()).toBe("https://delivery.example.com/team-invites");
    expect(init.redirect).toBe("error");
    expect(init.headers).toMatchObject({
      Authorization: "Bearer delivery-secret",
      "Content-Type": "application/json",
    });

    const payload = JSON.parse(String(init.body)) as Record<string, unknown>;
    expect(payload).toMatchObject({
      type: "TEAM_MEMBER_INVITE",
      email: "invitee@example.com",
      role: "VIEWER",
      organizationName: "Example Org",
      expiresAt: "2026-08-12T00:00:00.000Z",
    });
    expect(String(payload.inviteUrl)).toContain(`/app/team/accept?token=${token}`);
  });

  it("normalizes unsuccessful webhook responses to a delivery failure", async () => {
    process.env.TEAM_INVITE_DELIVERY_WEBHOOK_URL = "https://delivery.example.com/team-invites";
    process.env.TEAM_INVITE_DELIVERY_WEBHOOK_SECRET = "delivery-secret";
    process.env.NEXT_PUBLIC_SITE_URL = "https://audit.example.com";
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 503 })));

    await expect(deliverTeamInvite({
      email: "invitee@example.com",
      role: "VIEWER",
      organizationName: "Example Org",
      token: "d".repeat(64),
      expiresAt: new Date("2026-08-12T00:00:00.000Z"),
    })).rejects.toMatchObject({ code: "DELIVERY_FAILED" });
  });
});
