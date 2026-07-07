import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { validateAdminSession } from '@/lib/admin-auth'
import { buildReadinessReport } from '@/lib/health'

const SITES = [
  { name: 'AuditSystems', url: process.env.SITE_AUDITSYSTEMS_URL || 'https://auditsystems.ir' },
  { name: 'AlirezaSafaeiSystems', url: process.env.SITE_ALIREZASAFAEI_URL || 'https://alirezasafaei.ir' },
  { name: 'PersianToolbox', url: process.env.SITE_PERSIANTOOLBOX_URL || 'https://persiantoolbox.com' },
]

async function checkSiteUptime(url: string): Promise<{ status: 'up' | 'down' | 'degraded'; latencyMs: number }> {
  const start = Date.now()
  try {
    const res = await fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(8000) })
    const latencyMs = Date.now() - start
    if (res.ok) return { status: 'up', latencyMs }
    if (res.status >= 500) return { status: 'down', latencyMs }
    return { status: 'degraded', latencyMs }
  } catch {
    return { status: 'down', latencyMs: Date.now() - start }
  }
}

export async function GET() {
  try {
    const isAuthenticated = await validateAdminSession()
    if (!isAuthenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const now = new Date()
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

    const [
      siteChecks,
      healthReport,
      queueDepth,
      totalAudits24h,
      failedAudits24h,
      totalAudits7d,
      activeUsers,
      paidOrders,
      totalRevenue,
      pendingOrders,
      recentAudits,
      webVitals,
      apiErrors,
    ] = await Promise.all([
      Promise.all(SITES.map(async (site) => ({
        ...site,
        ...(await checkSiteUptime(site.url)),
      }))),
      buildReadinessReport(),
      prisma.auditRun.count({ where: { status: 'QUEUED' } }),
      prisma.auditRun.count({ where: { createdAt: { gte: last24h } } }),
      prisma.auditRun.count({ where: { createdAt: { gte: last24h }, status: 'FAILED' } }),
      prisma.auditRun.count({ where: { createdAt: { gte: last7d } } }),
      prisma.session.count({ where: { expiresAt: { gt: now } } }),
      prisma.auditOrder.findMany({
        where: { status: 'PAID' },
        select: { amountToman: true },
      }),
      prisma.invoice.aggregate({ where: { status: 'PAID' }, _sum: { amountToman: true } }),
      prisma.auditOrder.count({ where: { status: 'PENDING' } }),
      prisma.auditRun.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          url: true,
          status: true,
          createdAt: true,
          finishedAt: true,
          errorCode: true,
        },
      }),
      prisma.auditRun.groupBy({
        by: ['status'],
        where: { createdAt: { gte: last24h } },
        _count: { id: true },
      }),
      prisma.auditRun.findMany({
        where: {
          status: 'FAILED',
          createdAt: { gte: last24h },
        },
        select: { errorCode: true, errorMessage: true },
        take: 20,
      }),
    ])

    const throughput24h = totalAudits24h
    const throughput7dAvg = Math.round(totalAudits7d / 7)
    const errorRate = totalAudits24h > 0 ? ((failedAudits24h / totalAudits24h) * 100).toFixed(1) : '0.0'
    const revenueTotal = totalRevenue._sum.amountToman ?? 0
    const revenueCount = paidOrders.length
    const avgOrderValue = revenueCount > 0 ? Math.round(revenueTotal / revenueCount) : 0

    return NextResponse.json({
      timestamp: now.toISOString(),
      sites: siteChecks,
      infrastructure: {
        database: healthReport.checks.find((c) => c.name === 'database'),
        redis: healthReport.checks.find((c) => c.name === 'redis'),
      },
      metrics: {
        queueDepth,
        activeUsers,
        throughput: {
          last24h: throughput24h,
          avgPerDay7d: throughput7dAvg,
        },
        errorRate: `${errorRate}%`,
        failedAudits24h,
        totalAudits7d,
      },
      revenue: {
        totalToman: revenueTotal,
        paidOrderCount: revenueCount,
        avgOrderValueToman: avgOrderValue,
        pendingOrders,
        breakdownByStatus: webVitals.map((v) => ({ status: v.status, count: v._count.id })),
      },
      recentAudits,
      recentErrors: recentAudits.filter((a) => a.status === 'FAILED').slice(0, 5),
      detailedErrors: apiErrors,
    })
  } catch (error) {
    console.error('Monitoring API error:', error)
    return NextResponse.json({ error: 'Failed to fetch monitoring data' }, { status: 500 })
  }
}
