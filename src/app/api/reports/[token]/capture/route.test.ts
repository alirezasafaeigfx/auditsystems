import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findUnique: vi.fn(),
  findFirst: vi.fn(),
  create: vi.fn(),
}));

vi.mock("../../../../../lib/reportShare", () => ({
  isReportShareAccessible: () => true,
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
    mocks.findUnique.mockResolvedValue({ runId: "run-1", run: { url: "https://example.com", normalizedUrl: "https://example.com/" } });
    mocks.findFirst.mockResolvedValue(null);
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
});

function request(body: unknown): NextRequest {
  return new NextRequest("https://audit.test/api/reports/share-token/capture", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}
