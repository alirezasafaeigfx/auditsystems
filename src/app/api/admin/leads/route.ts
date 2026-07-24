import { LeadStatus, Prisma } from '@prisma/client'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { validateAdminSession } from '@/lib/admin-auth'

export async function GET(request: NextRequest) {
  try {
    const isAuthenticated = await validateAdminSession()
    if (!isAuthenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const url = new URL(request.url)
    const status = url.searchParams.get('status')
    const search = url.searchParams.get('search')
    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1'))
    const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') || '20')))

    const where: Prisma.AuditLeadWhereInput = {}
    if (status && status !== 'ALL' && Object.values(LeadStatus).includes(status as LeadStatus)) {
      where.status = status as LeadStatus
    }
    if (search) {
      where.OR = [
        { email: { contains: search } },
        { name: { contains: search } },
        { company: { contains: search } },
      ]
    }

    const [leads, total] = await Promise.all([
      prisma.auditLead.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          run: { select: { id: true, url: true, status: true } },
          orders: { select: { id: true, status: true, amountToman: true, paidAt: true }, orderBy: { createdAt: 'desc' }, take: 1 },
        },
      }),
      prisma.auditLead.count({ where }),
    ])

    const statusCounts = await Promise.all(
      (Object.values(LeadStatus) as LeadStatus[]).map(async (s) => {
        const count = await prisma.auditLead.count({ where: { status: s } })
        return { status: s, count }
      })
    )

    return NextResponse.json({
      leads,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      statusCounts,
    }, { headers: { "Cache-Control": "no-store, no-cache, must-revalidate" } })
  } catch {
    return NextResponse.json({ error: 'Failed to fetch leads' }, { status: 500 })
  }
}
