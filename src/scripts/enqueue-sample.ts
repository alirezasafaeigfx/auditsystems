import { prisma } from "../lib/db";
import { enqueueAuditAtomically } from "../lib/audit-enqueue";

async function main(): Promise<void> {
  const queued = await enqueueAuditAtomically({
    url: "https://example.com",
    depth: "QUICK",
    source: "SAMPLE_SCRIPT",
    locale: "en",
  });

  console.log(JSON.stringify({
    runId: queued.run.id,
    token: queued.share.token,
    jobId: queued.job.id,
    reused: queued.reused,
  }, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
