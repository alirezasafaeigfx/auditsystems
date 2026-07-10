import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  validateAdminSession: vi.fn(),
  csrfProtection: vi.fn(),
  enqueueJob: vi.fn(),
  recordFunnelEvent: vi.fn(),
  findUnique: vi.fn(),
  jobFindFirst: vi.fn(),
  auditRunUpdateMany: vi.fn(),
  auditRunUpdate: vi.fn(),
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

vi.mock("../../../../../../lib/db", () => ({
  prisma: {
    auditLead: { findUnique: mocks.findUnique },
    job: { findFirst: mocks.jobFindFirst },
    auditRun: {
      updateMany: mocks.auditRunUpdateMany,
      update: mocks.auditRunUpdate,
    },
  },
}));

describe("POST /api/admin/leads/[id]/retry-audit", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    mocks.validateAdminSession.mockResolvedValue(true);
    mocks.csrfProtection.mockResolvedValue({ valid: true });
    mocks.findUnique.mockResolvedValue({ id: "lead-1", runId: "run-1", run: { id: "run-1", status: "FAILED", reportStatus: "FAILED" } });
    mocks.jobFindFirst.mockResolvedValue(null);
    mocks.auditRunUpdateMany.mockResolvedValue({ count: 1 });
    mocks.enqueueJob.mockResolvedValue({ id: "job-1" });
  });

  it("rejects invalid CSRF tokens", async () => {
    mocks.csrfProtection.mockResolvedValue({ valid: false, error: "CSRF token invalid or expired" });
    const { POST } = await import("./route");

    const response = await POST(request("bad-token"), context());

    expect(response.status).toBe(403);
    expect(mocks.enqueueJob).not.toHaveBeenCalled();
  });

  it("reuses an active job instead of creating a duplicate", async () => {
    mocks.jobFindFirst.mockResolvedValue({ id: "job-existing" });
    const { POST } = await import("./route");

    const response = await POST(request("valid-token"), context());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({ runId: "run-1", jobId: "job-existing", reused: true });
    expect(mocks.enqueueJob).not.toHaveBeenCalled();
  });

  it("marks the run failed when retry enqueue fails", async () => {
    mocks.enqueueJob.mockRejectedValue(new Error("queue down"));
    const { POST } = await import("./route");

    const response = await POST(request("valid-token"), context());

    expect(response.status).toBe(500);
    expect(mocks.auditRunUpdate).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: "run-1" },
      data: expect.objectContaining({ status: "FAILED", reportStatus: "FAILED", errorCode: "QUEUE_ENQUEUE_FAILED" }),
    }));
  });
});

function request(csrf = ""): NextRequest {
  return new NextRequest("https://audit.test/api/admin/leads/lead-1/retry-audit", {
    method: "POST",
    headers: csrf ? { "x-csrf-token": csrf } : {},
  });
}

function context() {
  return { params: Promise.resolve({ id: "lead-1" }) };
}
