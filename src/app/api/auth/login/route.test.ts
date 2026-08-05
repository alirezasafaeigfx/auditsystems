import { NextRequest, NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  csrfProtection: vi.fn(),
  userFindUnique: vi.fn(),
  verifyPassword: vi.fn(),
  createSession: vi.fn(),
  enforceAuthAbuseLimit: vi.fn(),
  checkAuthRateLimit: vi.fn(),
  isAccountLocked: vi.fn(),
  recordFailedLogin: vi.fn(),
  clearFailedLogins: vi.fn(),
  logSecurityEvent: vi.fn(),
  logEvent: vi.fn(),
}));

vi.mock("../../../../lib/csrf", () => ({ csrfProtection: mocks.csrfProtection }));
vi.mock("../../../../lib/db", () => ({
  prisma: { user: { findUnique: mocks.userFindUnique } },
}));
vi.mock("../../../../lib/auth", () => ({
  verifyPassword: mocks.verifyPassword,
  createSession: mocks.createSession,
}));
vi.mock("../../../../lib/authRateLimit", () => ({
  enforceAuthAbuseLimit: mocks.enforceAuthAbuseLimit,
  checkAuthRateLimit: mocks.checkAuthRateLimit,
}));
vi.mock("../../../../lib/account-lockout", () => ({
  isAccountLocked: mocks.isAccountLocked,
  recordFailedLogin: mocks.recordFailedLogin,
  clearFailedLogins: mocks.clearFailedLogins,
}));
vi.mock("../../../../lib/security-log", () => ({ logSecurityEvent: mocks.logSecurityEvent }));
vi.mock("../../../../lib/security", () => ({
  getClientIp: () => "198.51.100.10",
  hashClientIp: () => "legacy-ip-hash",
}));
vi.mock("../../../../lib/observability", () => ({
  createRequestId: () => "login-request-1",
  logEvent: mocks.logEvent,
  respondJson: (body: unknown, requestId: string, init?: ResponseInit) => {
    const response = NextResponse.json(body, init);
    response.headers.set("x-request-id", requestId);
    return response;
  },
}));

function request(email = "victim@example.com", password = "correct-password") {
  return new NextRequest("https://audit.example.com/api/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": "198.51.100.10" },
    body: JSON.stringify({ email, password }),
  });
}

describe("POST /api/auth/login distributed abuse boundary", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    mocks.csrfProtection.mockResolvedValue({ valid: true });
    mocks.enforceAuthAbuseLimit.mockResolvedValue({
      allowed: true,
      retryAfterSec: 0,
      backend: "local-redis",
      clientHash: "a".repeat(64),
      subjectHash: "b".repeat(64),
    });
    mocks.checkAuthRateLimit.mockReturnValue({ allowed: true, remaining: 9 });
    mocks.isAccountLocked.mockReturnValue({ locked: false, retryAfterSec: 0 });
    mocks.recordFailedLogin.mockReturnValue({ locked: false, retryAfterSec: 0 });
    mocks.userFindUnique.mockResolvedValue({
      id: "user-1",
      email: "victim@example.com",
      passwordHash: "stored-hash",
    });
    mocks.verifyPassword.mockReturnValue(true);
    mocks.createSession.mockResolvedValue("session-1");
  });

  it("fails closed before database or password work when controls are unavailable", async () => {
    mocks.enforceAuthAbuseLimit.mockResolvedValue({
      allowed: false,
      reason: "BACKEND_UNAVAILABLE",
      retryAfterSec: 60,
      backend: "error",
    });
    const { POST } = await import("./route");

    const response = await POST(request());

    expect(response.status).toBe(503);
    expect(mocks.userFindUnique).not.toHaveBeenCalled();
    expect(mocks.verifyPassword).not.toHaveBeenCalled();
    expect(mocks.createSession).not.toHaveBeenCalled();
  });

  it("returns a bounded 429 before credential verification when the client pair is limited", async () => {
    mocks.enforceAuthAbuseLimit.mockResolvedValue({
      allowed: false,
      reason: "RATE_LIMITED",
      retryAfterSec: 321,
      backend: "local-redis",
    });
    const { POST } = await import("./route");

    const response = await POST(request());

    expect(response.status).toBe(429);
    expect(response.headers.get("retry-after")).toBe("321");
    expect(mocks.verifyPassword).not.toHaveBeenCalled();
  });

  it("does not let a process-local victim account lock reject correct credentials", async () => {
    mocks.isAccountLocked.mockReturnValue({ locked: true, retryAfterSec: 1800 });
    const { POST } = await import("./route");

    const response = await POST(request());

    expect(response.status).toBe(200);
    expect(mocks.verifyPassword).toHaveBeenCalledWith("correct-password", "stored-hash");
    expect(mocks.createSession).toHaveBeenCalledWith("user-1");
    expect(mocks.isAccountLocked).not.toHaveBeenCalled();
    expect(mocks.recordFailedLogin).not.toHaveBeenCalled();
  });

  it("logs opaque identifiers rather than the normalized email", async () => {
    const { POST } = await import("./route");

    const response = await POST(request("Victim@Example.com"));

    expect(response.status).toBe(200);
    const serialized = JSON.stringify(mocks.logSecurityEvent.mock.calls);
    expect(serialized).not.toContain("victim@example.com");
    expect(mocks.logSecurityEvent).toHaveBeenCalledWith(expect.objectContaining({
      event: "login_success",
      identifierHash: "b".repeat(64),
      ipHash: "a".repeat(64),
    }));
  });
});
