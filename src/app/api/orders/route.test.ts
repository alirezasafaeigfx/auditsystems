import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  csrfProtection: vi.fn(),
  auditLeadCreate: vi.fn(),
}));

vi.mock("../../../lib/csrf", () => ({
  csrfProtection: mocks.csrfProtection,
}));

vi.mock("../../../lib/metrics", () => ({
  observeApiRequest: vi.fn(),
}));

vi.mock("../../../lib/db", () => ({
  prisma: {
    reportShare: { findUnique: vi.fn() },
    auditOrder: { findFirst: vi.fn(), create: vi.fn(), update: vi.fn() },
    auditLead: { create: mocks.auditLeadCreate },
    auditOrderEvent: { create: vi.fn() },
  },
}));

describe("POST /api/orders consent", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    mocks.csrfProtection.mockResolvedValue({ valid: true });
  });

  it("rejects order processing without explicit consent before creating leads", async () => {
    const { POST } = await import("./route");

    const response = await POST(request({ token: "share-token", email: "owner@example.com", provider: "MOCK" }));

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ error: "CONSENT_REQUIRED" });
    expect(mocks.auditLeadCreate).not.toHaveBeenCalled();
  });
});

function request(body: unknown): NextRequest {
  return new NextRequest("https://audit.test/api/orders", {
    method: "POST",
    headers: { "content-type": "application/json", "x-csrf-token": "valid-token" },
    body: JSON.stringify(body),
  });
}
