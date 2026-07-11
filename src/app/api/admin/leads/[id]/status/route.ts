import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { validateAdminSession } from '@/lib/admin-auth'

const VALID_STATUSES = ['NEW', 'QUALIFIED', 'AUDIT_STARTED', 'REPORT_READY', 'DELIVERED', 'CONVERTED', 'LOST'] as const

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const isAuthenticated = await validateAdminSession()
    if (!isAuthenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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

    const updateData: Record<string, unknown> = { status }

    if (status === 'QUALIFIED') {
      updateData.qualifiedAt = new Date()
    } else if (status === 'CONVERTED') {
      updateData.convertedAt = new Date()
    } else if (status === 'LOST') {
      updateData.lostAt = new Date()
      updateData.lostReason = lostReason || null
    }

    const lead = await prisma.auditLead.update({
      where: { id },
      data: updateData as any,
      include: {
        run: { select: { id: true, url: true } },
        order: { select: { id: true, status: true, amountToman: true } },
      },
    })

    return NextResponse.json({ lead })
  } catch (error) {
    console.error('Admin lead status update error:', error)
    return NextResponse.json({ error: 'Failed to update lead status' }, { status: 500 })
  }
}
