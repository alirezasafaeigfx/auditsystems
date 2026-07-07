import crypto from "node:crypto";
import { prisma } from "./db";

const REFERRAL_CODE_LENGTH = 8;

export function generateReferralCode(userId: string): string {
  const suffix = crypto.randomBytes(4).toString("hex").toUpperCase().slice(0, REFERRAL_CODE_LENGTH);
  const prefix = userId.slice(-4).toUpperCase();
  return `${prefix}${suffix}`;
}

export function validateReferralCode(code: string): boolean {
  if (typeof code !== "string") return false;
  const trimmed = code.trim().toUpperCase();
  return trimmed.length >= 6 && trimmed.length <= 20 && /^[A-Z0-9]+$/.test(trimmed);
}

export async function ensureReferralCode(userId: string): Promise<string> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { referralCode: true } });
  if (user?.referralCode) return user.referralCode;

  let code = generateReferralCode(userId);
  let attempts = 0;
  while (attempts < 5) {
    try {
      await prisma.user.update({ where: { id: userId }, data: { referralCode: code } });
      return code;
    } catch {
      code = generateReferralCode(userId);
      attempts++;
    }
  }
  return code;
}

export async function getReferralStats(userId: string) {
  const referrals = await prisma.referral.findMany({
    where: { referrerId: userId },
    select: { id: true, convertedAt: true, createdAt: true }
  });

  return {
    totalReferrals: referrals.length,
    conversions: referrals.filter((r) => r.convertedAt !== null).length,
    referralCode: (await prisma.user.findUnique({ where: { id: userId }, select: { referralCode: true } }))?.referralCode ?? null
  };
}

export async function trackReferral(referralCode: string, referredUserId: string) {
  const normalizedCode = referralCode.trim().toUpperCase();
  if (!validateReferralCode(normalizedCode)) return null;

  const referrer = await prisma.user.findFirst({
    where: { referralCode: normalizedCode },
    select: { id: true }
  });
  if (!referrer) return null;
  if (referrer.id === referredUserId) return null;

  const existing = await prisma.referral.findUnique({
    where: { referrerId_referredId: { referrerId: referrer.id, referredId: referredUserId } }
  });
  if (existing) return existing;

  return prisma.referral.create({
    data: {
      referrerId: referrer.id,
      referredId: referredUserId,
      code: normalizedCode
    }
  });
}

export async function markReferralConverted(userId: string) {
  const referral = await prisma.referral.findFirst({
    where: { referredId: userId, convertedAt: null }
  });
  if (!referral) return null;

  return prisma.referral.update({
    where: { id: referral.id },
    data: { convertedAt: new Date() }
  });
}
