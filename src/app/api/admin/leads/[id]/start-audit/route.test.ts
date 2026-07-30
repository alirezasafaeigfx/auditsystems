import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  validateAdminSession: vi.fn(),
  csrfProtection: vi.fn(),
  enqueueAuditAtomically: vi.fn(),
  buildAuditIdempotencyKey: vi.fn(() => "v1:ADMIN_LEAD:key"),
  recordFunnelEvent: vi.fn(),
  logEvent: vi.fn(),
  findUnique: vi.fn(),
  jobFindFirst: vi.fn(),
}));

vi.mock("../../../../../../lib/admin-auth", () => ({
  validateAdminSession: mocks.validateAdminSession,
}));

vi.mock("../../../../../../lib/csrf", () => ({
  csrfProtection: mocks.csrfProtection,
}));

vi.mock("../../../../../../lib/audit-enqueue", () => {
  class AuditEnqueueError extends Error {
    code: string;
    constructor(code: string) {
      super(code);
      this.code = code;
    }
  }
  return {
    AuditEnqueueError,
    enqueueAuditAtomically: mocks.enqueueAuditAtomically,
    buildAuditIdempotencyKey: mocks.buildAuditIdempotencyKey,
  };
});

vi.mock("../../../../../../lib/funnel-events", () => ({
  recordFunnelEvent: mocks.recordFunnelEvent,
}));

vi.mock("../../../../../../lib/observability", () => ({
  logEvent: mocks.logEvent,
}));

vi.mock("../../../../../../lib/db", () => ({
  prisma: {
    auditLead: {
      findUnique: mocks.findUnique,
    },
    job: {
      findFirst: mocks.jobFindFirst,
    },
  },
}));

const leadWithoutRun = {
  id: "lead-1",
  runId: null,
  domain: "https://example.com",
  normalizedUrl: "https://example.com/",
  qualifiedAt: null,
  leadSource: "portfolio",
  sourcePlacement: "hero",
  sourceOffer: "request_assessment",
  run: null,
};

const existingRunLead = {
  ...leadWithoutRun,
  runId: "run-1",
  run: {
    id: "run-1",
    reportStatus: "QUEUED",
    shares: [{ token: "share-token" }],
  },
};

describe("POST /api/admin/leads/[id]/start-audit", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    mocks.validateAdminSession.mockResolvedValue(true);
    mocks.csrfProtection.mockResolvedValue({ valid: true });
    mocks.findUnique.mockResolvedValue(leadWithoutRun);
    mocks.enqueueAuditAtomically.mockResolvedValue({
      run: { id: "run-1", reportStatus: "QUEUED" },
      share: { token: "share-token" },
      job: { id: "job-1" },
      reused: false,
    });
    mocks.recordFunnelEvent.mockResolvedValue(undefined);
  });

  it("rejects missing CSRF tokens without exposing validation details", async () => {
    mocks.csrfProtection.mockResolvedValue({ valid: false, error: "CSRF token missing" });
    const { POST } = await import("./route");

    const response = await POST(request(), context());
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body).toEqual({ error: "FORBIDDEN" });
    expect(mocks.enqueueAuditAtomically).not.toHaveBeenCalled();
  });

  it("atomically enqueues and links a new lead audit", async () => {
    const { POST } = await import("./route");

    const response = await POST(request("valid-token"), context());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({ runId: "run-1", token: "share-token", reused: false });
    expect(mocks.buildAuditIdempotencyKey).toHaveBeenCalledWith({
      source: "ADMIN_LEAD",
      scope: "lead-1",
      rawKey: "initial-audit",
    });
    expect(mocks.enqueueAuditAtomically).toHaveBeenCalledWith(expect.objectContaining({
      source: "ADMIN_LEAD",
      idempotencyKey: "v1:ADMIN_LEAD:key",
      jobTimeoutMs: 90000,
      lead: expect.objectContaining({ id: "lead-1", status: "QUALIFIED" }),
    }));
    expect(mocks.recordFunnelEvent).toHaveBeenCalledWith(expect.objectContaining({
      eventType: "audit_started",
      leadId: "lead-1",
      runId: "run-1",
    }));
  });

  it("returns success when non-critical funnel telemetry fails", async () => {
    mocks.recordFunnelEvent.mockRejectedValue(new Error("analytics unavailable"));
    const { POST } = await import("./route");

    const response = await POST(request("valid-token"), context());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({ runId: "run-1", token: "share-token", reused: false });
    expect(mocks.logEvent).toHaveBeenCalledWith(
      "warn",
      "admin_lead_audit_funnel_event_failed",
      expect.objectContaining({ leadId: "lead-1", runId: "run-1" }),
    );
  });

  it("returns an already-linked lead without a second enqueue", async () => {
    mocks.findUnique.mockResolvedValue(existingRunLead);
    const { POST } = await import("./route");

    const response = await POST(request("valid-token"), context());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({ runId: "run-1", token: "share-token", reused: true });
    expect(mocks.enqueueAuditAtomically).not.toHaveBeenCalled();
  });

  it("recovers the winning run when a concurrent lead link wins", async () => {
    const { AuditEnqueueError } = await import("../../../../../../lib/audit-enqueue");
    mocks.enqueueAuditAtomically.mockRejectedValue(new AuditEnqueueError("AUDIT_ALREADY_STARTED"));
    mocks.findUnique
      .mockResolvedValueOnce(leadWithoutRun)
      .mockResolvedValueOnce(existingRunLead);
    const { POST } = await import("./route");

    const response = await POST(request("valid-token"), context());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({ runId: "run-1", token: "share-token", reused: true });
    expect(mocks.recordFunnelEvent).not.toHaveBeenCalled();
  });
});

function request(csrf = ""): NextRequest {
  return new NextRequest("https://audit.test/api/admin/leads/lead-1/start-audit", {
    method: "POST",
    headers: csrf ? { "x-csrf-token": csrf } : {},
  });
}

function context() {
  return { params: Promise.resolve({ id: "lead-1" }) };
}
