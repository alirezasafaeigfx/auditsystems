import { NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findUnique: vi.fn(),
  update: vi.fn(),
  consumeDistributedRateLimit: vi.fn(),
  isReportShareAccessible: vi.fn(() => true),
  hasPassword: vi.fn((share: { passwordHash?: string | null }) => Boolean(share?.passwordHash)),
  verifyPassword: vi.fn(),
  observeApiRequest: vi.fn(),
  createRequestId: vi.fn(() => "request-report-1"),
  logEvent: vi.fn(),
}));

vi.mock("../../../../lib/db", () => ({
  prisma: {
    reportShare: {
      findUnique: mocks.findUnique,
      update: mocks.update,
    },
  },
}));

vi.mock("../../../../lib/rateLimit", () => ({
  consumeDistributedRateLimit: mocks.consumeDistributedRateLimit,
}));

vi.mock("../../../../lib/metrics", () => ({
  observeApiRequest: mocks.observeApiRequest,
}));

vi.mock("../../../../lib/reportShare", () => ({
  REPORT_SHARE_PASSWORD_MAX_LENGTH: 256,
  isReportShareAccessible: mocks.isReportShareAccessible,
  hasPassword: mocks.hasPassword,
  verifyPassword: mocks.verifyPassword,
}));

vi.mock("../../../../lib/observability", () => ({
  createRequestId: mocks.createRequestId,
  logEvent: mocks.logEvent,
  respondJson: (body: unknown, requestId: string, init?: ResponseInit) => {
    const response = NextResponse.json(body, init);
    response.headers.set("x-request-id", requestId);
    return response;
  },
}));

function makeShare(overrides: Record<string, unknown> = {}) {
  return {
    id: "share-1",
    token: "test-token",
    runId: "run-1",
    passwordHash: null,
    viewCount: 0,
    expiresAt: null,
    revokedAt: null,
    run: {
      id: "run-1",
      url: "https://example.com",
      normalizedUrl: "https://example.com/",
      status: "SUCCEEDED",
      summary: "Test summary",
      findings: [],
    },
    ...overrides,
  };
}

describe("GET /api/reports/[token]", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    mocks.update.mockResolvedValue({});
    mocks.consumeDistributedRateLimit.mockResolvedValue({
      allowed: true,
      remaining: 9,
      limit: 10,
      resetSec: 900,
      backend: "local-redis",
    });
    mocks.verifyPassword.mockResolvedValue(true);
  });

  it("returns 404 for missing share without logging the raw token", async () => {
    mocks.findUnique.mockResolvedValue(null);
    const { GET } = await import("./route");
    const response = await GET(
      new Request("https://test/api/reports/raw-sensitive-token"),
      { params: Promise.resolve({ token: "raw-sensitive-token" }) },
    );

    expect(response.status).toBe(404);
    const serializedCalls = JSON.stringify(mocks.logEvent.mock.calls);
    expect(serializedCalls).not.toContain("raw-sensitive-token");
    expect(mocks.logEvent).toHaveBeenCalledWith(
      "warn",
      "report_fetch_not_found",
      expect.objectContaining({ tokenHash: expect.stringMatching(/^[a-f0-9]{64}$/) }),
    );
  });

  it("returns report data for an unpassworded share", async () => {
    mocks.findUnique.mockResolvedValue(makeShare());
    const { GET } = await import("./route");
    const response = await GET(
      new Request("https://test/api/reports/test-token"),
      { params: Promise.resolve({ token: "test-token" }) },
    );

    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.run.id).toBe("run-1");
  });

  it("returns PASSWORD_REQUIRED for a protected share and ignores query passwords", async () => {
    mocks.findUnique.mockResolvedValue(makeShare({ passwordHash: "hashed-pw" }));
    const { GET } = await import("./route");
    const response = await GET(
      new Request("https://test/api/reports/test-token?password=correct-password"),
      { params: Promise.resolve({ token: "test-token" }) },
    );

    expect(response.status).toBe(401);
    expect((await response.json()).error).toBe("PASSWORD_REQUIRED");
    expect(mocks.verifyPassword).not.toHaveBeenCalled();
  });
});

describe("POST /api/reports/[token]", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    mocks.update.mockResolvedValue({});
    mocks.consumeDistributedRateLimit.mockResolvedValue({
      allowed: true,
      remaining: 9,
      limit: 10,
      resetSec: 900,
      backend: "local-redis",
    });
    mocks.verifyPassword.mockImplementation(async (password: string) => password === "correct-password");
  });

  it("returns report data for an unpassworded share without consuming the password limiter", async () => {
    mocks.findUnique.mockResolvedValue(makeShare());
    const { POST } = await import("./route");
    const response = await POST(
      new Request("https://test/api/reports/test-token", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({}),
      }),
      { params: Promise.resolve({ token: "test-token" }) },
    );

    expect(response.status).toBe(200);
    expect(mocks.consumeDistributedRateLimit).not.toHaveBeenCalled();
  });

  it("rejects a limited report before password verification or mutation", async () => {
    mocks.findUnique.mockResolvedValue(makeShare({ passwordHash: "hashed-pw" }));
    mocks.consumeDistributedRateLimit.mockResolvedValue({
      allowed: false,
      remaining: 0,
      limit: 10,
      resetSec: 420,
      backend: "local-redis",
    });

    const { POST } = await import("./route");
    const response = await POST(
      new Request("https://test/api/reports/test-token", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ password: "candidate" }),
      }),
      { params: Promise.resolve({ token: "test-token" }) },
    );

    expect(response.status).toBe(429);
    expect(response.headers.get("retry-after")).toBe("420");
    expect(mocks.verifyPassword).not.toHaveBeenCalled();
    expect(mocks.update).not.toHaveBeenCalled();
    expect(mocks.consumeDistributedRateLimit).toHaveBeenCalledWith({
      key: expect.stringMatching(/^report-password:[a-f0-9]{64}$/),
      limit: 10,
      windowSec: 900,
    });
  });

  it("does not run the KDF for oversized or missing passwords", async () => {
    mocks.findUnique.mockResolvedValue(makeShare({ passwordHash: "hashed-pw" }));
    const { POST } = await import("./route");
    const response = await POST(
      new Request("https://test/api/reports/test-token", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ password: "x".repeat(257) }),
      }),
      { params: Promise.resolve({ token: "test-token" }) },
    );

    expect(response.status).toBe(401);
    expect(mocks.verifyPassword).not.toHaveBeenCalled();
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("returns 401 for a wrong password", async () => {
    mocks.findUnique.mockResolvedValue(makeShare({ passwordHash: "hashed-pw" }));
    const { POST } = await import("./route");
    const response = await POST(
      new Request("https://test/api/reports/test-token", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ password: "wrong-password" }),
      }),
      { params: Promise.resolve({ token: "test-token" }) },
    );

    expect(response.status).toBe(401);
    expect(mocks.verifyPassword).toHaveBeenCalledWith("wrong-password", "hashed-pw");
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("awaits verification and increments the view after a correct password", async () => {
    mocks.findUnique.mockResolvedValue(makeShare({ passwordHash: "hashed-pw" }));
    const { POST } = await import("./route");
    const response = await POST(
      new Request("https://test/api/reports/test-token", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ password: "correct-password" }),
      }),
      { params: Promise.resolve({ token: "test-token" }) },
    );

    expect(response.status).toBe(200);
    expect(mocks.verifyPassword).toHaveBeenCalledWith("correct-password", "hashed-pw");
    expect(mocks.update).toHaveBeenCalledWith({
      where: { token: "test-token" },
      data: {
        viewCount: { increment: 1 },
        lastViewedAt: expect.any(Date),
      },
    });
  });
});
