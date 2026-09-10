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
  createReportAccessCredential: vi.fn(() => "signed-report-credential"),
  readReportAccessCredential: vi.fn<(cookieHeader: string | null, token: string) => string | null>(() => null),
  serializeReportAccessCookie: vi.fn(() => "report_access_fixture=signed-report-credential; HttpOnly; SameSite=Strict; Path=/; Max-Age=900"),
  verifyReportAccessCredential: vi.fn(() => false),
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

vi.mock("../../../../lib/report-access", () => ({
  createReportAccessCredential: mocks.createReportAccessCredential,
  readReportAccessCredential: mocks.readReportAccessCredential,
  serializeReportAccessCookie: mocks.serializeReportAccessCookie,
  verifyReportAccessCredential: mocks.verifyReportAccessCredential,
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
    mocks.verifyReportAccessCredential.mockReturnValue(false);
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

  it("returns machine-readable partial coverage instead of an implicit perfect result", async () => {
    const share = makeShare();
    share.run.summary = {
      schema: "asdev.audit.summary.v1", scoringPolicyVersion: "worst-severity-v2", score: 100, grade: "EXCELLENT",
      categoryScores: { SEO: 100, PERFORMANCE: 100, SECURITY: 100, UX: 100, ACCESSIBILITY: 100, RESILIENCE: 100 },
      severityCounts: { INFO: 0, LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 },
      resultCoverage: { schema: "asdev.audit.result-coverage.v1", coveredCategories: ["SEO", "SECURITY", "UX", "ACCESSIBILITY", "RESILIENCE"], unavailableCategories: ["PERFORMANCE"], ratio: 5 / 6, confidence: 5 / 6, freshness: "FRESH", measurementIds: ["category:SEO", "category:SECURITY", "category:UX", "category:ACCESSIBILITY", "category:RESILIENCE"], limitations: ["Performance score withheld."] },
    } as never;
    mocks.findUnique.mockResolvedValue(share);
    const { GET } = await import("./route");
    const response = await GET(new Request("https://test/api/reports/test-token"), { params: Promise.resolve({ token: "test-token" }) });
    const json = await response.json();

    expect(json.result).toMatchObject({ availability: "PARTIAL", coverage: { ratio: 5 / 6 } });
    expect(json.result.categoryScores.PERFORMANCE).toBeNull();
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

  it("returns protected report data only with a valid report-bound session", async () => {
    mocks.findUnique.mockResolvedValue(makeShare({ passwordHash: "hashed-pw" }));
    mocks.readReportAccessCredential.mockReturnValue("signed-report-credential");
    mocks.verifyReportAccessCredential.mockReturnValue(true);
    const { GET } = await import("./route");
    const response = await GET(
      new Request("https://test/api/reports/test-token", { headers: { cookie: "report_access_fixture=signed-report-credential" } }),
      { params: Promise.resolve({ token: "test-token" }) },
    );

    expect(response.status).toBe(200);
    expect((await response.json()).run.id).toBe("run-1");
    expect(mocks.verifyReportAccessCredential).toHaveBeenCalledWith("signed-report-credential", "test-token");
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
    mocks.createReportAccessCredential.mockReturnValue("signed-report-credential");
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
    expect(response.headers.get("set-cookie")).toContain("report_access_fixture=signed-report-credential");
    expect(response.headers.get("set-cookie")).not.toContain("test-token");
  });

  it("fails closed without incrementing a view when session signing is unavailable", async () => {
    mocks.findUnique.mockResolvedValue(makeShare({ passwordHash: "hashed-pw" }));
    mocks.createReportAccessCredential.mockImplementationOnce(() => { throw new Error("missing secret"); });
    const { POST } = await import("./route");
    const response = await POST(
      new Request("https://test/api/reports/test-token", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ password: "correct-password" }),
      }),
      { params: Promise.resolve({ token: "test-token" }) },
    );

    expect(response.status).toBe(503);
    expect((await response.json()).error).toBe("ACCESS_UNAVAILABLE");
    expect(mocks.update).not.toHaveBeenCalled();
  });
});
