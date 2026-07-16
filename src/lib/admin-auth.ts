import crypto from 'node:crypto'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/db'

const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin'
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || ''
const SESSION_SECRET = process.env.ADMIN_SESSION_SECRET || ''
const COOKIE_NAME = 'admin_session'
const MIN_SESSION_SECRET_BYTES = 32
const SESSION_MAX_AGE_SECONDS = 24 * 60 * 60
const SESSION_MAX_AGE_MS = SESSION_MAX_AGE_SECONDS * 1000
const MAX_CLOCK_SKEW_MS = 60 * 1000
const TOKEN_VERSION = 'v1'
const SESSION_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const SIGNING_DOMAIN = 'asdev-admin-session-signature:v1'
const HASH_DOMAIN = 'asdev-admin-session-token-hash:v1'

export type AdminSessionClaims = {
  sessionId: string
  issuedAt: number
  tokenHash: string
}

function hasStrongSessionSecret(secret: string): boolean {
  return Buffer.byteLength(secret, 'utf8') >= MIN_SESSION_SECRET_BYTES
}

function requireSessionSecret(): string {
  if (!hasStrongSessionSecret(SESSION_SECRET)) {
    throw new Error('ADMIN_SESSION_SECRET must contain at least 32 bytes')
  }
  return SESSION_SECRET
}

function hmacPayload(payload: string): string {
  return crypto
    .createHmac('sha256', requireSessionSecret())
    .update(`${SIGNING_DOMAIN}:${payload}`)
    .digest('hex')
}

function hashSessionToken(token: string): string {
  return crypto.createHash('sha256').update(`${HASH_DOMAIN}:${token}`).digest('hex')
}

function safeHexEqual(actual: string, expected: string): boolean {
  if (!/^[a-f0-9]+$/i.test(actual) || !/^[a-f0-9]+$/i.test(expected)) return false
  const actualBuffer = Buffer.from(actual, 'hex')
  const expectedBuffer = Buffer.from(expected, 'hex')
  return actualBuffer.length === expectedBuffer.length && crypto.timingSafeEqual(actualBuffer, expectedBuffer)
}

export function createSignedAdminSessionToken(
  sessionId: string,
  tokenSecret: string,
  issuedAt: number = Date.now(),
): string {
  const payload = `${TOKEN_VERSION}.${sessionId}.${issuedAt}.${tokenSecret}`
  return `${payload}.${hmacPayload(payload)}`
}

export function verifySignedAdminSessionToken(
  token: string,
  now: number = Date.now(),
): AdminSessionClaims | null {
  const parts = token.split('.')
  if (parts.length !== 5) return null

  const [version, sessionId, issuedAtRaw, tokenSecret, signature] = parts
  if (version !== TOKEN_VERSION) return null
  if (!SESSION_ID_PATTERN.test(sessionId)) return null
  if (!/^[0-9a-f]{64}$/i.test(tokenSecret)) return null

  const issuedAt = Number.parseInt(issuedAtRaw, 10)
  if (!Number.isSafeInteger(issuedAt)) return null

  const ageMs = now - issuedAt
  if (ageMs < -MAX_CLOCK_SKEW_MS || ageMs > SESSION_MAX_AGE_MS) return null

  const payload = `${version}.${sessionId}.${issuedAtRaw}.${tokenSecret}`
  const expectedSignature = hmacPayload(payload)
  if (!safeHexEqual(signature, expectedSignature)) return null

  return {
    sessionId,
    issuedAt,
    tokenHash: hashSessionToken(token),
  }
}

export function validateAdminCredentials(username: string, password: string): boolean {
  if (ADMIN_PASSWORD.length === 0) return false

  const usernameBuffer = Buffer.from(username)
  const expectedUsernameBuffer = Buffer.from(ADMIN_USERNAME)
  const passwordBuffer = Buffer.from(password)
  const expectedPasswordBuffer = Buffer.from(ADMIN_PASSWORD)

  if (
    usernameBuffer.length !== expectedUsernameBuffer.length ||
    passwordBuffer.length !== expectedPasswordBuffer.length
  ) {
    return false
  }

  return (
    crypto.timingSafeEqual(usernameBuffer, expectedUsernameBuffer) &&
    crypto.timingSafeEqual(passwordBuffer, expectedPasswordBuffer)
  )
}

export function isSessionAuthConfigured(): boolean {
  return hasStrongSessionSecret(SESSION_SECRET) && ADMIN_PASSWORD.length > 0
}

export async function createAdminSession(): Promise<string> {
  const sessionId = crypto.randomUUID()
  const tokenSecret = crypto.randomBytes(32).toString('hex')
  const issuedAt = Date.now()
  const expiresAt = new Date(issuedAt + SESSION_MAX_AGE_MS)
  const token = createSignedAdminSessionToken(sessionId, tokenSecret, issuedAt)

  await prisma.adminSession.create({
    data: {
      id: sessionId,
      tokenHash: hashSessionToken(token),
      expiresAt,
    },
  })

  const cookieStore = await cookies()
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_MAX_AGE_SECONDS,
    path: '/',
  })

  return sessionId
}

export async function validateAdminSession(): Promise<boolean> {
  const cookieStore = await cookies()
  const token = cookieStore.get(COOKIE_NAME)?.value
  if (!token) return false

  const claims = verifySignedAdminSessionToken(token)
  if (!claims) return false

  const session = await prisma.adminSession.findUnique({
    where: { id: claims.sessionId },
    select: {
      tokenHash: true,
      expiresAt: true,
      revokedAt: true,
    },
  })

  if (!session || session.revokedAt || session.expiresAt.getTime() <= Date.now()) {
    return false
  }

  return safeHexEqual(session.tokenHash, claims.tokenHash)
}

export async function listActiveAdminSessions() {
  return prisma.adminSession.findMany({
    where: {
      revokedAt: null,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      createdAt: true,
      expiresAt: true,
      lastSeenAt: true,
    },
  })
}

export async function revokeAdminSession(sessionId: string): Promise<boolean> {
  const result = await prisma.adminSession.updateMany({
    where: {
      id: sessionId,
      revokedAt: null,
      expiresAt: { gt: new Date() },
    },
    data: { revokedAt: new Date() },
  })
  return result.count > 0
}

export async function revokeAllAdminSessions(): Promise<number> {
  const result = await prisma.adminSession.updateMany({
    where: {
      revokedAt: null,
      expiresAt: { gt: new Date() },
    },
    data: { revokedAt: new Date() },
  })

  const cookieStore = await cookies()
  cookieStore.delete(COOKIE_NAME)
  return result.count
}

export async function clearAdminSession(): Promise<void> {
  const cookieStore = await cookies()
  const token = cookieStore.get(COOKIE_NAME)?.value

  try {
    if (token) {
      const claims = verifySignedAdminSessionToken(token)
      if (claims) {
        await prisma.adminSession.updateMany({
          where: {
            id: claims.sessionId,
            tokenHash: claims.tokenHash,
            revokedAt: null,
          },
          data: { revokedAt: new Date() },
        })
      }
    }
  } finally {
    cookieStore.delete(COOKIE_NAME)
  }
}
