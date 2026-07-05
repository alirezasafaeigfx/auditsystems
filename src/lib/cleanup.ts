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

export async function cleanupExpiredTokens(): Promise<number> {
  const result = await prisma.emailVerificationToken.deleteMany({
    where: {
      expiresAt: { lt: new Date() }
    }
  });
  return result.count;
}

export async function cleanupOldUsageLedger(): Promise<number> {
  const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
  const result = await prisma.usageLedger.deleteMany({
    where: {
      createdAt: { lt: cutoff }
    }
  });
  return result.count;
}
