import { AuditDepth, Prisma } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  transaction: vi.fn(),
  createReportToken: vi.fn(() => "share-token"),
}));

vi.mock("./db", () => ({
  prisma: {
    $transaction: mocks.transaction,
  },
}));

vi.mock("./token", () => ({
  createReportToken: mocks.createReportToken,
}));

function auditRun(overrides: Record<string, unknown> = {}) {
  return {
    id: "run-1",
    url: "https://example.com",
    normalizedUrl: "https://example.com/",
    depth: "QUICK",
    status: "QUEUED",
    reportStatus: "QUEUED",
    projectId: null,
    organizationId: null,
    ipHash: null,
    userAgent: null,
    locale: "en",
    startedAt: null,
    finishedAt: null,
    errorCode: null,
    errorMessage: null,
    summary: null,
    lighthouse: null,
    createdAt: new Date("2026-07-30T00:00:00Z"),
    updatedAt: new Date("2026-07-30T00:00:00Z"),
    ...overrides,
  };
}

function reportShare() {
  return {
    id: "share-1",
    runId: "run-1",
    token: "share-token",
    createdAt: new Date("2026-07-30T00:00:00Z"),
    expiresAt: null,
    revokedAt: null,
    viewCount: 0,
    lastViewedAt: null,
    passwordHash: null,
  };
}

function job(payload: Record<string, unknown> = { runId: "run-1" }) {
  return {
    id: "job-1",
    type: "AUDIT_RUN",
    status: "QUEUED",
    payload,
    attempt: 0,
    maxAttempts: 3,
    timeoutMs: 45000,
    availableAt: new Date("2026-07-30T00:00:00Z"),
    lockedAt: null,
    leasedUntil: null,
    workerId: null,
    lastError: null,
    startedAt: null,
    finishedAt: null,
    createdAt: new Date("2026-07-30T00:00:00Z"),
    updatedAt: new Date("2026-07-30T00:00:00Z"),
  };
}

function createTx() {
  return {
    project: { findFirst: vi.fn().mockResolvedValue({ id: "project-1" }) },
    auditRun: {
      findUnique: vi.fn().mockResolvedValue(null),
      count: vi.fn().mockResolvedValue(0),
      create: vi.fn().mockResolvedValue(auditRun({
        projectId: "project-1",
        organizationId: "org-1",
      })),
    },
    reportShare: {
      findFirst: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue(reportShare()),
    },
    auditLead: { updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
    job: {
      findFirst: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockImplementation(
        ({ data }: { data: { payload: Record<string, unknown> } }) => Promise.resolve(job(data.payload)),
      ),
    },
    usageLedger: { create: vi.fn().mockResolvedValue({ id: "usage-1" }) },
  };
}

type Tx = ReturnType<typeof createTx>;
type TransactionCallback = (client: Tx) => unknown;

describe("audit-enqueue", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("creates run, share, lead link, durable job, and usage in one Serializable transaction", async () => {
    const tx = createTx();
    mocks.transaction.mockImplementation(async (callback: TransactionCallback, options?: unknown) => {
      expect(options).toEqual({ isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
      return callback(tx);
    });
    const { enqueueAuditAtomically } = await import("./audit-enqueue");

    const result = await enqueueAuditAtomically({
      url: "https://example.com",
      normalizedUrl: "https://example.com/",
      depth: AuditDepth.QUICK,
      projectId: "project-1",
      organizationId: "org-1",
      locale: "en",
      source: "PROJECT_API",
      idempotencyKey: "v1:PROJECT_API:key",
      auditLimit: 3,
      lead: { id: "lead-1" },
      usage: { type: "AUDIT_RUN", metadata: { projectId: "project-1" } },
      now: new Date("2026-07-30T00:00:00Z"),
    });

    expect(result.reused).toBe(false);
    expect(mocks.transaction).toHaveBeenCalledTimes(1);
    expect(tx.project.findFirst).toHaveBeenCalledWith({
      where: { id: "project-1", organizationId: "org-1" },
      select: { id: true },
    });
    expect(tx.auditRun.count).toHaveBeenCalledTimes(1);
    expect(tx.auditRun.create).toHaveBeenCalledTimes(1);
    expect(tx.reportShare.create).toHaveBeenCalledWith({
      data: { runId: "run-1", token: "share-token" },
    });
    expect(tx.auditLead.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: "lead-1", runId: null },
    }));
    expect(tx.job.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        type: "AUDIT_RUN",
        timeoutMs: 45000,
        payload: expect.objectContaining({
          runId: "run-1",
          source: "PROJECT_API",
          idempotencyKey: "v1:PROJECT_API:key",
          fingerprint: expect.any(String),
        }),
      }),
    });
    expect(tx.usageLedger.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        organizationId: "org-1",
        type: "AUDIT_RUN",
        quantity: 1,
        metadata: expect.objectContaining({ auditRunId: "run-1", source: "PROJECT_API" }),
      }),
    });
  });

  it("reuses a fully committed enqueue and performs no writes", async () => {
    const creationTx = createTx();
    mocks.transaction.mockImplementationOnce(async (callback: TransactionCallback) => callback(creationTx));
    const auditEnqueueModule = await import("./audit-enqueue");
    const input = {
      url: "https://example.com",
      normalizedUrl: "https://example.com/",
      depth: AuditDepth.QUICK,
      ipHash: "ip-hash",
      locale: "en",
      source: "PUBLIC_API" as const,
      idempotencyKey: "v1:PUBLIC_API:key",
    };

    const first = await auditEnqueueModule.enqueueAuditAtomically(input);
    const createdPayload = creationTx.job.create.mock.calls[0][0].data.payload as Record<string, unknown>;

    const replayTx = createTx();
    replayTx.job.findFirst.mockResolvedValue(job(createdPayload));
    replayTx.auditRun.findUnique.mockResolvedValue(first.run);
    replayTx.reportShare.findFirst.mockResolvedValue(first.share);
    mocks.transaction.mockReset();
    mocks.transaction.mockImplementationOnce(async (callback: TransactionCallback) => callback(replayTx));

    const replay = await auditEnqueueModule.enqueueAuditAtomically(input);

    expect(replay.reused).toBe(true);
    expect(replay.run.id).toBe(first.run.id);
    expect(replay.share.token).toBe(first.share.token);
    expect(replayTx.auditRun.create).not.toHaveBeenCalled();
    expect(replayTx.reportShare.create).not.toHaveBeenCalled();
    expect(replayTx.job.create).not.toHaveBeenCalled();
    expect(replayTx.usageLedger.create).not.toHaveBeenCalled();
  });

  it("rejects reuse of the same key for different request material", async () => {
    const tx = createTx();
    tx.job.findFirst.mockResolvedValue(job({
      runId: "run-1",
      source: "PUBLIC_API",
      idempotencyKey: "v1:PUBLIC_API:key",
      fingerprint: "different-fingerprint",
    }));
    mocks.transaction.mockImplementation(async (callback: TransactionCallback) => callback(tx));
    const { enqueueAuditAtomically } = await import("./audit-enqueue");

    await expect(enqueueAuditAtomically({
      url: "https://example.com",
      source: "PUBLIC_API",
      idempotencyKey: "v1:PUBLIC_API:key",
    })).rejects.toMatchObject({ code: "IDEMPOTENCY_KEY_CONFLICT" });

    expect(tx.auditRun.create).not.toHaveBeenCalled();
  });

  it("rejects quota exhaustion before creating any row", async () => {
    const tx = createTx();
    tx.auditRun.count.mockResolvedValue(3);
    mocks.transaction.mockImplementation(async (callback: TransactionCallback) => callback(tx));
    const { enqueueAuditAtomically } = await import("./audit-enqueue");

    await expect(enqueueAuditAtomically({
      url: "https://example.com",
      organizationId: "org-1",
      source: "PROJECT_API",
      auditLimit: 3,
      usage: { type: "AUDIT_RUN" },
    })).rejects.toMatchObject({ code: "AUDIT_LIMIT_REACHED" });

    expect(tx.auditRun.create).not.toHaveBeenCalled();
    expect(tx.job.create).not.toHaveBeenCalled();
    expect(tx.usageLedger.create).not.toHaveBeenCalled();
  });

  it("aborts the transaction when a lead was linked concurrently", async () => {
    const tx = createTx();
    tx.auditLead.updateMany.mockResolvedValue({ count: 0 });
    mocks.transaction.mockImplementation(async (callback: TransactionCallback) => callback(tx));
    const { enqueueAuditAtomically } = await import("./audit-enqueue");

    await expect(enqueueAuditAtomically({
      url: "https://example.com",
      source: "ADMIN_LEAD",
      lead: { id: "lead-1" },
    })).rejects.toMatchObject({ code: "AUDIT_ALREADY_STARTED" });

    expect(tx.auditRun.create).toHaveBeenCalledTimes(1);
    expect(tx.reportShare.create).toHaveBeenCalledTimes(1);
    expect(tx.job.create).not.toHaveBeenCalled();
    expect(tx.usageLedger.create).not.toHaveBeenCalled();
  });

  it("stops immediately when an earlier transactional write fails", async () => {
    const tx = createTx();
    tx.reportShare.create.mockRejectedValue(new Error("share insert failed"));
    mocks.transaction.mockImplementation(async (callback: TransactionCallback) => callback(tx));
    const { enqueueAuditAtomically } = await import("./audit-enqueue");

    await expect(enqueueAuditAtomically({
      url: "https://example.com",
      source: "PUBLIC_API",
    })).rejects.toThrow("share insert failed");

    expect(tx.auditRun.create).toHaveBeenCalledTimes(1);
    expect(tx.job.create).not.toHaveBeenCalled();
    expect(tx.usageLedger.create).not.toHaveBeenCalled();
  });

  it("retries a Serializable conflict and creates usage exactly once", async () => {
    const tx = createTx();
    const serializationError = new Prisma.PrismaClientKnownRequestError("serialization", {
      code: "P2034",
      clientVersion: "test",
    });
    mocks.transaction
      .mockRejectedValueOnce(serializationError)
      .mockImplementationOnce(async (callback: TransactionCallback) => callback(tx));
    const { enqueueAuditAtomically } = await import("./audit-enqueue");

    const result = await enqueueAuditAtomically({
      url: "https://example.com",
      organizationId: "org-1",
      source: "PROJECT_API",
      usage: { type: "AUDIT_RUN" },
    });

    expect(result.reused).toBe(false);
    expect(mocks.transaction).toHaveBeenCalledTimes(2);
    expect(tx.auditRun.create).toHaveBeenCalledTimes(1);
    expect(tx.usageLedger.create).toHaveBeenCalledTimes(1);
  });

  it("derives deterministic keys scoped by source and actor", async () => {
    const { buildAuditIdempotencyKey } = await import("./audit-enqueue");
    const first = buildAuditIdempotencyKey({ source: "PUBLIC_API", scope: "ip-a", rawKey: "request-1" });
    const same = buildAuditIdempotencyKey({ source: "PUBLIC_API", scope: "ip-a", rawKey: "request-1" });
    const otherScope = buildAuditIdempotencyKey({ source: "PUBLIC_API", scope: "ip-b", rawKey: "request-1" });
    const otherSource = buildAuditIdempotencyKey({ source: "PROJECT_API", scope: "ip-a", rawKey: "request-1" });

    expect(first).toBe(same);
    expect(first).not.toBe(otherScope);
    expect(first).not.toBe(otherSource);
    expect(first).toMatch(/^v1:PUBLIC_API:[a-f0-9]{64}$/);
  });
});
