import crypto from "node:crypto";
import { ReportShare } from "@prisma/client";

const EXPIRY_DURATIONS: Record<string, number> = {
  "24h": 24 * 60 * 60 * 1000,
  "7d": 7 * 24 * 60 * 60 * 1000,
  "30d": 30 * 24 * 60 * 60 * 1000,
  "never": 365 * 24 * 60 * 60 * 1000,
};

export const REPORT_SHARE_PASSWORD_MAX_LENGTH = 256;
const PASSWORD_SALT_HEX = /^[a-f0-9]{32}$/i;
const PASSWORD_HASH_HEX = /^[a-f0-9]{128}$/i;

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

function derivePasswordKey(password: string, salt: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    crypto.scrypt(password, salt, 64, (error, key) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(key);
    });
  });
}

export async function verifyPassword(password: string, passwordHash: string): Promise<boolean> {
  if (!password || password.length > REPORT_SHARE_PASSWORD_MAX_LENGTH) return false;

  const [salt, hash, ...extra] = passwordHash.split(":");
  if (
    !salt
    || !hash
    || extra.length > 0
    || !PASSWORD_SALT_HEX.test(salt)
    || !PASSWORD_HASH_HEX.test(hash)
  ) {
    return false;
  }

  const expected = Buffer.from(hash, "hex");
  try {
    const actual = await derivePasswordKey(password, salt);
    return actual.length === expected.length && crypto.timingSafeEqual(expected, actual);
  } catch {
    return false;
  }
}

export function hasPassword(share: Pick<ReportShare, "passwordHash">): boolean {
  return share.passwordHash != null && share.passwordHash.length > 0;
}
