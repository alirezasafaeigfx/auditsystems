import { prisma } from "../lib/db";
import { createReportToken } from "../lib/token";
import { enqueueJob } from "../worker/queue";

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
      const url = schedule.project.normalizedUrl || `https://${schedule.project.domain}`;

      const run = await prisma.auditRun.create({
        data: {
          url,
          normalizedUrl: schedule.project.normalizedUrl,
          depth: "QUICK",
          status: "QUEUED",
          projectId: schedule.projectId,
          organizationId: schedule.organizationId,
          locale: "fa"
        }
      });

      await prisma.reportShare.create({
        data: {
          runId: run.id,
          token: createReportToken()
        }
      });

      await enqueueJob({
        type: "AUDIT_RUN",
        payload: { runId: run.id }
      });

      await prisma.scheduledAudit.update({
        where: { id: schedule.id },
        data: {
          lastRunAt: now,
          nextRunAt: schedule.frequency === "WEEKLY"
            ? new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
            : new Date(now.getFullYear(), now.getMonth() + 1, now.getDate())
        }
      });

      console.log(`  Enqueued audit for project ${schedule.projectId} (${url})`);
    } catch (error) {
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
