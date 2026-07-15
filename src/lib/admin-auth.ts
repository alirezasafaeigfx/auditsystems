import { cookies } from 'next/headers'
import crypto from 'node:crypto'

/**
 * KNOWN LIMITATION (F-003 - owner-accepted risk):
 * Admin session tokens are stateless HMAC-signed tokens, NOT stored server-side.
 * This means individual sessions CANNOT be revoked server-side.
 * To revoke all sessions, rotate ADMIN_SESSION_SECRET in the environment.
 * The 24-hour maxAge provides bounded exposure. Owner has accepted this trade-off
 * for operational simplicity (no DB-backed session store required).
 */

const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin'
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || ''
const SESSION_SECRET = process.env.ADMIN_SESSION_SECRET || ''

function requireSessionSecret(): string {
  if (!SESSION_SECRET) {
    throw new Error('ADMIN_SESSION_SECRET environment variable is required but not set')
  }
  return SESSION_SECRET
}

function signSessionPayload(payload: string): string {
  return crypto.createHmac('sha256', requireSessionSecret()).update(payload).digest('hex')
}

function createSignedSession(): string {
// F-003 KNOWN LIMITATION: Admin sessions are stateless HMAC-signed tokens.
// Once issued, they cannot be revoked server-side for up to 24 hours.
// This is a deliberate architectural trade-off for simplicity.
// Owner must explicitly accept this risk before Production deployment.
// See: alirezasafaei-dev/alirezasafaeisystems/issues/99
  const ts = Date.now()
  const nonce = crypto.randomBytes(16).toString('hex')
  const payload = `${ts}:${nonce}`
  const sig = signSessionPayload(payload)
  return `${payload}:${sig}`
}

function verifySignedSession(token: string): boolean {
  const parts = token.split(':')
  if (parts.length !== 3) return false
  const [ts, nonce, sig] = parts
  const payload = `${ts}:${nonce}`
  const expected = signSessionPayload(payload)
  const sigBuffer = Buffer.from(sig)
  const expectedBuffer = Buffer.from(expected)
  if (sigBuffer.length !== expectedBuffer.length) return false
  if (!crypto.timingSafeEqual(sigBuffer, expectedBuffer)) return false
  const tokenTime = parseInt(ts, 10)
  if (isNaN(tokenTime)) return false
  const maxAgeMs = 24 * 60 * 60 * 1000
  if (Date.now() - tokenTime > maxAgeMs) return false
  return true
}

export function validateAdminCredentials(username: string, password: string): boolean {
  if (ADMIN_PASSWORD.length === 0) return false
  const usernameBuf = Buffer.from(username)
  const expectedUsernameBuf = Buffer.from(ADMIN_USERNAME)
  const passwordBuf = Buffer.from(password)
  const expectedPasswordBuf = Buffer.from(ADMIN_PASSWORD)
  if (usernameBuf.length !== expectedUsernameBuf.length || passwordBuf.length !== expectedPasswordBuf.length) return false
  return crypto.timingSafeEqual(usernameBuf, expectedUsernameBuf) && crypto.timingSafeEqual(passwordBuf, expectedPasswordBuf)
}

export function isSessionAuthConfigured(): boolean {
  return SESSION_SECRET.length > 0 && ADMIN_PASSWORD.length > 0
}

export async function createAdminSession(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.set('admin_session', createSignedSession(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24, // 24 hours
    path: '/',
  })
}

export async function validateAdminSession(): Promise<boolean> {
  const cookieStore = await cookies()
  const session = cookieStore.get('admin_session')
  if (!session?.value) return false
  return verifySignedSession(session.value)
}

export async function clearAdminSession(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete('admin_session')
}
