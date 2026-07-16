'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { fetchCSRFHeaders } from '@/lib/csrf-client'

interface SiteCheck {
  name: string
  url: string
  status: 'up' | 'down' | 'degraded'
  latencyMs: number
}

interface HealthCheck {
  name: string
  status: 'pass' | 'fail' | 'skip'
  latencyMs: number
  detail: string
}

interface MonitoringData {
  timestamp: string
  sites: SiteCheck[]
  infrastructure: {
    database?: HealthCheck
    redis?: HealthCheck
  }
  metrics: {
    queueDepth: number
    activeUsers: number
    throughput: { last24h: number; avgPerDay7d: number }
    errorRate: string
    failedAudits24h: number
    totalAudits7d: number
  }
  revenue: {
    totalToman: number
    paidOrderCount: number
    avgOrderValueToman: number
    pendingOrders: number
    breakdownByStatus: Array<{ status: string; count: number }>
  }
  recentAudits: Array<{
    id: string
    url: string
    status: string
    createdAt: string
    finishedAt: string | null
    errorCode: string | null
  }>
  detailedErrors: Array<{ errorCode: string | null; errorMessage: string | null }>
}

const STATUS_COLORS: Record<string, string> = {
  up: '#22c55e',
  pass: '#22c55e',
  down: '#ef4444',
  fail: '#ef4444',
  degraded: '#f59e0b',
  skip: '#6b7280',
}

function StatusDot({ status }: { status: string }) {
  return (
    <span
      style={{
        display: 'inline-block',
        width: 10,
        height: 10,
        borderRadius: '50%',
        backgroundColor: STATUS_COLORS[status] || '#6b7280',
        marginRight: 6,
      }}
    />
  )
}

function MetricCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="card" style={{ padding: '1.25rem' }}>
      <h3 style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.4rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {label}
      </h3>
      <p style={{ fontSize: '1.8rem', fontWeight: 700, lineHeight: 1.2 }}>{value}</p>
      {sub && <p style={{ fontSize: '0.78rem', color: 'var(--muted)', marginTop: '0.25rem' }}>{sub}</p>}
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
      <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem', borderBottom: '1px solid var(--line)', paddingBottom: '0.5rem' }}>
        {title}
      </h2>
      {children}
    </div>
  )
}

export default function MonitoringPage() {
  const [data, setData] = useState<MonitoringData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)
  const router = useRouter()

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/monitoring')
      if (res.status === 401) {
        router.push('/admin/login')
        return
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json()
      setData(json)
      setLastRefresh(new Date())
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [router])

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 30_000)
    return () => clearInterval(interval)
  }, [fetchData])

  const handleLogout = async () => {
    const csrfHeaders = await fetchCSRFHeaders()
    await fetch('/api/admin/auth/logout', { method: 'POST', headers: csrfHeaders })
    router.push('/admin/login')
  }

  if (loading) {
    return <div style={{ padding: '2rem' }}>Loading monitoring data...</div>
  }

  if (error && !data) {
    return <div style={{ padding: '2rem' }}>Error: {error}</div>
  }

  return (
    <div style={{ padding: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 700 }}>Monitoring Dashboard</h1>
          {lastRefresh && (
            <p style={{ fontSize: '0.78rem', color: 'var(--muted)', marginTop: '0.25rem' }}>
              Last refresh: {lastRefresh.toLocaleTimeString()} — auto-refreshes every 30s
            </p>
          )}
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button onClick={fetchData} style={{ padding: '0.5rem 1rem', cursor: 'pointer' }}>
            Refresh Now
          </button>
          <button onClick={() => router.push('/admin')}>Dashboard</button>
          <button onClick={handleLogout}>Logout</button>
        </div>
      </div>

      {error && (
        <div style={{ padding: '0.75rem', marginBottom: '1rem', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: 6, color: '#991b1b' }}>
          Refresh failed: {error}
        </div>
      )}

      {data && (
        <>
          <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', marginBottom: '1.5rem' }}>
            <MetricCard label="Queue Depth" value={data.metrics.queueDepth} sub="Pending audits" />
            <MetricCard label="Audits (24h)" value={data.metrics.throughput.last24h} sub={`${data.metrics.errorRate} error rate`} />
            <MetricCard label="Avg/Day (7d)" value={data.metrics.throughput.avgPerDay7d} sub={`${data.metrics.totalAudits7d} total`} />
            <MetricCard label="Active Sessions" value={data.metrics.activeUsers} sub="Authenticated users" />
            <MetricCard label="Revenue (Total)" value={`${data.revenue.totalToman.toLocaleString()} TOMAN`} sub={`${data.revenue.paidOrderCount} paid orders`} />
            <MetricCard label="Pending Orders" value={data.revenue.pendingOrders} sub={`Avg: ${data.revenue.avgOrderValueToman.toLocaleString()} TOMAN`} />
          </div>

          <Section title="Site Uptime">
            <div style={{ display: 'grid', gap: '0.75rem', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
              {data.sites.map((site) => (
                <div key={site.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1rem', borderRadius: 6, border: '1px solid var(--line)' }}>
                  <div>
                    <span style={{ fontWeight: 600 }}><StatusDot status={site.status} />{site.name}</span>
                    <p style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: 2 }}>{site.url}</p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 600, color: STATUS_COLORS[site.status] }}>
                      {site.status.toUpperCase()}
                    </span>
                    <p style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>{site.latencyMs}ms</p>
                  </div>
                </div>
              ))}
            </div>
          </Section>

          <Section title="Infrastructure">
            <div style={{ display: 'grid', gap: '0.75rem', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
              {data.infrastructure.database && (
                <div style={{ padding: '0.75rem 1rem', borderRadius: 6, border: '1px solid var(--line)' }}>
                  <span style={{ fontWeight: 600 }}><StatusDot status={data.infrastructure.database.status} />Database</span>
                  <p style={{ fontSize: '0.78rem', color: 'var(--muted)', marginTop: 2 }}>
                    {data.infrastructure.database.latencyMs}ms — {data.infrastructure.database.detail}
                  </p>
                </div>
              )}
              {data.infrastructure.redis && (
                <div style={{ padding: '0.75rem 1rem', borderRadius: 6, border: '1px solid var(--line)' }}>
                  <span style={{ fontWeight: 600 }}><StatusDot status={data.infrastructure.redis.status} />Redis</span>
                  <p style={{ fontSize: '0.78rem', color: 'var(--muted)', marginTop: 2 }}>
                    {data.infrastructure.redis.latencyMs}ms — {data.infrastructure.redis.detail}
                  </p>
                </div>
              )}
            </div>
          </Section>

          <Section title="Audit Status Breakdown (24h)">
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              {data.revenue.breakdownByStatus.map((s) => (
                <div key={s.status} style={{ padding: '0.5rem 1rem', borderRadius: 6, border: '1px solid var(--line)', minWidth: 100, textAlign: 'center' }}>
                  <p style={{ fontWeight: 700, fontSize: '1.2rem' }}>{s.count}</p>
                  <p style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>{s.status}</p>
                </div>
              ))}
            </div>
          </Section>

          <Section title="Recent Audits">
            <div style={{ display: 'grid', gap: '0.5rem' }}>
              {data.recentAudits.map((audit) => (
                <div key={audit.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0', borderBottom: '1px solid var(--line)' }}>
                  <div>
                    <p style={{ fontWeight: 500, fontSize: '0.9rem' }}>{audit.url}</p>
                    <p style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>{new Date(audit.createdAt).toLocaleString('fa-IR')}</p>
                  </div>
                  <span className="badge" style={{ color: audit.status === 'FAILED' ? '#ef4444' : undefined }}>
                    {audit.status}{audit.errorCode ? ` (${audit.errorCode})` : ''}
                  </span>
                </div>
              ))}
              {data.recentAudits.length === 0 && <p style={{ color: 'var(--muted)' }}>No recent audits</p>}
            </div>
          </Section>

          {data.detailedErrors.length > 0 && (
            <Section title="Recent Errors (24h)">
              <div style={{ display: 'grid', gap: '0.5rem' }}>
                {data.detailedErrors.map((err, i) => (
                  <div key={i} style={{ padding: '0.5rem 0.75rem', borderRadius: 6, border: '1px solid #fecaca', backgroundColor: '#fef2f2', fontSize: '0.85rem' }}>
                    <span style={{ fontWeight: 600, color: '#991b1b' }}>{err.errorCode || 'UNKNOWN'}</span>
                    {err.errorMessage && <span style={{ color: '#6b7280', marginLeft: 8 }}>{err.errorMessage.slice(0, 120)}</span>}
                  </div>
                ))}
              </div>
            </Section>
          )}
        </>
      )}
    </div>
  )
}
