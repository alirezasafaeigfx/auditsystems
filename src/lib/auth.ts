import crypto from "node:crypto";
import { cookies } from "next/headers";
import { prisma } from "./db";

const SESSION_COOKIE = "saas_session";
const SESSION_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const SESSION_SECRET = process.env.SESSION_SECRET || "";

function requireSessionSecret(): string {
  if (!SESSION_SECRET) {
    throw new Error("SESSION_SECRET environment variable is required but not set");
  }
  return SESSION_SECRET;
}

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, passwordHash: string): boolean {
  const [salt, hash] = passwordHash.split(":");
  if (!salt || !hash) return false;
  const computed = crypto.scryptSync(password, salt, 64).toString("hex");
  return crypto.timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(computed, "hex"));
}

function signToken(token: string): string {
  const secret = requireSessionSecret();
  return crypto.createHmac("sha256", secret).update(token).digest("hex");
}

function generateSessionToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

export type SessionUser = {
  id: string;
  email: string;
  name: string | null;
};

export async function createSession(userId: string): Promise<string> {
  const token = generateSessionToken();
  const expiresAt = new Date(Date.now() + SESSION_MAX_AGE_MS);

  await prisma.session.create({
    data: { userId, token, expiresAt }
  });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, `${token}:${signToken(token)}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: Math.floor(SESSION_MAX_AGE_MS / 1000),
    path: "/"
  });

  return token;
}

export async function validateSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const cookie = cookieStore.get(SESSION_COOKIE);
  if (!cookie?.value) return null;

  const parts = cookie.value.split(":");
  if (parts.length !== 2) return null;

  const [token, sig] = parts;
  const expected = signToken(token);

  if (Buffer.byteLength(sig) !== Buffer.byteLength(expected)) return null;
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;

  const session = await prisma.session.findUnique({
    where: { token },
    include: { user: { select: { id: true, email: true, name: true } } }
  });

  if (!session) return null;
  if (session.expiresAt < new Date()) {
    await prisma.session.delete({ where: { id: session.id } });
    return null;
  }

  return session.user;
}

export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  const cookie = cookieStore.get(SESSION_COOKIE);
  if (!cookie?.value) return;

  const parts = cookie.value.split(":");
  if (parts.length === 2) {
    const [token] = parts;
    await prisma.session.deleteMany({ where: { token } });
  }

  cookieStore.delete(SESSION_COOKIE);
}

export function getOrganizationForUser(userId: string) {
  return prisma.membership.findFirst({
    where: { userId },
    include: { organization: true }
  });
}
