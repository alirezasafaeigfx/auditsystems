import { LeadStatus } from "@prisma/client";
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  validateAdminSession: vi.fn(),
  csrfProtection: vi.fn(),
  findUnique: vi.fn(),
  update: vi.fn(),
  recordFunnelEvent: vi.fn(),
}));

vi.mock("../../../../../lib/admin-auth", () => ({
  validateAdminSession: mocks.validateAdminSession,
}));

vi.mock("../../../../../lib/csrf", () => ({
  csrfProtection: mocks.csrfProtection,
}));

vi.mock("../../../../../lib/db", () => ({
  prisma: {
    auditLead: {
      findUnique: mocks.findUnique,
      update: mocks.update,
    },
  },
}));

vi.mock("../../../../../lib/funnel-events", () => ({
  recordFunnelEvent: mocks.recordFunnelEvent,
}));

describe("PATCH /api/admin/leads/[id]", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    mocks.validateAdminSession.mockResolvedValue(true);
    mocks.csrfProtection.mockResolvedValue({ valid: true });
    mocks.findUnique.mockResolvedValue(makeLead());
    mocks.update.mockResolvedValue(makeLead({ status: LeadStatus.QUALIFIED }));
  });

  it("rejects unauthenticated requests before mutation", async () => {
    mocks.validateAdminSession.mockResolvedValue(false);
    const { PATCH } = await import("./route");

    const response = await PATCH(jsonPatch({ status: "QUALIFIED" }), context());

    expect(response.status).toBe(401);
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("rejects missing CSRF tokens", async () => {
    mocks.csrfProtection.mockResolvedValue({ valid: false, error: "CSRF token missing" });
    const { PATCH } = await import("./route");

    const response = await PATCH(jsonPatch({ status: "QUALIFIED" }), context());

    expect(response.status).toBe(403);
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("rejects invalid CSRF tokens", async () => {
    mocks.csrfProtection.mockResolvedValue({ valid: false, error: "CSRF token invalid or expired" });
    const { PATCH } = await import("./route");

    const response = await PATCH(jsonPatch({ status: "QUALIFIED" }, "bad-token"), context());

    expect(response.status).toBe(403);
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("accepts a valid CSRF token and records qualification", async () => {
    const { PATCH } = await import("./route");

    const response = await PATCH(jsonPatch({ status: "QUALIFIED" }, "valid-token"), context());

    expect(response.status).toBe(200);
    expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ status: LeadStatus.QUALIFIED }),
    }));
    expect(mocks.recordFunnelEvent).toHaveBeenCalledWith(expect.objectContaining({ eventType: "lead_qualified" }));
  });

  it("requires a real non-empty lost reason", async () => {
    const { PATCH } = await import("./route");

    const response = await PATCH(jsonPatch({ status: "LOST", lostReason: " " }, "valid-token"), context());

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ error: "LOST_REASON_REQUIRED" });
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("rejects invalid lead status transitions", async () => {
    mocks.findUnique.mockResolvedValue(makeLead({ status: LeadStatus.LOST }));
    const { PATCH } = await import("./route");

    const response = await PATCH(jsonPatch({ status: "QUALIFIED" }, "valid-token"), context());

    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({ error: "INVALID_LEAD_TRANSITION" });
  });

  it("rejects invalid report status transitions", async () => {
    mocks.findUnique.mockResolvedValue(makeLead({ run: { id: "run-1", reportStatus: "DELIVERED" } }));
    const { PATCH } = await import("./route");

    const response = await PATCH(jsonPatch({ reportStatus: "QUEUED" }, "valid-token"), context());

    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({ error: "INVALID_REPORT_TRANSITION" });
  });
});

function context() {
  return { params: Promise.resolve({ id: "lead-1" }) };
}

function jsonPatch(body: unknown, csrf = ""): NextRequest {
  return new NextRequest("https://audit.test/api/admin/leads/lead-1", {
    method: "PATCH",
    headers: { "content-type": "application/json", ...(csrf ? { "x-csrf-token": csrf } : {}) },
    body: JSON.stringify(body),
  });
}

function makeLead(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "lead-1",
    runId: "run-1",
    status: LeadStatus.NEW,
    qualifiedAt: null,
    wonAt: null,
    lostAt: null,
    leadSource: "portfolio",
    sourcePlacement: "hero",
    sourceOffer: "request_assessment",
    run: { id: "run-1", reportStatus: "QUEUED" },
    ...overrides,
  };
}
