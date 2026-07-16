import { NextRequest, NextResponse } from 'next/server'
import { validateAdminCredentials, createAdminSession, isSessionAuthConfigured } from '@/lib/admin-auth'
import { csrfProtection } from '@/lib/csrf'
import { checkAuthRateLimit, resetAuthRateLimit } from '@/lib/authRateLimit'
import { getClientIp } from '@/lib/security'

export async function POST(request: NextRequest) {
  if (!isSessionAuthConfigured()) {
    return NextResponse.json({ error: 'Auth not configured' }, { status: 503 })
  }

  const csrfCheck = await csrfProtection(request)
  if (!csrfCheck.valid) {
    return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })
  }

  let credentials: unknown
  try {
    credentials = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  if (
    !credentials ||
    typeof credentials !== 'object' ||
    typeof (credentials as { username?: unknown }).username !== 'string' ||
    typeof (credentials as { password?: unknown }).password !== 'string'
  ) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const rateLimitKey = `admin:login:${getClientIp(request)}`
  const rateCheck = checkAuthRateLimit(rateLimitKey)
  if (!rateCheck.allowed) {
    return NextResponse.json({ error: 'RATE_LIMITED' }, { status: 429 })
  }

  const { username, password } = credentials as { username: string; password: string }
  if (!validateAdminCredentials(username, password)) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
  }

  try {
    await createAdminSession()
    resetAuthRateLimit(rateLimitKey)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Admin session creation error:', error)
    return NextResponse.json({ error: 'Failed to create admin session' }, { status: 500 })
  }
}
