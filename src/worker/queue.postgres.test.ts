import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "../lib/db";
import {
  enqueueJob,
  heartbeatJobLease,
  leaseNextJob,
  markJobFailed,
  markJobSucceeded,
  recycleExpiredLeases,
} from "./queue";

const integrationEnabled = process.env.QUEUE_FENCING_INTEGRATION === "true";
const describePostgres = integrationEnabled ? describe : describe.skip;

describePostgres("queue lease fencing — PostgreSQL", () => {
  beforeAll(async () => {
    await prisma.$queryRaw`SELECT 1`;
  });

  afterEach(async () => {
    await prisma.job.deleteMany();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  async function queuedJob(input: { timeoutMs?: number; maxAttempts?: number } = {}) {
    return enqueueJob({
      type: "AUDIT_RUN",
      payload: { runId: `run-${Date.now()}-${Math.random()}` },
      timeoutMs: input.timeoutMs ?? 5_000,
      maxAttempts: input.maxAttempts ?? 3,
    });
  }

  async function expireLease(jobId: string): Promise<void> {
    await prisma.job.update({
      where: { id: jobId },
      data: { leasedUntil: new Date(Date.now() - 1_000) },
    });
  }

  async function makeImmediatelyAvailable(jobId: string): Promise<void> {
    await prisma.job.update({
      where: { id: jobId },
      data: { availableAt: new Date(Date.now() - 1_000) },
    });
  }

  it("leases one queued job to only one concurrent worker", async () => {
    await queuedJob();

    const [first, second] = await Promise.all([
      leaseNextJob("worker-a", 5_000),
      leaseNextJob("worker-b", 5_000),
    ]);
    const leases = [first, second].filter((value) => value !== null);

    expect(leases).toHaveLength(1);
    expect(leases[0]?.attempt).toBe(1);
    expect(["worker-a", "worker-b"]).toContain(leases[0]?.workerId);
    expect(await markJobSucceeded(leases[0]!)).toBe(true);
  });

  it("rejects stale success after expiry, recycle, and re-lease", async () => {
    const created = await queuedJob();
    const firstLease = await leaseNextJob("worker-a", 5_000);
    expect(firstLease?.id).toBe(created.id);

    await expireLease(created.id);
    expect(await recycleExpiredLeases()).toBe(1);
    await makeImmediatelyAvailable(created.id);

    const secondLease = await leaseNextJob("worker-b", 5_000);
    expect(secondLease?.id).toBe(created.id);
    expect(secondLease?.attempt).toBe(2);

    expect(await markJobSucceeded(firstLease!)).toBe(false);
    expect(await markJobSucceeded(secondLease!)).toBe(true);

    const finalJob = await prisma.job.findUniqueOrThrow({ where: { id: created.id } });
    expect(finalJob.status).toBe("SUCCEEDED");
    expect(finalJob.workerId).toBe("worker-b");
    expect(finalJob.attempt).toBe(2);
  });

  it("rejects stale failure after another worker owns the next attempt", async () => {
    const created = await queuedJob();
    const firstLease = await leaseNextJob("worker-a", 5_000);
    await expireLease(created.id);
    expect(await recycleExpiredLeases()).toBe(1);
    await makeImmediatelyAvailable(created.id);
    const secondLease = await leaseNextJob("worker-b", 5_000);

    expect(await markJobFailed(firstLease!, new Error("stale worker failure"))).toBe(false);
    expect(await markJobSucceeded(secondLease!)).toBe(true);

    const finalJob = await prisma.job.findUniqueOrThrow({ where: { id: created.id } });
    expect(finalJob.status).toBe("SUCCEEDED");
    expect(finalJob.workerId).toBe("worker-b");
    expect(finalJob.attempt).toBe(2);
    expect(finalJob.lastError).toBeNull();
  });

  it("extends a live lease and prevents recycle", async () => {
    const created = await queuedJob({ timeoutMs: 2_000 });
    const lease = await leaseNextJob("worker-a", 2_000);
    const before = lease!.leasedUntil.getTime();

    expect(await heartbeatJobLease(lease!, 10_000)).toBe(true);
    const extended = await prisma.job.findUniqueOrThrow({ where: { id: created.id } });
    expect(extended.leasedUntil!.getTime()).toBeGreaterThan(before);
    expect(await recycleExpiredLeases()).toBe(0);
    expect(await markJobSucceeded(lease!)).toBe(true);
  });

  it("does not revive an already expired lease", async () => {
    const created = await queuedJob();
    const lease = await leaseNextJob("worker-a", 5_000);
    await expireLease(created.id);

    expect(await heartbeatJobLease(lease!, 10_000)).toBe(false);
    expect(await markJobSucceeded(lease!)).toBe(false);
    expect(await recycleExpiredLeases()).toBe(1);

    const recycled = await prisma.job.findUniqueOrThrow({ where: { id: created.id } });
    expect(recycled.status).toBe("QUEUED");
    expect(recycled.workerId).toBeNull();
    expect(recycled.leasedUntil).toBeNull();
  });

  it("marks the final owned attempt failed and never recycles terminal jobs", async () => {
    const created = await queuedJob({ maxAttempts: 1 });
    const lease = await leaseNextJob("worker-a", 5_000);

    expect(await markJobFailed(lease!, new Error("terminal failure"))).toBe(true);
    expect(await recycleExpiredLeases()).toBe(0);

    const finalJob = await prisma.job.findUniqueOrThrow({ where: { id: created.id } });
    expect(finalJob.status).toBe("FAILED");
    expect(finalJob.lastError).toBe("terminal failure");
    expect(finalJob.finishedAt).not.toBeNull();
  });
});
