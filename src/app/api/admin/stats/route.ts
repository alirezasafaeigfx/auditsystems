import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { validateAdminSession } from '@/lib/admin-auth'

export async function GET() {
  try {
    const isAuthenticated = await validateAdminSession()
    if (!isAuthenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const [totalAudits, totalOrders, pendingOrders, totalLeads, newLeads, recentAudits] = await Promise.all([
      prisma.auditRun.count(),
      prisma.auditOrder.count(),
      prisma.auditOrder.count({ where: { status: 'PENDING' } }),
      prisma.auditLead.count(),
      prisma.auditLead.count({ where: { status: 'NEW' } }),
      prisma.auditRun.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          url: true,
          status: true,
          createdAt: true,
        },
      }),
    ])

    return NextResponse.json({
      totalAudits,
      totalOrders,
      pendingOrders,
      totalLeads,
      newLeads,
      recentAudits,
    })
  } catch (error) {
    console.error('Admin stats error:', error)
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 })
  }
}
