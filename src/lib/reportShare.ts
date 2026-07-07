import crypto from "node:crypto";
import { ReportShare } from "@prisma/client";

const EXPIRY_DURATIONS: Record<string, number> = {
  "24h": 24 * 60 * 60 * 1000,
  "7d": 7 * 24 * 60 * 60 * 1000,
  "30d": 30 * 24 * 60 * 60 * 1000,
  "never": 365 * 24 * 60 * 60 * 1000
};

export type ExpiryOption = keyof typeof EXPIRY_DURATIONS;

export function isReportShareAccessible(share: Pick<ReportShare, "revokedAt" | "expiresAt">, now: Date = new Date()): boolean {
  if (share.revokedAt) return false;
  if (share.expiresAt && share.expiresAt < now) return false;
  return true;
}

export function calculateExpiryDate(option: ExpiryOption, from: Date = new Date()): Date {
  const duration = EXPIRY_DURATIONS[option];
  return new Date(from.getTime() + duration);
}

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, passwordHash: string): boolean {
  const [salt, hash] = passwordHash.split(":");
  if (!salt || !hash) return false;
  const hashToVerify = crypto.scryptSync(password, salt, 64).toString("hex");
  return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(hashToVerify));
}

export function hasPassword(share: Pick<ReportShare, "passwordHash">): boolean {
  return share.passwordHash != null && share.passwordHash.length > 0;
}
