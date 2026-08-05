import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  isSessionAuthConfigured: vi.fn(),
  validateAdminCredentials: vi.fn(),
  createAdminSession: vi.fn(),
  csrfProtection: vi.fn(),
  enforceAuthAbuseLimit: vi.fn(),
  checkAuthRateLimit: vi.fn(),
  resetAuthRateLimit: vi.fn(),
}));

vi.mock("@/lib/admin-auth", () => ({
  isSessionAuthConfigured: mocks.isSessionAuthConfigured,
  validateAdminCredentials: mocks.validateAdminCredentials,
  createAdminSession: mocks.createAdminSession,
}));
vi.mock("@/lib/csrf", () => ({ csrfProtection: mocks.csrfProtection }));
vi.mock("@/lib/authRateLimit", () => ({
  enforceAuthAbuseLimit: mocks.enforceAuthAbuseLimit,
  checkAuthRateLimit: mocks.checkAuthRateLimit,
  resetAuthRateLimit: mocks.resetAuthRateLimit,
}));
vi.mock("@/lib/security", () => ({ getClientIp: () => "203.0.113.10" }));

function request(body: unknown) {
  return new NextRequest("https://audit.example.com/api/admin/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": "203.0.113.10" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/admin/auth/login distributed abuse boundary", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    mocks.isSessionAuthConfigured.mockReturnValue(true);
    mocks.validateAdminCredentials.mockReturnValue(true);
    mocks.createAdminSession.mockResolvedValue("session-id");
    mocks.csrfProtection.mockResolvedValue({ valid: true });
    mocks.enforceAuthAbuseLimit.mockResolvedValue({
      allowed: true,
      retryAfterSec: 0,
      backend: "local-redis",
      clientHash: "e".repeat(64),
      subjectHash: "f".repeat(64),
    });
    mocks.checkAuthRateLimit.mockReturnValue({ allowed: true, remaining: 9 });
  });

  it("fails closed when authentication is not configured", async () => {
    mocks.isSessionAuthConfigured.mockReturnValue(false);
    const { POST } = await import("./route");
    const response = await POST(request({ username: "admin", password: "secret" }));
    expect(response.status).toBe(503);
    expect(mocks.enforceAuthAbuseLimit).not.toHaveBeenCalled();
    expect(mocks.createAdminSession).not.toHaveBeenCalled();
  });

  it("fails closed before credential validation when distributed controls are unavailable", async () => {
    mocks.enforceAuthAbuseLimit.mockResolvedValue({
      allowed: false,
      reason: "BACKEND_UNAVAILABLE",
      retryAfterSec: 60,
      backend: "error",
    });
    const { POST } = await import("./route");

    const response = await POST(request({ username: "admin", password: "secret" }));

    expect(response.status).toBe(503);
    expect(mocks.validateAdminCredentials).not.toHaveBeenCalled();
    expect(mocks.createAdminSession).not.toHaveBeenCalled();
  });

  it("returns a bounded 429 before credential validation", async () => {
    mocks.enforceAuthAbuseLimit.mockResolvedValue({
      allowed: false,
      reason: "RATE_LIMITED",
      retryAfterSec: 420,
      backend: "local-redis",
    });
    const { POST } = await import("./route");

    const response = await POST(request({ username: "admin", password: "secret" }));

    expect(response.status).toBe(429);
    expect(response.headers.get("retry-after")).toBe("420");
    expect(mocks.validateAdminCredentials).not.toHaveBeenCalled();
  });

  it("normalizes the username before applying the shared pair limit", async () => {
    const { POST } = await import("./route");

    const response = await POST(request({ username: "  ADMIN  ", password: "secret" }));

    expect(response.status).toBe(200);
    expect(mocks.enforceAuthAbuseLimit).toHaveBeenCalledWith(expect.objectContaining({
      action: "admin-login",
      subject: "admin",
    }));
  });

  it("rejects invalid credentials without creating a session", async () => {
    mocks.validateAdminCredentials.mockReturnValue(false);
    const { POST } = await import("./route");
    const response = await POST(request({ username: "admin", password: "wrong" }));
    expect(response.status).toBe(401);
    expect(mocks.createAdminSession).not.toHaveBeenCalled();
  });

  it("creates a persisted session without process-local counter reset", async () => {
    const { POST } = await import("./route");
    const response = await POST(request({ username: "admin", password: "secret" }));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ success: true });
    expect(mocks.createAdminSession).toHaveBeenCalledOnce();
    expect(mocks.resetAuthRateLimit).not.toHaveBeenCalled();
  });
});
