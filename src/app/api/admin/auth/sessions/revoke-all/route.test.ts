import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  validateAdminSession: vi.fn(),
  revokeAllAdminSessions: vi.fn(),
  csrfProtection: vi.fn(),
}));

vi.mock("@/lib/admin-auth", () => ({
  validateAdminSession: mocks.validateAdminSession,
  revokeAllAdminSessions: mocks.revokeAllAdminSessions,
}));

vi.mock("@/lib/csrf", () => ({
  csrfProtection: mocks.csrfProtection,
}));

describe("POST /api/admin/auth/sessions/revoke-all", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.validateAdminSession.mockResolvedValue(true);
    mocks.revokeAllAdminSessions.mockResolvedValue(2);
    mocks.csrfProtection.mockResolvedValue({ valid: true });
  });

  it("rejects unauthenticated requests", async () => {
    mocks.validateAdminSession.mockResolvedValue(false);
    const { POST } = await import("./route");
    const request = new NextRequest("http://localhost/api/admin/auth/sessions/revoke-all", {
      method: "POST",
    });
    const response = await POST(request);
    expect(response.status).toBe(401);
    expect(mocks.revokeAllAdminSessions).not.toHaveBeenCalled();
  });

  it("requires CSRF", async () => {
    mocks.csrfProtection.mockResolvedValue({ valid: false, error: "CSRF token invalid" });
    const { POST } = await import("./route");
    const request = new NextRequest("http://localhost/api/admin/auth/sessions/revoke-all", {
      method: "POST",
    });
    const response = await POST(request);
    expect(response.status).toBe(403);
    expect(mocks.revokeAllAdminSessions).not.toHaveBeenCalled();
  });

  it("revokes every active session", async () => {
    const { POST } = await import("./route");
    const request = new NextRequest("http://localhost/api/admin/auth/sessions/revoke-all", {
      method: "POST",
    });
    const response = await POST(request);
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ success: true, revoked: 2 });
    expect(mocks.revokeAllAdminSessions).toHaveBeenCalledOnce();
  });
});
