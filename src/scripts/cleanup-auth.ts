import { prisma } from "../lib/db";
import { cleanupExpiredSessions, cleanupStaleJobs, cleanupExpiredTokens } from "../lib/cleanup";

async function main() {
  console.log("Starting auth & session cleanup...");

  const sessionsRemoved = await cleanupExpiredSessions();
  console.log(`Expired sessions removed: ${sessionsRemoved}`);

  const tokensRemoved = await cleanupExpiredTokens();
  console.log(`Expired verification tokens removed: ${tokensRemoved}`);

  const jobsRemoved = await cleanupStaleJobs();
  console.log(`Stale jobs removed: ${jobsRemoved}`);

  await prisma.$disconnect();
  console.log("Cleanup complete.");
}

main().catch(async (error) => {
  console.error("Cleanup failed:", error);
  await prisma.$disconnect();
  process.exit(1);
});
