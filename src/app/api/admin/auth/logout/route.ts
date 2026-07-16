import { NextRequest, NextResponse } from 'next/server'
import { clearAdminSession } from '@/lib/admin-auth'
import { csrfProtection } from '@/lib/csrf'

export async function POST(request: NextRequest) {
  const csrfCheck = await csrfProtection(request)
  if (!csrfCheck.valid) {
    return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })
  }

  try {
    await clearAdminSession()
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Admin logout error:', error)
    return NextResponse.json({ error: 'Failed to revoke admin session' }, { status: 500 })
  }
}
