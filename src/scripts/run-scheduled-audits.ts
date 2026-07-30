import { prisma } from "../lib/db";
import {
  AuditEnqueueError,
  buildAuditIdempotencyKey,
  enqueueAuditAtomically,
} from "../lib/audit-enqueue";
import { getCurrentPlan } from "../lib/usage";

function getNextRunAt(now: Date, frequency: string): Date {
  if (frequency === "WEEKLY") {
    return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  }
  return new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());
}

async function runScheduledAudits() {
  console.log("Checking for due scheduled audits...");

  const now = new Date();
  const dueSchedules = await prisma.scheduledAudit.findMany({
    where: {
      enabled: true,
      nextRunAt: { lte: now }
    },
    include: {
      project: { select: { id: true, normalizedUrl: true, domain: true } },
      organization: { select: { id: true } }
    }
  });

  if (dueSchedules.length === 0) {
    console.log("No scheduled audits due.");
    return;
  }

  console.log(`Found ${dueSchedules.length} due scheduled audit(s).`);

  for (const schedule of dueSchedules) {
    try {
      const plan = await getCurrentPlan(schedule.organizationId);
      if (!plan.scheduledAudits) {
        console.warn(`  Skipped schedule ${schedule.id}: plan ${plan.code} does not allow scheduled audits.`);
        continue;
      }

      const url = schedule.project.normalizedUrl || `https://${schedule.project.domain}`;
      const occurrence = schedule.nextRunAt.toISOString();
      const idempotencyKey = buildAuditIdempotencyKey({
        source: "SCHEDULED_AUDIT",
        scope: schedule.id,
        rawKey: occurrence,
      });

      const queued = await enqueueAuditAtomically({
        url,
        normalizedUrl: schedule.project.normalizedUrl,
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

      await prisma.scheduledAudit.update({
        where: { id: schedule.id },
        data: {
          lastRunAt: now,
          nextRunAt: getNextRunAt(now, schedule.frequency),
        }
      });

      console.log(`  ${queued.reused ? "Recovered" : "Enqueued"} audit ${queued.run.id} for project ${schedule.projectId} (${url})`);
    } catch (error) {
      if (error instanceof AuditEnqueueError && error.code === "AUDIT_LIMIT_REACHED") {
        console.warn(`  Skipped schedule ${schedule.id}: monthly audit limit reached.`);
        continue;
      }
      console.error(`  Failed to enqueue audit for schedule ${schedule.id}:`, error);
    }
  }

  console.log("Scheduled audit run complete.");
}

runScheduledAudits()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error("Scheduled audit runner failed:", error);
    await prisma.$disconnect();
    process.exit(1);
  });
