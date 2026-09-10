import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findUnique: vi.fn(),
  findFirst: vi.fn(),
  create: vi.fn(),
  verifyReportAccessCredential: vi.fn(() => false),
}));

vi.mock("../../../../../lib/reportShare", () => ({
  isReportShareAccessible: () => true,
  hasPassword: (share: { passwordHash?: string | null }) => Boolean(share.passwordHash),
}));

vi.mock("../../../../../lib/report-access", () => ({
  getReportAccessCookieName: () => "report_access_fixture",
  verifyReportAccessCredential: mocks.verifyReportAccessCredential,
}));

vi.mock("../../../../../lib/db", () => ({
  prisma: {
    reportShare: { findUnique: mocks.findUnique },
    auditLead: {
      findFirst: mocks.findFirst,
      create: mocks.create,
    },
  },
}));

describe("POST /api/reports/[token]/capture", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    mocks.findUnique.mockResolvedValue({ runId: "run-1", run: { url: "https://example.com", normalizedUrl: "https://example.com/", status: "SUCCEEDED" } });
    mocks.findFirst.mockResolvedValue(null);
    mocks.verifyReportAccessCredential.mockReturnValue(false);
  });

  it("does not create consent when the user did not explicitly provide it", async () => {
    const { POST } = await import("./route");

    const response = await POST(request({ email: "owner@example.com" }), { params: Promise.resolve({ token: "share-token" }) });

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ error: "CONSENT_REQUIRED" });
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("stores consent only when explicitly provided", async () => {
    const { POST } = await import("./route");

    const response = await POST(request({ email: "owner@example.com", consentPrivacy: true }), { params: Promise.resolve({ token: "share-token" }) });

    expect(response.status).toBe(200);
    expect(mocks.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ consentPrivacy: true }),
    }));
  });

  it("does not disclose or mutate a protected report without authorization", async () => {
    mocks.findUnique.mockResolvedValue({
      passwordHash: "synthetic-hash",
      runId: "run-1",
      run: { url: "https://private.invalid", normalizedUrl: "https://private.invalid/", status: "SUCCEEDED" },
    });
    const { POST } = await import("./route");

    const response = await POST(request({ email: "owner@example.com", consentPrivacy: true }), { params: Promise.resolve({ token: "share-token" }) });

    expect(response.status).toBe(404);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toEqual({ error: "NOT_FOUND" });
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("accepts capture for a protected report with its valid session", async () => {
    mocks.findUnique.mockResolvedValue({
      passwordHash: "synthetic-hash",
      runId: "run-1",
      run: { url: "https://private.invalid", normalizedUrl: "https://private.invalid/", status: "SUCCEEDED" },
    });
    mocks.verifyReportAccessCredential.mockReturnValue(true);
    const { POST } = await import("./route");

    const response = await POST(request(
      { email: "owner@example.com", consentPrivacy: true },
      "report_access_fixture=signed-report-credential",
    ), { params: Promise.resolve({ token: "share-token" }) });

    expect(response.status).toBe(200);
    expect(mocks.verifyReportAccessCredential).toHaveBeenCalledWith("signed-report-credential", "share-token");
  });
});

function request(body: unknown, cookie?: string): NextRequest {
  return new NextRequest("https://audit.test/api/reports/share-token/capture", {
    method: "POST",
    headers: { "content-type": "application/json", ...(cookie ? { cookie } : {}) },
    body: JSON.stringify(body),
  });
}
