import { Job, JobType, Prisma } from "@prisma/client";
import { prisma } from "../lib/db";

export type LeasedJob = Job & {
  workerId: string;
  leasedUntil: Date;
};

const MAX_ERROR_MESSAGE_LENGTH = 8_000;

function positiveInteger(value: number, code: string): number {
  if (!Number.isInteger(value) || value <= 0) throw new Error(code);
  return value;
}

function leaseIdentity(job: Pick<Job, "id" | "workerId" | "attempt">): {
  id: string;
  workerId: string;
  attempt: number;
} {
  if (!job.workerId || !Number.isInteger(job.attempt) || job.attempt <= 0) {
    throw new Error("INVALID_JOB_LEASE_IDENTITY");
  }
  return { id: job.id, workerId: job.workerId, attempt: job.attempt };
}

function boundedErrorMessage(error: unknown): string {
  const value = error instanceof Error ? error.message : String(error);
  return value.length > MAX_ERROR_MESSAGE_LENGTH
    ? `${value.slice(0, MAX_ERROR_MESSAGE_LENGTH - 3)}...`
    : value;
}

export async function enqueueJob(input: {
  type: JobType;
  payload: Prisma.InputJsonValue;
  maxAttempts?: number;
  timeoutMs?: number;
}): Promise<Job> {
  return prisma.job.create({
    data: {
      type: input.type,
      payload: input.payload,
      maxAttempts: input.maxAttempts ?? 3,
      timeoutMs: input.timeoutMs ?? 45000
    }
  });
}

export async function recycleExpiredLeases(): Promise<number> {
  return prisma.$executeRaw`
    UPDATE "Job"
    SET status = 'QUEUED'::"JobStatus",
        "availableAt" = NOW() + INTERVAL '5 seconds',
        "lockedAt" = NULL,
        "leasedUntil" = NULL,
        "workerId" = NULL,
        "lastError" = 'Job lease expired and was re-queued',
        "updatedAt" = NOW()
    WHERE status = 'RUNNING'::"JobStatus"
      AND "leasedUntil" IS NOT NULL
      AND "leasedUntil" <= NOW()
  `;
}

export async function leaseNextJob(workerId: string, fallbackTimeoutMs: number): Promise<LeasedJob | null> {
  const normalizedWorkerId = workerId.trim();
  if (!normalizedWorkerId) throw new Error("INVALID_WORKER_ID");
  positiveInteger(fallbackTimeoutMs, "INVALID_FALLBACK_TIMEOUT");

  const rows = await prisma.$queryRaw<LeasedJob[]>`
WITH candidate AS (
  SELECT j.id
  FROM "Job" j
  WHERE j.status = 'QUEUED'::"JobStatus"
    AND j."availableAt" <= NOW()
  ORDER BY j."availableAt" ASC, j."createdAt" ASC
  FOR UPDATE SKIP LOCKED
  LIMIT 1
)
UPDATE "Job" j
SET status = 'RUNNING'::"JobStatus",
    "attempt" = j."attempt" + 1,
    "startedAt" = COALESCE(j."startedAt", NOW()),
    "lockedAt" = NOW(),
    "leasedUntil" = NOW() + (COALESCE(NULLIF(j."timeoutMs", 0), ${fallbackTimeoutMs}) * INTERVAL '1 millisecond'),
    "workerId" = ${normalizedWorkerId},
    "updatedAt" = NOW()
FROM candidate c
WHERE j.id = c.id
RETURNING j.*;
`;

  const job = rows[0] ?? null;
  if (!job) return null;
  if (!job.workerId || !job.leasedUntil) throw new Error("LEASE_ACQUISITION_INVARIANT_FAILED");
  return job;
}

export async function heartbeatJobLease(
  job: Pick<Job, "id" | "workerId" | "attempt">,
  extensionMs: number,
): Promise<boolean> {
  const lease = leaseIdentity(job);
  positiveInteger(extensionMs, "INVALID_LEASE_EXTENSION");

  const rows = await prisma.$queryRaw<Array<{ id: string }>>`
    UPDATE "Job"
    SET "leasedUntil" = NOW() + (${extensionMs} * INTERVAL '1 millisecond'),
        "updatedAt" = NOW()
    WHERE id = ${lease.id}
      AND status = 'RUNNING'::"JobStatus"
      AND "workerId" = ${lease.workerId}
      AND "attempt" = ${lease.attempt}
      AND "leasedUntil" IS NOT NULL
      AND "leasedUntil" > NOW()
    RETURNING id
  `;

  return rows.length === 1;
}

export async function markJobSucceeded(
  job: Pick<Job, "id" | "workerId" | "attempt">,
): Promise<boolean> {
  const lease = leaseIdentity(job);
  const rows = await prisma.$queryRaw<Array<{ id: string }>>`
    UPDATE "Job"
    SET status = 'SUCCEEDED'::"JobStatus",
        "leasedUntil" = NULL,
        "finishedAt" = NOW(),
        "lastError" = NULL,
        "updatedAt" = NOW()
    WHERE id = ${lease.id}
      AND status = 'RUNNING'::"JobStatus"
      AND "workerId" = ${lease.workerId}
      AND "attempt" = ${lease.attempt}
      AND "leasedUntil" IS NOT NULL
      AND "leasedUntil" > NOW()
    RETURNING id
  `;
  return rows.length === 1;
}

function nextBackoffMs(attempt: number): number {
  return Math.min(60000, 5000 * 2 ** Math.max(0, attempt - 1));
}

export async function markJobFailed(job: Job, error: unknown): Promise<boolean> {
  const lease = leaseIdentity(job);
  const errorMessage = boundedErrorMessage(error);
  const shouldRetry = job.attempt < job.maxAttempts;

  const rows = shouldRetry
    ? await prisma.$queryRaw<Array<{ id: string }>>`
        UPDATE "Job"
        SET status = 'QUEUED'::"JobStatus",
            "availableAt" = NOW() + (${nextBackoffMs(job.attempt)} * INTERVAL '1 millisecond'),
            "leasedUntil" = NULL,
            "lockedAt" = NULL,
            "workerId" = NULL,
            "lastError" = ${errorMessage},
            "updatedAt" = NOW()
        WHERE id = ${lease.id}
          AND status = 'RUNNING'::"JobStatus"
          AND "workerId" = ${lease.workerId}
          AND "attempt" = ${lease.attempt}
          AND "leasedUntil" IS NOT NULL
          AND "leasedUntil" > NOW()
        RETURNING id
      `
    : await prisma.$queryRaw<Array<{ id: string }>>`
        UPDATE "Job"
        SET status = 'FAILED'::"JobStatus",
            "leasedUntil" = NULL,
            "finishedAt" = NOW(),
            "lastError" = ${errorMessage},
            "updatedAt" = NOW()
        WHERE id = ${lease.id}
          AND status = 'RUNNING'::"JobStatus"
          AND "workerId" = ${lease.workerId}
          AND "attempt" = ${lease.attempt}
          AND "leasedUntil" IS NOT NULL
          AND "leasedUntil" > NOW()
        RETURNING id
      `;

  return rows.length === 1;
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
