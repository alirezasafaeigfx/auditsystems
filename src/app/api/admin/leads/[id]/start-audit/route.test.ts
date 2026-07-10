import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  validateAdminSession: vi.fn(),
  csrfProtection: vi.fn(),
  enqueueJob: vi.fn(),
  recordFunnelEvent: vi.fn(),
  findUnique: vi.fn(),
  auditRunCreate: vi.fn(),
  auditRunUpdate: vi.fn(),
  reportShareCreate: vi.fn(),
  auditLeadUpdateMany: vi.fn(),
  transaction: vi.fn(),
}));

vi.mock("../../../../../../lib/admin-auth", () => ({
  validateAdminSession: mocks.validateAdminSession,
}));

vi.mock("../../../../../../lib/csrf", () => ({
  csrfProtection: mocks.csrfProtection,
}));

vi.mock("../../../../../../worker/queue", () => ({
  enqueueJob: mocks.enqueueJob,
}));

vi.mock("../../../../../../lib/funnel-events", () => ({
  recordFunnelEvent: mocks.recordFunnelEvent,
}));

vi.mock("../../../../../../lib/token", () => ({
  createReportToken: () => "share-token",
}));

vi.mock("../../../../../../lib/db", () => ({
  prisma: {
    auditLead: {
      findUnique: mocks.findUnique,
      updateMany: mocks.auditLeadUpdateMany,
    },
    auditRun: {
      create: mocks.auditRunCreate,
      update: mocks.auditRunUpdate,
    },
    reportShare: {
      create: mocks.reportShareCreate,
    },
    job: {
      findFirst: vi.fn(),
    },
    $transaction: mocks.transaction,
  },
}));

describe("POST /api/admin/leads/[id]/start-audit", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    mocks.validateAdminSession.mockResolvedValue(true);
    mocks.csrfProtection.mockResolvedValue({ valid: true });
    mocks.findUnique.mockResolvedValue({
      id: "lead-1",
      runId: null,
      domain: "https://example.com",
      normalizedUrl: "https://example.com/",
      qualifiedAt: null,
      leadSource: "portfolio",
      sourcePlacement: "hero",
      sourceOffer: "request_assessment",
      run: null,
    });
    mocks.auditRunCreate.mockResolvedValue({ id: "run-1", reportStatus: "QUEUED" });
    mocks.reportShareCreate.mockResolvedValue({ token: "share-token" });
    mocks.auditLeadUpdateMany.mockResolvedValue({ count: 1 });
    mocks.enqueueJob.mockResolvedValue({ id: "job-1" });
    mocks.transaction.mockImplementation(async (fn) => fn({
      auditRun: { create: mocks.auditRunCreate },
      reportShare: { create: mocks.reportShareCreate },
      auditLead: { updateMany: mocks.auditLeadUpdateMany },
    }));
  });

  it("rejects missing CSRF tokens", async () => {
    mocks.csrfProtection.mockResolvedValue({ valid: false, error: "CSRF token missing" });
    const { POST } = await import("./route");

    const response = await POST(request(), context());

    expect(response.status).toBe(403);
    expect(mocks.enqueueJob).not.toHaveBeenCalled();
  });

  it("accepts valid CSRF and enqueues one job", async () => {
    const { POST } = await import("./route");

    const response = await POST(request("valid-token"), context());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({ runId: "run-1", token: "share-token" });
    expect(mocks.enqueueJob).toHaveBeenCalledTimes(1);
  });

  it("marks the run failed when enqueue fails", async () => {
    mocks.enqueueJob.mockRejectedValue(new Error("queue down"));
    const { POST } = await import("./route");

    const response = await POST(request("valid-token"), context());
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body).toMatchObject({ error: "QUEUE_ENQUEUE_FAILED", runId: "run-1" });
    expect(mocks.auditRunUpdate).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: "run-1" },
      data: expect.objectContaining({ status: "FAILED", reportStatus: "FAILED", errorCode: "QUEUE_ENQUEUE_FAILED" }),
    }));
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
