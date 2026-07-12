import { LeadStatus } from '@prisma/client'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { validateAdminSession } from '@/lib/admin-auth'
import { csrfProtection } from '@/lib/csrf'
import { canTransition } from '@/lib/lead-state-machine'

const VALID_STATUSES: readonly string[] = Object.values(LeadStatus) as readonly string[]

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const isAuthenticated = await validateAdminSession()
    if (!isAuthenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const csrfCheck = await csrfProtection(request)
    if (!csrfCheck.valid) {
      return NextResponse.json({ error: 'FORBIDDEN', details: csrfCheck.error }, { status: 403 })
    }

    const { id } = await params
    const body = await request.json()
    const { status, lostReason } = body

    if (!VALID_STATUSES.includes(status)) {
      return NextResponse.json({ error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` }, { status: 400 })
    }

    const existing = await prisma.auditLead.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
    }

    if (!canTransition(existing.status as LeadStatus, status as LeadStatus)) {
      return NextResponse.json({ error: `Invalid transition: ${existing.status} -> ${status}` }, { status: 409 })
    }

    if (status === 'LOST' && !lostReason) {
      return NextResponse.json({ error: 'lostReason is required when transitioning to LOST' }, { status: 400 })
    }

    const updateData: Record<string, unknown> = { status }

    if (status === 'QUALIFIED') {
      updateData.qualifiedAt = new Date()
    } else if (status === 'CONVERTED') {
      updateData.convertedAt = new Date()
    } else if (status === 'LOST') {
      updateData.lostAt = new Date()
      updateData.lostReason = lostReason
    }

    const lead = await prisma.auditLead.update({
      where: { id },
      data: updateData,
      include: {
        run: { select: { id: true, url: true } },
        orders: { select: { id: true, status: true, amountToman: true }, orderBy: { createdAt: 'desc' }, take: 1 },
      },
    })

    return NextResponse.json({ lead })
  } catch (error) {
    console.error('Admin lead status update error:', error)
    return NextResponse.json({ error: 'Failed to update lead status' }, { status: 500 })
  }
}
