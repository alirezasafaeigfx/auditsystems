import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  validateSession: vi.fn(),
  csrfProtection: vi.fn(),
  ensureReferralCode: vi.fn(),
  getReferralStats: vi.fn(),
  trackReferral: vi.fn(),
}));

vi.mock("../../../lib/auth", () => ({
  validateSession: mocks.validateSession,
}));

vi.mock("../../../lib/csrf", () => ({
  csrfProtection: mocks.csrfProtection,
}));

vi.mock("../../../lib/referral", () => ({
  ensureReferralCode: mocks.ensureReferralCode,
  getReferralStats: mocks.getReferralStats,
  trackReferral: mocks.trackReferral,
}));

describe("POST /api/referrals", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    mocks.validateSession.mockResolvedValue({ id: "user-1" });
    mocks.csrfProtection.mockResolvedValue({ valid: true });
    mocks.trackReferral.mockResolvedValue({ referrerId: "ref-1", referredId: "user-1" });
  });

  it("rejects unauthenticated requests with 401", async () => {
    mocks.validateSession.mockResolvedValue(null);
    const { POST } = await import("./route");

    const response = await POST(makeRequest({ referralCode: "ABC123" }));

    expect(response.status).toBe(401);
    expect(await response.json()).toMatchObject({ error: "UNAUTHORIZED" });
  });

  it("rejects requests without CSRF token with 403", async () => {
    mocks.csrfProtection.mockResolvedValue({ valid: false, error: "CSRF token missing" });
    const { POST } = await import("./route");

    const response = await POST(makeRequest({ referralCode: "ABC123" }));

    expect(response.status).toBe(403);
    expect(await response.json()).toMatchObject({ error: "FORBIDDEN" });
  });

  it("rejects invalid payload with 400", async () => {
    const { POST } = await import("./route");

    const response = await POST(new NextRequest("https://test/api/referrals", {
      method: "POST",
      headers: { "x-csrf-token": "valid", "content-type": "application/json" },
      body: "not json",
    }));

    expect(response.status).toBe(400);
  });

  it("rejects missing referralCode with 400", async () => {
    const { POST } = await import("./route");

    const response = await POST(makeRequest({ other: "data" }));

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ error: "INVALID_PARAMS" });
  });

  it("tracks referral with authenticated user id", async () => {
    const { POST } = await import("./route");

    const response = await POST(makeRequest({ referralCode: "ABC123" }));

    expect(response.status).toBe(201);
    expect(mocks.trackReferral).toHaveBeenCalledWith("ABC123", "user-1");
    expect(await response.json()).toMatchObject({ ok: true });
  });

  it("returns ok:false when referral tracking fails", async () => {
    mocks.trackReferral.mockResolvedValue(null);
    const { POST } = await import("./route");

    const response = await POST(makeRequest({ referralCode: "INVALID" }));

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ ok: false });
  });
});

function makeRequest(body: unknown): NextRequest {
  return new NextRequest("https://test/api/referrals", {
    method: "POST",
    headers: { "content-type": "application/json", "x-csrf-token": "valid-token" },
    body: JSON.stringify(body),
  });
}
