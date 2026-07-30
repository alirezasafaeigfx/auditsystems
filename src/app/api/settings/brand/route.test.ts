import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  validateSession: vi.fn(),
  getOrganizationForUser: vi.fn(),
  csrfProtection: vi.fn(),
  findUnique: vi.fn(),
  update: vi.fn()
}));

vi.mock("../../../../lib/auth", () => ({
  validateSession: mocks.validateSession,
  getOrganizationForUser: mocks.getOrganizationForUser
}));

vi.mock("../../../../lib/csrf", () => ({
  csrfProtection: mocks.csrfProtection
}));

vi.mock("../../../../lib/db", () => ({
  prisma: {
    organization: {
      findUnique: mocks.findUnique,
      update: mocks.update
    }
  }
}));

describe("POST /api/settings/brand", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    mocks.validateSession.mockResolvedValue({ id: "user-1" });
    mocks.getOrganizationForUser.mockResolvedValue({ organizationId: "org-1", role: "ADMIN" });
    mocks.csrfProtection.mockResolvedValue({ valid: true });
    mocks.update.mockResolvedValue({});
  });

  function request(body: unknown) {
    return new NextRequest("https://test/api/settings/brand", {
      method: "POST",
      headers: { "content-type": "application/json", "x-csrf-token": "valid" },
      body: JSON.stringify(body)
    });
  }

  it("rejects POST without CSRF token", async () => {
    mocks.csrfProtection.mockResolvedValue({ valid: false, error: "CSRF token missing" });
    const { POST } = await import("./route");

    const response = await POST(request({ brandName: "Acme" }));
    expect(response.status).toBe(403);
    expect((await response.json()).error).toBe("FORBIDDEN");
  });

  it("rejects VIEWER role", async () => {
    mocks.getOrganizationForUser.mockResolvedValue({ organizationId: "org-1", role: "VIEWER" });
    const { POST } = await import("./route");

    const response = await POST(request({ brandName: "Acme" }));
    expect(response.status).toBe(403);
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("allows ADMIN role with normalized values", async () => {
    const { POST } = await import("./route");
    const response = await POST(request({
      brandName: "  Acme  ",
      brandLogoBase64: null,
      primaryColor: "#059669",
      secondaryColor: "#047857"
    }));

    expect(response.status).toBe(200);
    expect(mocks.update).toHaveBeenCalledWith({
      where: { id: "org-1" },
      data: {
        brandName: "Acme",
        brandLogoBase64: null,
        primaryColor: "#059669",
        secondaryColor: "#047857"
      }
    });
  });

  it("accepts a bounded PNG data URL", async () => {
    const { POST } = await import("./route");
    const logo = `data:image/png;base64,${Buffer.from("png-fixture").toString("base64")}`;
    const response = await POST(request({ brandLogoBase64: logo }));

    expect(response.status).toBe(200);
    expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ brandLogoBase64: logo })
    }));
  });

  it("rejects invalid colors", async () => {
    const { POST } = await import("./route");
    const response = await POST(request({ primaryColor: "red" }));

    expect(response.status).toBe(400);
    expect((await response.json()).error).toBe("INVALID_COLOR");
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it.each(["webp", "svg+xml"])("rejects PDF-incompatible %s logos", async (format) => {
    const { POST } = await import("./route");
    const logo = `data:image/${format};base64,${Buffer.from("fixture").toString("base64")}`;
    const response = await POST(request({ brandLogoBase64: logo }));

    expect(response.status).toBe(400);
    expect((await response.json()).error).toBe("INVALID_LOGO_FORMAT");
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("rejects oversized logos", async () => {
    const { POST } = await import("./route");
    const logo = `data:image/png;base64,${Buffer.alloc(512 * 1024 + 1).toString("base64")}`;
    const response = await POST(request({ brandLogoBase64: logo }));

    expect(response.status).toBe(400);
    expect((await response.json()).error).toBe("LOGO_TOO_LARGE");
    expect(mocks.update).not.toHaveBeenCalled();
  });
});
