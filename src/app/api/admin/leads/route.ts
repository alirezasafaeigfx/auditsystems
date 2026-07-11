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

    const where: Record<string, unknown> = {}
    if (status && status !== 'ALL') {
      where.status = status
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
        where: where as any,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          run: { select: { id: true, url: true, status: true } },
          order: { select: { id: true, status: true, amountToman: true, paidAt: true } },
        },
      }),
      prisma.auditLead.count({ where: where as any }),
    ])

    const statusCounts = await Promise.all(
      ['NEW', 'QUALIFIED', 'AUDIT_STARTED', 'REPORT_READY', 'DELIVERED', 'CONVERTED', 'LOST'].map(async (s) => {
        const count = await prisma.auditLead.count({ where: { status: s as any } })
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
    })
  } catch (error) {
    console.error('Admin leads error:', error)
    return NextResponse.json({ error: 'Failed to fetch leads' }, { status: 500 })
  }
}
