import { NextRequest, NextResponse } from 'next/server'
import {
  revokeAllAdminSessions,
  validateAdminSession,
} from '@/lib/admin-auth'
import { csrfProtection } from '@/lib/csrf'

export async function POST(request: NextRequest) {
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

    const revoked = await revokeAllAdminSessions()
    return NextResponse.json({ success: true, revoked })
  } catch (error) {
    console.error('Admin revoke-all error:', error)
    return NextResponse.json({ error: 'Failed to revoke admin sessions' }, { status: 500 })
  }
}
