import crypto from "node:crypto";
import { prisma } from "./db";

const TOKEN_EXPIRY_HOURS = 24;

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function createEmailVerificationToken(userId: string): Promise<string> {
  await prisma.emailVerificationToken.deleteMany({
    where: {
      userId,
      usedAt: null,
      expiresAt: { gt: new Date() }
    }
  });

  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + TOKEN_EXPIRY_HOURS * 60 * 60 * 1000);

  await prisma.emailVerificationToken.create({
    data: {
      userId,
      tokenHash,
      expiresAt
    }
  });

  return rawToken;
}

export async function verifyEmailToken(token: string): Promise<{ valid: boolean; userId?: string; reason?: string }> {
  const tokenHash = hashToken(token);

  const record = await prisma.emailVerificationToken.findUnique({
    where: { tokenHash }
  });

  if (!record) {
    return { valid: false, reason: "TOKEN_NOT_FOUND" };
  }

  if (record.usedAt) {
    return { valid: false, reason: "TOKEN_ALREADY_USED" };
  }

  if (record.expiresAt < new Date()) {
    return { valid: false, reason: "TOKEN_EXPIRED" };
  }

  await prisma.$transaction([
    prisma.emailVerificationToken.update({
      where: { id: record.id },
      data: { usedAt: new Date() }
    }),
    prisma.user.update({
      where: { id: record.userId },
      data: { emailVerifiedAt: new Date() }
    })
  ]);

  return { valid: true, userId: record.userId };
}

export async function cleanupExpiredTokens(): Promise<number> {
  const result = await prisma.emailVerificationToken.deleteMany({
    where: {
      expiresAt: { lt: new Date() }
    }
  });
  return result.count;
}
