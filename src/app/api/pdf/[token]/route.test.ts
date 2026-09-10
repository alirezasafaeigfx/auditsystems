import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findUnique: vi.fn(),
  organizationFindUnique: vi.fn(),
  verifyDownloadToken: vi.fn(),
  readDownloadTokenCookie: vi.fn<(cookieHeader: string | null, reportToken: string) => string | null>(() => null),
  buildAuditReportPdf: vi.fn(async () => new Uint8Array([37, 80, 68, 70])),
  appendPerformanceEvidencePage: vi.fn(async (bytes: Uint8Array) => bytes),
  observeApiRequest: vi.fn(),
}));

vi.mock("../../../../lib/db", () => ({
  prisma: {
    reportShare: { findUnique: mocks.findUnique },
    organization: { findUnique: mocks.organizationFindUnique },
  },
}));
vi.mock("../../../../lib/downloadToken", () => ({
  verifyDownloadToken: mocks.verifyDownloadToken,
  readDownloadTokenCookie: mocks.readDownloadTokenCookie,
}));
vi.mock("../../../../lib/pdf", () => ({ buildAuditReportPdf: mocks.buildAuditReportPdf }));
vi.mock("../../../../lib/performance-report", () => ({ appendPerformanceEvidencePage: mocks.appendPerformanceEvidencePage }));
vi.mock("../../../../lib/metrics", () => ({ observeApiRequest: mocks.observeApiRequest }));
vi.mock("../../../../lib/usage", () => ({ getCurrentPlan: vi.fn() }));
vi.mock("../../../../lib/observability", () => ({
  createRequestId: () => "request-pdf-1",
  respondJson: (body: unknown, requestId: string, init?: ResponseInit) => {
    const response = Response.json(body, init);
    response.headers.set("x-request-id", requestId);
    return response;
  },
}));

function protectedShare(overrides: Record<string, unknown> = {}) {
  return {
    token: "protected-share",
    passwordHash: "synthetic-password-hash",
    revokedAt: null,
    expiresAt: null,
    runId: "run-1",
    run: {
      id: "run-1",
      url: "https://private.invalid",
      normalizedUrl: "https://private.invalid/",
      status: "SUCCEEDED",
      summary: { score: 50, grade: "NEEDS_WORK" },
      locale: "en",
      organizationId: null,
      findings: [],
      orders: [{ id: "order-1", email: "synthetic@example.invalid", status: "PAID" }],
    },
    ...overrides,
  };
}

describe("GET /api/pdf/[token] access", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.verifyDownloadToken.mockReturnValue({ runId: "run-1", orderId: "order-1", email: "synthetic@example.invalid", exp: 2_000_000_000 });
    mocks.findUnique.mockResolvedValue(protectedShare());
  });

  it("returns no PDF bytes for an absent or malformed download credential", async () => {
    mocks.verifyDownloadToken.mockReturnValue(null);
    const { GET } = await import("./route");
    const response = await GET(request("malformed"), { params: Promise.resolve({ token: "protected-share" }) });

    expect(response.status).toBe(401);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("content-type")).toContain("application/json");
    expect(mocks.findUnique).not.toHaveBeenCalled();
    expect(mocks.buildAuditReportPdf).not.toHaveBeenCalled();
  });

  it("passes partial coverage to PDF rendering without a synthetic performance score", async () => {
    const share = protectedShare();
    share.run.summary = {
      schema: "asdev.audit.summary.v1", scoringPolicyVersion: "worst-severity-v2", score: 100, grade: "EXCELLENT",
      categoryScores: { SEO: 100, PERFORMANCE: 100, SECURITY: 100, UX: 100, ACCESSIBILITY: 100, RESILIENCE: 100 },
      severityCounts: { INFO: 0, LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 },
      seoFiles: { robots: { status: "VERIFIED" }, sitemap: { status: "VERIFIED" } },
      resultCoverage: { schema: "asdev.audit.result-coverage.v1", coveredCategories: ["SEO", "SECURITY", "ACCESSIBILITY", "RESILIENCE"], unavailableCategories: ["PERFORMANCE", "UX"], ratio: 4 / 6, confidence: 4 / 6, freshness: "FRESH", measurementIds: ["category:SEO", "category:SECURITY", "category:ACCESSIBILITY", "category:RESILIENCE"], limitations: ["Performance and UX scores withheld."] },
    } as never;
    mocks.findUnique.mockResolvedValue(share);
    const { GET } = await import("./route");
    const response = await GET(request("signed-valid"), { params: Promise.resolve({ token: "protected-share" }) });

    expect(response.status).toBe(200);
    expect(mocks.buildAuditReportPdf).toHaveBeenCalledWith(expect.objectContaining({
      result: expect.objectContaining({ availability: "PARTIAL", coverage: expect.objectContaining({ ratio: 4 / 6 }) }),
      score: expect.objectContaining({ categories: expect.objectContaining({ PERFORMANCE: null }) }),
    }));
  });

  it("rejects a credential belonging to a different report before PDF generation", async () => {
    mocks.verifyDownloadToken.mockReturnValue({ runId: "other-run", orderId: "order-1", email: "synthetic@example.invalid", exp: 2_000_000_000 });
    const { GET } = await import("./route");
    const response = await GET(request("signed-other-report"), { params: Promise.resolve({ token: "protected-share" }) });

    expect(response.status).toBe(403);
    expect(mocks.buildAuditReportPdf).not.toHaveBeenCalled();
  });

  it("rejects revoked protected reports even with a valid download credential", async () => {
    mocks.findUnique.mockResolvedValue(protectedShare({ revokedAt: new Date() }));
    const { GET } = await import("./route");
    const response = await GET(request("signed-valid"), { params: Promise.resolve({ token: "protected-share" }) });

    expect(response.status).toBe(404);
    expect(mocks.buildAuditReportPdf).not.toHaveBeenCalled();
  });

  it("returns no-store PDF bytes for a valid report-bound paid download credential", async () => {
    const { GET } = await import("./route");
    const response = await GET(request("signed-valid"), { params: Promise.resolve({ token: "protected-share" }) });

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("application/pdf");
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(new Uint8Array([37, 80, 68, 70]));
  });

  it("accepts the report-bound HttpOnly cookie without a query credential", async () => {
    mocks.readDownloadTokenCookie.mockReturnValue("signed-cookie-token");
    const { GET } = await import("./route");
    const response = await GET(
      new NextRequest("https://audit.test/api/pdf/protected-share", { headers: { cookie: "report_download_fixture=signed-cookie-token" } }),
      { params: Promise.resolve({ token: "protected-share" }) },
    );

    expect(response.status).toBe(200);
    expect(mocks.verifyDownloadToken).toHaveBeenCalledWith("signed-cookie-token");
  });
});

function request(downloadToken: string): NextRequest {
  return new NextRequest(`https://audit.test/api/pdf/protected-share?dl=${downloadToken}`);
}
