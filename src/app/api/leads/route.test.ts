import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  consumeDistributedRateLimit: vi.fn(),
  findFirst: vi.fn(),
  create: vi.fn(),
  recordFunnelEvent: vi.fn(),
  validateLeadIntake: vi.fn(),
}));

vi.mock("../../../lib/rateLimit", () => ({
  consumeDistributedRateLimit: mocks.consumeDistributedRateLimit,
}));

vi.mock("../../../lib/security", () => ({
  getClientIp: () => "127.0.0.1",
  hashClientIp: () => "iphash",
}));

vi.mock("../../../lib/db", () => ({
  prisma: {
    auditLead: {
      findFirst: mocks.findFirst,
      create: mocks.create,
    },
  },
}));

vi.mock("../../../lib/funnel-events", () => ({
  recordFunnelEvent: mocks.recordFunnelEvent,
}));

vi.mock("../../../lib/lead-delivery", () => ({
  validateLeadIntake: mocks.validateLeadIntake,
}));

describe("POST /api/leads", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    mocks.consumeDistributedRateLimit.mockResolvedValue({ allowed: true, backend: "memory" });
    mocks.validateLeadIntake.mockResolvedValue({
      ok: true,
      value: {
        domain: "https://example.com",
        normalizedUrl: "https://example.com/",
        email: "owner@example.com",
        businessType: "ecommerce",
        primaryConcern: "Organic leads dropped after a migration.",
        consentPrivacy: true,
        leadSource: "portfolio",
        sourcePlacement: "hero",
        sourceOffer: "request_assessment",
        submitEventId: "event-1",
      },
    });
  });

  it("returns the same public response for new leads and does not expose internal ids", async () => {
    mocks.findFirst.mockResolvedValue(null);
    mocks.create.mockResolvedValue({ id: "lead-new", leadSource: "portfolio" });
    const { POST } = await import("./route");

    const response = await POST(jsonRequest({ contact: "owner@example.com" }));
    const body = await response.json();

    expect(response.status).toBe(202);
    expect(body).toMatchObject({ accepted: true });
    expect(body.leadId).toBeUndefined();
    expect(body.status).toBeUndefined();
    expect(body.duplicate).toBeUndefined();
  });

  it("does not reveal duplicate lead existence, id, or status", async () => {
    mocks.findFirst.mockResolvedValue({ id: "lead-existing", status: "QUALIFIED" });
    const { POST } = await import("./route");

    const response = await POST(jsonRequest({ contact: "owner@example.com" }));
    const body = await response.json();

    expect(response.status).toBe(202);
    expect(body).toMatchObject({ accepted: true });
    expect(body.leadId).toBeUndefined();
    expect(body.status).toBeUndefined();
    expect(body.duplicate).toBeUndefined();
    expect(mocks.create).not.toHaveBeenCalled();
  });
});

function jsonRequest(body: unknown): NextRequest {
  return new NextRequest("https://audit.test/api/leads", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}
