import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  isSessionAuthConfigured: vi.fn(),
  validateAdminCredentials: vi.fn(),
  createAdminSession: vi.fn(),
  csrfProtection: vi.fn(),
  checkAuthRateLimit: vi.fn(),
  resetAuthRateLimit: vi.fn(),
  getClientIp: vi.fn(),
}));

vi.mock("@/lib/admin-auth", () => ({
  isSessionAuthConfigured: mocks.isSessionAuthConfigured,
  validateAdminCredentials: mocks.validateAdminCredentials,
  createAdminSession: mocks.createAdminSession,
}));

vi.mock("@/lib/csrf", () => ({
  csrfProtection: mocks.csrfProtection,
}));

vi.mock("@/lib/authRateLimit", () => ({
  checkAuthRateLimit: mocks.checkAuthRateLimit,
  resetAuthRateLimit: mocks.resetAuthRateLimit,
}));

vi.mock("@/lib/security", () => ({
  getClientIp: mocks.getClientIp,
}));

function request(body: unknown) {
  return new NextRequest("http://localhost/api/admin/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/admin/auth/login", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.isSessionAuthConfigured.mockReturnValue(true);
    mocks.validateAdminCredentials.mockReturnValue(true);
    mocks.createAdminSession.mockResolvedValue("session-id");
    mocks.csrfProtection.mockResolvedValue({ valid: true });
    mocks.checkAuthRateLimit.mockReturnValue({ allowed: true, remaining: 9 });
    mocks.getClientIp.mockReturnValue("203.0.113.10");
  });

  it("fails closed when authentication is not configured", async () => {
    mocks.isSessionAuthConfigured.mockReturnValue(false);
    const { POST } = await import("./route");
    const response = await POST(request({ username: "admin", password: "secret" }));
    expect(response.status).toBe(503);
    expect(mocks.csrfProtection).not.toHaveBeenCalled();
    expect(mocks.createAdminSession).not.toHaveBeenCalled();
  });

  it("rejects requests without valid CSRF protection", async () => {
    mocks.csrfProtection.mockResolvedValue({ valid: false, error: "CSRF token missing" });
    const { POST } = await import("./route");
    const response = await POST(request({ username: "admin", password: "secret" }));
    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: "FORBIDDEN" });
    expect(mocks.checkAuthRateLimit).not.toHaveBeenCalled();
    expect(mocks.createAdminSession).not.toHaveBeenCalled();
  });

  it("rejects malformed credentials", async () => {
    const { POST } = await import("./route");
    const response = await POST(request({ username: "admin" }));
    expect(response.status).toBe(400);
    expect(mocks.checkAuthRateLimit).not.toHaveBeenCalled();
    expect(mocks.validateAdminCredentials).not.toHaveBeenCalled();
  });

  it("rate-limits repeated login attempts by client IP", async () => {
    mocks.checkAuthRateLimit.mockReturnValue({ allowed: false, remaining: 0 });
    const { POST } = await import("./route");
    const response = await POST(request({ username: "admin", password: "secret" }));
    expect(response.status).toBe(429);
    await expect(response.json()).resolves.toEqual({ error: "RATE_LIMITED" });
    expect(mocks.checkAuthRateLimit).toHaveBeenCalledWith("admin:login:203.0.113.10");
    expect(mocks.validateAdminCredentials).not.toHaveBeenCalled();
    expect(mocks.createAdminSession).not.toHaveBeenCalled();
  });

  it("rejects invalid credentials without creating a session", async () => {
    mocks.validateAdminCredentials.mockReturnValue(false);
    const { POST } = await import("./route");
    const response = await POST(request({ username: "admin", password: "wrong" }));
    expect(response.status).toBe(401);
    expect(mocks.createAdminSession).not.toHaveBeenCalled();
    expect(mocks.resetAuthRateLimit).not.toHaveBeenCalled();
  });

  it("creates a persisted session and clears its rate limit after valid authentication", async () => {
    const { POST } = await import("./route");
    const response = await POST(request({ username: "admin", password: "secret" }));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ success: true });
    expect(mocks.createAdminSession).toHaveBeenCalledOnce();
    expect(mocks.resetAuthRateLimit).toHaveBeenCalledWith("admin:login:203.0.113.10");
  });

  it("returns 500 when the session store is unavailable", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    mocks.createAdminSession.mockRejectedValue(new Error("database unavailable"));
    const { POST } = await import("./route");
    const response = await POST(request({ username: "admin", password: "secret" }));
    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: "Failed to create admin session" });
    expect(mocks.resetAuthRateLimit).not.toHaveBeenCalled();
    consoleError.mockRestore();
  });
});
