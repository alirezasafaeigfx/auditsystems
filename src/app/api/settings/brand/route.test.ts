import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  validateSession: vi.fn(),
  getOrganizationForUser: vi.fn(),
  csrfProtection: vi.fn(),
  findUnique: vi.fn(),
  update: vi.fn(),
}));

vi.mock("../../../../lib/auth", () => ({
  validateSession: mocks.validateSession,
  getOrganizationForUser: mocks.getOrganizationForUser,
}));

vi.mock("../../../../lib/csrf", () => ({
  csrfProtection: mocks.csrfProtection,
}));

vi.mock("../../../../lib/db", () => ({
  prisma: {
    organization: {
      findUnique: mocks.findUnique,
      update: mocks.update,
    },
  },
}));

describe("POST /api/settings/brand CSRF (F-006)", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    mocks.validateSession.mockResolvedValue({ id: "user-1" });
    mocks.getOrganizationForUser.mockResolvedValue({ organizationId: "org-1" });
    mocks.update.mockResolvedValue({});
  });

  it("rejects POST without CSRF token with 403", async () => {
    mocks.csrfProtection.mockResolvedValue({ valid: false, error: "CSRF token missing" });
    const { POST } = await import("./route");

    const req = new NextRequest("https://test/api/settings/brand", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ brandName: "Acme" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.error).toBe("FORBIDDEN");
  });

  it("allows POST with valid CSRF token", async () => {
    mocks.csrfProtection.mockResolvedValue({ valid: true });
    const { POST } = await import("./route");

    const req = new NextRequest("https://test/api/settings/brand", {
      method: "POST",
      headers: { "content-type": "application/json", "x-csrf-token": "valid" },
      body: JSON.stringify({ brandName: "Acme" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(mocks.update).toHaveBeenCalled();
  });
});
