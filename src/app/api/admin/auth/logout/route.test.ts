import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  clearAdminSession: vi.fn(),
  csrfProtection: vi.fn(),
}));

vi.mock("@/lib/admin-auth", () => ({
  clearAdminSession: mocks.clearAdminSession,
}));

vi.mock("@/lib/csrf", () => ({
  csrfProtection: mocks.csrfProtection,
}));

function request() {
  return new NextRequest("http://localhost/api/admin/auth/logout", { method: "POST" });
}

describe("POST /api/admin/auth/logout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.clearAdminSession.mockResolvedValue(undefined);
    mocks.csrfProtection.mockResolvedValue({ valid: true });
  });

  it("rejects logout without valid CSRF protection", async () => {
    mocks.csrfProtection.mockResolvedValue({ valid: false, error: "CSRF token missing" });
    const { POST } = await import("./route");
    const response = await POST(request());
    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: "FORBIDDEN" });
    expect(mocks.clearAdminSession).not.toHaveBeenCalled();
  });

  it("revokes the current session and clears its cookie", async () => {
    const { POST } = await import("./route");
    const response = await POST(request());
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ success: true });
    expect(mocks.clearAdminSession).toHaveBeenCalledOnce();
  });

  it("fails closed when server-side revocation fails", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    mocks.clearAdminSession.mockRejectedValue(new Error("database unavailable"));
    const { POST } = await import("./route");
    const response = await POST(request());
    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: "Failed to revoke admin session" });
    consoleError.mockRestore();
  });
});
