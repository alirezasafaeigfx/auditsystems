import { cookies } from 'next/headers'
import crypto from 'node:crypto'

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
  return username === ADMIN_USERNAME && password === ADMIN_PASSWORD && ADMIN_PASSWORD.length > 0
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
