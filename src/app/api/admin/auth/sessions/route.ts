import { NextRequest, NextResponse } from 'next/server'
import {
  listActiveAdminSessions,
  revokeAdminSession,
  validateAdminSession,
} from '@/lib/admin-auth'
import { csrfProtection } from '@/lib/csrf'

const SESSION_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export async function GET() {
  try {
    if (!(await validateAdminSession())) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const sessions = await listActiveAdminSessions()
    return NextResponse.json({ sessions })
  } catch (error) {
    console.error('Admin session list error:', error)
    return NextResponse.json({ error: 'Failed to list admin sessions' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    if (!(await validateAdminSession())) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const csrfCheck = await csrfProtection(request)
    if (!csrfCheck.valid) {
      return NextResponse.json(
        { error: 'FORBIDDEN', details: csrfCheck.error },
        { status: 403 },
      )
    }

    const body = await request.json()
    const sessionId = typeof body?.sessionId === 'string' ? body.sessionId : ''
    if (!SESSION_ID_PATTERN.test(sessionId)) {
      return NextResponse.json({ error: 'Invalid sessionId' }, { status: 400 })
    }

    const revoked = await revokeAdminSession(sessionId)
    if (!revoked) {
      return NextResponse.json({ error: 'Active session not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, sessionId })
  } catch (error) {
    console.error('Admin session revoke error:', error)
    return NextResponse.json({ error: 'Failed to revoke admin session' }, { status: 500 })
  }
}
