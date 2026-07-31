import { Prisma } from "@prisma/client";
import { prisma } from "./db";
import { DEFAULT_PLAN } from "./plans";
import {
  AuditEnqueueError,
  buildAuditIdempotencyKey,
  enqueueAuditInTransaction,
} from "./audit-enqueue";
import { nextScheduledRun } from "./schedule-time";

const DEFAULT_MAX_SCHEDULES = 100;
const MAX_ERROR_LENGTH = 2_000;
const MAX_TRANSACTION_RETRIES = 3;

type ClaimedSchedule = {
  id: string;
  organizationId: string;
  projectId: string;
  frequency: string;
  nextRunAt: Date;
  createdAt: Date;
  normalizedUrl: string | null;
  domain: string;
};

export type ScheduledAuditResult =
  | { kind: "none" }
  | { kind: "enqueued"; scheduleId: string; runId: string; reused: boolean }
  | { kind: "disabled"; scheduleId: string; planCode: string }
  | { kind: "overlap"; scheduleId: string; activeRunId: string }
  | { kind: "quota"; scheduleId: string; planCode: string }
  | { kind: "failed"; scheduleId: string; code: string; consecutiveFailures: number };

export type ScheduledAuditSummary = {
  checkedAt: string;
  processed: number;
  enqueued: number;
  reused: number;
  disabled: number;
  overlaps: number;
  quotaSkipped: number;
  failed: number;
  results: Exclude<ScheduledAuditResult, { kind: "none" }>[];
};

function boundedError(value: unknown): string {
  const message = value instanceof Error ? value.message : String(value);
  return message.length > MAX_ERROR_LENGTH
    ? `${message.slice(0, MAX_ERROR_LENGTH - 3)}...`
    : message;
}

function positiveLimit(value: number | undefined): number {
  if (value === undefined) return DEFAULT_MAX_SCHEDULES;
  if (!Number.isInteger(value) || value <= 0 || value > 500) {
    throw new Error("INVALID_SCHEDULE_BATCH_LIMIT");
  }
  return value;
}

function jsonDetails(value: Record<string, unknown>): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function isRetryableTransactionError(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034";
}

async function claimOne(
  tx: Prisma.TransactionClient,
  now: Date,
  excludedIds: string[],
): Promise<ClaimedSchedule | null> {
  const exclusion = excludedIds.length > 0
    ? Prisma.sql`AND s.id NOT IN (${Prisma.join(excludedIds)})`
    : Prisma.empty;

  const rows = await tx.$queryRaw<ClaimedSchedule[]>(Prisma.sql`
    SELECT
      s.id,
      s."organizationId",
      s."projectId",
      s.frequency,
      s."nextRunAt",
      s."createdAt",
      p."normalizedUrl",
      p.domain
    FROM "ScheduledAudit" s
    INNER JOIN "Project" p ON p.id = s."projectId"
    WHERE s.enabled = TRUE
      AND s."nextRunAt" <= ${now}
      ${exclusion}
    ORDER BY s."nextRunAt" ASC, s."createdAt" ASC
    FOR UPDATE OF s SKIP LOCKED
    LIMIT 1
  `);

  return rows[0] ?? null;
}

async function consecutiveFailureCount(
  tx: Prisma.TransactionClient,
  schedule: ClaimedSchedule,
): Promise<number> {
  const lastSuccess = await tx.billingEvent.findFirst({
    where: {
      organizationId: schedule.organizationId,
      entityType: "SCHEDULED_AUDIT",
      entityId: schedule.id,
      eventType: "SCHEDULE_ENQUEUED",
    },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
  });

  return tx.billingEvent.count({
    where: {
      organizationId: schedule.organizationId,
      entityType: "SCHEDULED_AUDIT",
      entityId: schedule.id,
      eventType: "SCHEDULE_PROCESSING_FAILED",
      ...(lastSuccess ? { createdAt: { gt: lastSuccess.createdAt } } : {}),
    },
  });
}

async function recordProcessingFailure(
  schedule: ClaimedSchedule,
  now: Date,
  error: unknown,
): Promise<ScheduledAuditResult> {
  return prisma.$transaction(async (tx) => {
    const priorFailures = await consecutiveFailureCount(tx, schedule);
    const consecutiveFailures = priorFailures + 1;
    const code = error instanceof AuditEnqueueError
      ? error.code
      : "SCHEDULE_PROCESSING_FAILED";

    await tx.billingEvent.create({
      data: {
        organizationId: schedule.organizationId,
        entityType: "SCHEDULED_AUDIT",
        entityId: schedule.id,
        eventType: "SCHEDULE_PROCESSING_FAILED",
        actor: "scheduler",
        details: jsonDetails({
          code,
          error: boundedError(error),
          consecutiveFailures,
          occurrence: schedule.nextRunAt.toISOString(),
          attemptedAt: now.toISOString(),
        }),
      },
    });

    return { kind: "failed", scheduleId: schedule.id, code, consecutiveFailures } as const;
  });
}

async function processOne(
  now: Date,
  excludedIds: string[],
): Promise<ScheduledAuditResult> {
  let lastClaimed: ClaimedSchedule | null = null;

  for (let attempt = 1; attempt <= MAX_TRANSACTION_RETRIES; attempt += 1) {
    lastClaimed = null;
    try {
      return await prisma.$transaction(async (tx) => {
        const schedule = await claimOne(tx, now, excludedIds);
        if (!schedule) return { kind: "none" } as const;
        lastClaimed = schedule;

        const subscription = await tx.subscription.findFirst({
          where: {
            organizationId: schedule.organizationId,
            status: "ACTIVE",
            currentPeriodEnd: { gt: now },
          },
          include: { plan: true },
          orderBy: { createdAt: "desc" },
        });
        const plan = subscription?.plan ?? DEFAULT_PLAN;

        if (!plan.scheduledAudits) {
          await tx.scheduledAudit.update({
            where: { id: schedule.id },
            data: { enabled: false },
          });
          await tx.billingEvent.create({
            data: {
              organizationId: schedule.organizationId,
              entityType: "SCHEDULED_AUDIT",
              entityId: schedule.id,
              eventType: "SCHEDULE_DISABLED_ENTITLEMENT",
              actor: "scheduler",
              details: jsonDetails({ planCode: plan.code, checkedAt: now.toISOString() }),
            },
          });
          return { kind: "disabled", scheduleId: schedule.id, planCode: plan.code } as const;
        }

        const activeRun = await tx.auditRun.findFirst({
          where: {
            projectId: schedule.projectId,
            organizationId: schedule.organizationId,
            status: { in: ["QUEUED", "RUNNING"] },
          },
          orderBy: { createdAt: "desc" },
          select: { id: true },
        });
        if (activeRun) {
          await tx.billingEvent.create({
            data: {
              organizationId: schedule.organizationId,
              entityType: "SCHEDULED_AUDIT",
              entityId: schedule.id,
              eventType: "SCHEDULE_OVERLAP_SKIPPED",
              actor: "scheduler",
              details: jsonDetails({ activeRunId: activeRun.id, checkedAt: now.toISOString() }),
            },
          });
          return { kind: "overlap", scheduleId: schedule.id, activeRunId: activeRun.id } as const;
        }

        const occurrence = schedule.nextRunAt.toISOString();
        const nextRunAt = nextScheduledRun({
          frequency: schedule.frequency,
          currentDueAt: schedule.nextRunAt,
          anchorAt: schedule.createdAt,
        });
        const idempotencyKey = buildAuditIdempotencyKey({
          source: "SCHEDULED_AUDIT",
          scope: schedule.id,
          rawKey: occurrence,
        });

        let queued;
        try {
          queued = await enqueueAuditInTransaction(tx, {
            url: schedule.normalizedUrl || `https://${schedule.domain}`,
            normalizedUrl: schedule.normalizedUrl,
            depth: "QUICK",
            projectId: schedule.projectId,
            organizationId: schedule.organizationId,
            locale: "fa",
            source: "SCHEDULED_AUDIT",
            idempotencyKey,
            auditLimit: plan.monthlyAuditLimit,
            usage: {
              type: "SCHEDULED_AUDIT",
              metadata: {
                projectId: schedule.projectId,
                scheduleId: schedule.id,
                occurrence,
              },
            },
            now,
          });
        } catch (error) {
          if (!(error instanceof AuditEnqueueError) || error.code !== "AUDIT_LIMIT_REACHED") {
            throw error;
          }
          await tx.billingEvent.create({
            data: {
              organizationId: schedule.organizationId,
              entityType: "SCHEDULED_AUDIT",
              entityId: schedule.id,
              eventType: "SCHEDULE_QUOTA_SKIPPED",
              actor: "scheduler",
              details: jsonDetails({
                planCode: plan.code,
                occurrence,
                checkedAt: now.toISOString(),
              }),
            },
          });
          return { kind: "quota", scheduleId: schedule.id, planCode: plan.code } as const;
        }

        await tx.scheduledAudit.update({
          where: { id: schedule.id },
          data: { lastRunAt: now, nextRunAt },
        });
        await tx.billingEvent.create({
          data: {
            organizationId: schedule.organizationId,
            entityType: "SCHEDULED_AUDIT",
            entityId: schedule.id,
            eventType: "SCHEDULE_ENQUEUED",
            actor: "scheduler",
            details: jsonDetails({
              runId: queued.run.id,
              reused: queued.reused,
              occurrence,
              nextRunAt: nextRunAt.toISOString(),
            }),
          },
        });

        return {
          kind: "enqueued",
          scheduleId: schedule.id,
          runId: queued.run.id,
          reused: queued.reused,
        } as const;
      }, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        maxWait: 5_000,
        timeout: 30_000,
      });
    } catch (error) {
      if (isRetryableTransactionError(error) && attempt < MAX_TRANSACTION_RETRIES) {
        continue;
      }
      if (!lastClaimed) throw error;
      return recordProcessingFailure(lastClaimed, now, error);
    }
  }

  throw new Error("SCHEDULE_TRANSACTION_RETRY_EXHAUSTED");
}

export async function runDueScheduledAudits(input: {
  now?: Date;
  maxSchedules?: number;
} = {}): Promise<ScheduledAuditSummary> {
  const now = input.now ?? new Date();
  const maxSchedules = positiveLimit(input.maxSchedules);
  const excludedIds: string[] = [];
  const results: Exclude<ScheduledAuditResult, { kind: "none" }>[] = [];

  for (let index = 0; index < maxSchedules; index += 1) {
    const result = await processOne(now, excludedIds);
    if (result.kind === "none") break;
    excludedIds.push(result.scheduleId);
    results.push(result);
  }

  return {
    checkedAt: now.toISOString(),
    processed: results.length,
    enqueued: results.filter((result) => result.kind === "enqueued").length,
    reused: results.filter((result) => result.kind === "enqueued" && result.reused).length,
    disabled: results.filter((result) => result.kind === "disabled").length,
    overlaps: results.filter((result) => result.kind === "overlap").length,
    quotaSkipped: results.filter((result) => result.kind === "quota").length,
    failed: results.filter((result) => result.kind === "failed").length,
    results,
  };
}
