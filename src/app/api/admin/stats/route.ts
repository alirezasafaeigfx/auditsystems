import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { validateAdminSession } from '@/lib/admin-auth'

export async function GET() {
  try {
    const isAuthenticated = await validateAdminSession()
    if (!isAuthenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const [totalAudits, totalOrders, pendingOrders, totalLeads, newLeads, qualifiedLeads, convertedLeads, lostLeads, recentAudits] = await Promise.all([
      prisma.auditRun.count(),
      prisma.auditOrder.count(),
      prisma.auditOrder.count({ where: { status: 'PENDING' } }),
      prisma.auditLead.count(),
      prisma.auditLead.count({ where: { status: 'NEW' } }),
      prisma.auditLead.count({ where: { status: 'QUALIFIED' } }),
      prisma.auditLead.count({ where: { status: 'CONVERTED' } }),
      prisma.auditLead.count({ where: { status: 'LOST' } }),
      prisma.auditRun.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          url: true,
          status: true,
          reportStatus: true,
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
      qualifiedLeads,
convertedLeads,
lostLeads,
      recentAudits,
    })
  } catch (error) {
    console.error('Admin stats error:', error)
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 })
  }
}
