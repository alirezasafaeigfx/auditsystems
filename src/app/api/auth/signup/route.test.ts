import { NextRequest, NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  csrfProtection: vi.fn(),
  enforceAuthAbuseLimit: vi.fn(),
  checkAuthRateLimit: vi.fn(),
  validatePasswordStrength: vi.fn(),
  userFindUnique: vi.fn(),
  userCreate: vi.fn(),
  createSession: vi.fn(),
  hashPassword: vi.fn(),
  logSecurityEvent: vi.fn(),
  logEvent: vi.fn(),
}));

vi.mock("../../../../lib/csrf", () => ({ csrfProtection: mocks.csrfProtection }));
vi.mock("../../../../lib/authRateLimit", () => ({
  enforceAuthAbuseLimit: mocks.enforceAuthAbuseLimit,
  checkAuthRateLimit: mocks.checkAuthRateLimit,
}));
vi.mock("../../../../lib/passwordValidation", () => ({ validatePasswordStrength: mocks.validatePasswordStrength }));
vi.mock("../../../../lib/db", () => ({
  prisma: {
    user: {
      findUnique: mocks.userFindUnique,
      create: mocks.userCreate,
    },
  },
}));
vi.mock("../../../../lib/auth", () => ({
  createSession: mocks.createSession,
  hashPassword: mocks.hashPassword,
}));
vi.mock("../../../../lib/organization", () => ({ createSlug: () => "victim" }));
vi.mock("../../../../lib/referral", () => ({ trackReferral: vi.fn() }));
vi.mock("../../../../lib/security-log", () => ({ logSecurityEvent: mocks.logSecurityEvent }));
vi.mock("../../../../lib/security", () => ({
  getClientIp: () => "198.51.100.20",
  hashClientIp: () => "legacy-ip-hash",
}));
vi.mock("../../../../lib/observability", () => ({
  createRequestId: () => "signup-request-1",
  logEvent: mocks.logEvent,
  respondJson: (body: unknown, requestId: string, init?: ResponseInit) => {
    const response = NextResponse.json(body, init);
    response.headers.set("x-request-id", requestId);
    return response;
  },
}));

function request() {
  return new NextRequest("https://audit.example.com/api/auth/signup", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": "198.51.100.20" },
    body: JSON.stringify({
      email: "Victim@Example.com",
      password: "Strong-password-123!",
      name: "Victim",
    }),
  });
}

describe("POST /api/auth/signup distributed abuse boundary", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    mocks.csrfProtection.mockResolvedValue({ valid: true });
    mocks.enforceAuthAbuseLimit.mockResolvedValue({
      allowed: true,
      retryAfterSec: 0,
      backend: "local-redis",
      clientHash: "c".repeat(64),
      subjectHash: "d".repeat(64),
    });
    mocks.checkAuthRateLimit.mockReturnValue({ allowed: true, remaining: 9 });
    mocks.validatePasswordStrength.mockReturnValue({ valid: true });
    mocks.userFindUnique.mockResolvedValue(null);
    mocks.hashPassword.mockReturnValue("password-hash");
    mocks.userCreate.mockResolvedValue({ id: "user-2", email: "victim@example.com" });
    mocks.createSession.mockResolvedValue("session-2");
  });

  it("fails closed before password validation, database lookup, or hashing", async () => {
    mocks.enforceAuthAbuseLimit.mockResolvedValue({
      allowed: false,
      reason: "CLIENT_IDENTITY_UNAVAILABLE",
      retryAfterSec: 60,
      backend: "error",
    });
    const { POST } = await import("./route");

    const response = await POST(request());

    expect(response.status).toBe(503);
    expect(mocks.validatePasswordStrength).not.toHaveBeenCalled();
    expect(mocks.userFindUnique).not.toHaveBeenCalled();
    expect(mocks.hashPassword).not.toHaveBeenCalled();
  });

  it("rate-limits before state-changing work and returns Retry-After", async () => {
    mocks.enforceAuthAbuseLimit.mockResolvedValue({
      allowed: false,
      reason: "RATE_LIMITED",
      retryAfterSec: 240,
      backend: "local-redis",
    });
    const { POST } = await import("./route");

    const response = await POST(request());

    expect(response.status).toBe(429);
    expect(response.headers.get("retry-after")).toBe("240");
    expect(mocks.userCreate).not.toHaveBeenCalled();
    expect(mocks.createSession).not.toHaveBeenCalled();
  });

  it("passes the normalized subject to the shared boundary and logs only opaque identifiers", async () => {
    const { POST } = await import("./route");

    const response = await POST(request());

    expect(response.status).toBe(201);
    expect(mocks.enforceAuthAbuseLimit).toHaveBeenCalledWith(expect.objectContaining({
      action: "signup",
      subject: "victim@example.com",
    }));
    const serialized = JSON.stringify(mocks.logSecurityEvent.mock.calls);
    expect(serialized).not.toContain("victim@example.com");
    expect(mocks.logSecurityEvent).toHaveBeenCalledWith(expect.objectContaining({
      identifierHash: "d".repeat(64),
      ipHash: "c".repeat(64),
    }));
  });
});
