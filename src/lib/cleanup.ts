import { prisma } from "./db";

const CLEANUP_AGE_DAYS = 30;

export async function cleanupExpiredSessions(): Promise<number> {
  const cutoff = new Date(Date.now() - CLEANUP_AGE_DAYS * 24 * 60 * 60 * 1000);
  const result = await prisma.session.deleteMany({
    where: { expiresAt: { lt: cutoff } }
  });
  return result.count;
}

export async function cleanupStaleJobs(): Promise<number> {
  const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const result = await prisma.job.deleteMany({
    where: {
      status: { in: ["SUCCEEDED", "FAILED"] },
      finishedAt: { lt: cutoff }
    }
  });
  return result.count;
}
