'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

type Lead = {
  id: string
  domain: string
  email: string
  businessType: string
  primaryConcern: string
  status: string
  internalNote: string | null
  nextActionAt: string | null
  lostReason: string | null
  leadSource: string
  sourcePlacement: string | null
  sourceOffer: string | null
  createdAt: string
  run: null | {
    id: string
    status: string
    reportStatus: string
    errorCode: string | null
    errorMessage: string | null
    createdAt: string
    finishedAt: string | null
  }
}

interface Stats {
  totalAudits: number
  totalOrders: number
  pendingOrders: number
  totalLeads: number
  qualifiedLeads: number
  wonLeads: number
  lostLeads: number
  recentAudits: Array<{
    id: string
    url: string
    status: string
    reportStatus: string
    createdAt: string
  }>
}

const leadStatuses = ['NEW', 'QUALIFIED', 'CALL', 'PROPOSAL', 'WON', 'LOST']
const reportStatuses = ['QUEUED', 'RUNNING', 'REVIEW', 'DELIVERED', 'FAILED']

export function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)
  const router = useRouter()

  const loadData = useCallback(async () => {
    const [statsRes, leadsRes] = await Promise.all([
      fetch('/api/admin/stats'),
      fetch('/api/admin/leads'),
    ])
    if (statsRes.status === 401 || leadsRes.status === 401) {
      router.push('/admin/login')
      return
    }
    setStats(await statsRes.json())
    const leadsBody = await leadsRes.json()
    setLeads(leadsBody.leads ?? [])
    setLoading(false)
  }, [router])

  useEffect(() => {
    loadData().catch(() => setLoading(false))
  }, [loadData])

  const handleLogout = async () => {
    await fetch('/api/admin/auth/logout', { method: 'POST' })
    router.push('/admin/login')
  }

  async function updateLead(lead: Lead, payload: Record<string, unknown>) {
    setBusyId(lead.id)
    await fetch(`/api/admin/leads/${lead.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    await loadData()
    setBusyId(null)
  }

  async function postLeadAction(lead: Lead, action: 'start-audit' | 'retry-audit') {
    setBusyId(lead.id)
    await fetch(`/api/admin/leads/${lead.id}/${action}`, { method: 'POST' })
    await loadData()
    setBusyId(null)
  }

  if (loading) {
    return <div style={{ padding: '2rem' }}>Loading...</div>
  }

  return (
    <div style={{ padding: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', gap: '1rem' }}>
        <h1 style={{ fontSize: '1.8rem', fontWeight: 700 }}>Audit Revenue Ops</h1>
        <button onClick={handleLogout}>Logout</button>
      </div>

      <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', marginBottom: '2rem' }}>
        <Kpi label="Leads" value={stats?.totalLeads ?? 0} />
        <Kpi label="Qualified" value={stats?.qualifiedLeads ?? 0} />
        <Kpi label="Won" value={stats?.wonLeads ?? 0} />
        <Kpi label="Lost" value={stats?.lostLeads ?? 0} />
        <Kpi label="Audits" value={stats?.totalAudits ?? 0} />
        <Kpi label="Pending Orders" value={stats?.pendingOrders ?? 0} />
      </div>

      <section className="card" style={{ padding: '1.5rem' }}>
        <h2 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '1rem' }}>Lead-to-delivery queue</h2>
        {leads.length === 0 ? (
          <p style={{ color: 'var(--muted)' }}>No real leads yet. Submit through /qualification to populate this queue.</p>
        ) : (
          <div style={{ display: 'grid', gap: '1rem' }}>
            {leads.map((lead) => (
              <article key={lead.id} style={{ border: '1px solid var(--line)', borderRadius: 8, padding: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                  <div>
                    <strong>{lead.domain}</strong>
                    <p style={{ margin: '0.25rem 0', color: 'var(--muted)' }}>{lead.email} · {lead.businessType}</p>
                    <p style={{ margin: '0.25rem 0' }}>{lead.primaryConcern}</p>
                    <p style={{ margin: '0.25rem 0', color: 'var(--muted)', fontSize: '0.85rem' }}>
                      source={lead.leadSource} placement={lead.sourcePlacement ?? 'none'} offer={lead.sourceOffer ?? 'none'}
                    </p>
                  </div>
                  <div style={{ display: 'grid', gap: '0.5rem', minWidth: 220 }}>
                    <select
                      value={lead.status}
                      disabled={busyId === lead.id}
                      onChange={(event) => updateLead(lead, {
                        status: event.target.value,
                        lostReason: event.target.value === 'LOST' ? lead.lostReason ?? 'manual-review-needed' : undefined,
                      })}
                    >
                      {leadStatuses.map((status) => <option key={status} value={status}>{status}</option>)}
                    </select>
                    <input
                      type="date"
                      defaultValue={lead.nextActionAt ? lead.nextActionAt.slice(0, 10) : ''}
                      onBlur={(event) => {
                        if (event.currentTarget.value) updateLead(lead, { nextActionAt: event.currentTarget.value })
                      }}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '1rem' }}>
                  {lead.run ? (
                    <>
                      <span className="badge">Audit {lead.run.status}</span>
                      <select
                        value={lead.run.reportStatus}
                        disabled={busyId === lead.id}
                        onChange={(event) => updateLead(lead, { reportStatus: event.target.value })}
                      >
                        {reportStatuses.map((status) => <option key={status} value={status}>{status}</option>)}
                      </select>
                      {lead.run.reportStatus === 'FAILED' || lead.run.status === 'FAILED' ? (
                        <button type="button" onClick={() => postLeadAction(lead, 'retry-audit')} disabled={busyId === lead.id}>
                          Retry
                        </button>
                      ) : null}
                    </>
                  ) : (
                    <button type="button" onClick={() => postLeadAction(lead, 'start-audit')} disabled={busyId === lead.id}>
                      Start manual audit
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => updateLead(lead, { internalNote: `${lead.internalNote ?? ''}\n${new Date().toISOString()} manual follow-up` })}
                    disabled={busyId === lead.id}
                  >
                    Add note
                  </button>
                </div>

                {lead.run?.errorMessage ? (
                  <p role="alert" className="status-note is-danger" style={{ marginTop: '0.75rem' }}>
                    {lead.run.errorCode}: {lead.run.errorMessage}
                  </p>
                ) : null}
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

function Kpi({ label, value }: { label: string; value: number }) {
  return (
    <div className="card" style={{ padding: '1rem' }}>
      <h3 style={{ fontSize: '0.88rem', fontWeight: 600, marginBottom: '0.4rem', color: 'var(--muted)' }}>{label}</h3>
      <p style={{ fontSize: '1.8rem', fontWeight: 800 }}>{value}</p>
    </div>
  )
}
