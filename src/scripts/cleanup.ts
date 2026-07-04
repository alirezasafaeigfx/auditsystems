import { prisma } from "../lib/db";
import { cleanupExpiredSessions, cleanupStaleJobs } from "../lib/cleanup";

async function main() {
  console.log("Starting cleanup...");

  const sessionsRemoved = await cleanupExpiredSessions();
  console.log(`Expired sessions removed: ${sessionsRemoved}`);

  const jobsRemoved = await cleanupStaleJobs();
  console.log(`Stale jobs removed: ${jobsRemoved}`);

  await prisma.$disconnect();
  console.log("Cleanup complete.");
}

main().catch((error) => {
  console.error("Cleanup failed:", error);
  process.exit(1);
});
