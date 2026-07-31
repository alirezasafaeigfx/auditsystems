import { prisma } from "../lib/db";
import { runDueScheduledAudits } from "../lib/scheduled-audit-runner";

function configuredBatchLimit(): number | undefined {
  const raw = String(process.env.SCHEDULED_AUDIT_BATCH_LIMIT ?? "").trim();
  if (!raw) return undefined;
  const value = Number(raw);
  if (!Number.isInteger(value) || value <= 0 || value > 500) {
    throw new Error("INVALID_SCHEDULE_BATCH_LIMIT");
  }
  return value;
}

async function main(): Promise<void> {
  const summary = await runDueScheduledAudits({
    maxSchedules: configuredBatchLimit(),
  });

  console.log(JSON.stringify({
    event: "scheduled_audit_batch_completed",
    ...summary,
  }));

  if (summary.failed > 0) {
    process.exitCode = 1;
  }
}

main()
  .catch((error) => {
    console.error(JSON.stringify({
      event: "scheduled_audit_batch_crashed",
      error: error instanceof Error ? error.message : String(error),
    }));
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
