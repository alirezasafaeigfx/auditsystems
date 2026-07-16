'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { fetchCSRFHeaders } from '@/lib/csrf-client'

interface Lead {
  id: string
  email: string
  name: string | null
  phone: string | null
  company: string | null
  note: string | null
  status: string
  qualifiedAt: string | null
  convertedAt: string | null
  lostAt: string | null
  lostReason: string | null
  createdAt: string
  run: { id: string; url: string; status: string } | null
  orders: Array<{ id: string; status: string; amountToman: number; paidAt: string | null }>
}

interface StatusCount {
  status: string
  count: number
}

const STATUSES = ['NEW', 'QUALIFIED', 'AUDIT_STARTED', 'REPORT_READY', 'DELIVERED', 'CONVERTED', 'LOST']

const STATUS_COLORS: Record<string, string> = {
  NEW: '#6366f1',
  QUALIFIED: '#22c55e',
  AUDIT_STARTED: '#3b82f6',
  REPORT_READY: '#a855f7',
  DELIVERED: '#06b6d4',
  CONVERTED: '#16a34a',
  LOST: '#ef4444',
}

export function AdminLeads() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [statusCounts, setStatusCounts] = useState<StatusCount[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)
  const [updating, setUpdating] = useState(false)
  const router = useRouter()

  const fetchLeads = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (statusFilter !== 'ALL') params.set('status', statusFilter)
      if (search) params.set('search', search)
      params.set('page', String(page))

      const res = await fetch(`/api/admin/leads?${params}`)
      if (res.status === 401) {
        router.push('/admin/login')
        return
      }
      const data = await res.json()
      if (data) {
        setLeads(data.leads)
        setTotalPages(data.totalPages)
        setStatusCounts(data.statusCounts)
      }
    } catch {
      console.error('Failed to fetch leads')
    }
    setLoading(false)
  }, [statusFilter, search, page, router])

  useEffect(() => {
    fetchLeads()
  }, [fetchLeads])

  const handleLogout = async () => {
    const csrfHeaders = await fetchCSRFHeaders()
    await fetch('/api/admin/auth/logout', { method: 'POST', headers: csrfHeaders })
    router.push('/admin/login')
  }

  const updateStatus = async (leadId: string, newStatus: string, lostReason?: string) => {
    setUpdating(true)
    try {
      const csrfHeaders = await fetchCSRFHeaders()
      const res = await fetch(`/api/admin/leads/${leadId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...csrfHeaders },
        body: JSON.stringify({ status: newStatus, lostReason }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to update')
      }
      setSelectedLead(null)
      fetchLeads()
    } catch (e) {
      console.error('Update failed:', e)
      alert(e instanceof Error ? e.message : 'Update failed')
    } finally {
      setUpdating(false)
    }
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.8rem', fontWeight: 700 }}>Lead Management</h1>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <a href="/admin" style={{ color: 'var(--primary)' }}>Dashboard</a>
          <button onClick={handleLogout}>
            Logout
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
        {statusCounts.map(sc => (
          <button
            key={sc.status}
            onClick={() => { setStatusFilter(sc.status); setPage(1) }}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '8px',
              border: `2px solid ${statusFilter === sc.status ? STATUS_COLORS[sc.status] : 'var(--line)'}`,
              background: statusFilter === sc.status ? STATUS_COLORS[sc.status] : 'transparent',
              color: statusFilter === sc.status ? '#fff' : 'inherit',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: 500,
            }}
          >
            {sc.status} ({sc.count})
          </button>
        ))}
        <button
          onClick={() => { setStatusFilter('ALL'); setPage(1) }}
          style={{
            padding: '0.5rem 1rem',
            borderRadius: '8px',
            border: `2px solid ${statusFilter === 'ALL' ? 'var(--primary)' : 'var(--line)'}`,
            background: statusFilter === 'ALL' ? 'var(--primary)' : 'transparent',
            color: statusFilter === 'ALL' ? '#fff' : 'inherit',
            cursor: 'pointer',
            fontSize: '0.875rem',
          }}
        >
          All
        </button>
      </div>

      <div style={{ marginBottom: '1.5rem' }}>
        <input
          type="text"
          placeholder="Search by email, name, or company..."
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1) }}
          style={{
            width: '100%',
            padding: '0.75rem 1rem',
            borderRadius: '8px',
            border: '1px solid var(--line)',
            fontSize: '0.875rem',
          }}
        />
      </div>

      {loading ? (
        <div style={{ padding: '2rem', textAlign: 'center' }}>Loading...</div>
      ) : leads.length === 0 ? (
        <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--muted)' }}>No leads found</div>
      ) : (
        <>
          <div style={{ display: 'grid', gap: '0.75rem' }}>
            {leads.map(lead => (
              <div
                key={lead.id}
                onClick={() => setSelectedLead(lead)}
                style={{
                  padding: '1rem',
                  borderRadius: '8px',
                  border: '1px solid var(--line)',
                  cursor: 'pointer',
                  display: 'grid',
                  gridTemplateColumns: '2fr 1fr 1fr 1fr 80px',
                  gap: '1rem',
                  alignItems: 'center',
                  fontSize: '0.875rem',
                }}
              >
                <div>
                  <div style={{ fontWeight: 500 }}>{lead.email}</div>
                  {lead.name && <div style={{ color: 'var(--muted)', fontSize: '0.8rem' }}>{lead.name}{lead.company ? ` — ${lead.company}` : ''}</div>}
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>
                  {lead.run?.url ? (() => { try { return new URL(lead.run.url).hostname } catch { return lead.run.url } })() : '-'}
                </div>
                <div>
                  {lead.orders[0] ? (
                    <span style={{ color: lead.orders[0].status === 'PAID' ? '#16a34a' : '#ca8a04', fontWeight: 500 }}>
                      {lead.orders[0].status === 'PAID' ? `${lead.orders[0].amountToman.toLocaleString()} T` : lead.orders[0].status}
                    </span>
                  ) : (
                    <span style={{ color: 'var(--muted)' }}>No order</span>
                  )}
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>
                  {new Date(lead.createdAt).toLocaleDateString('fa-IR')}
                </div>
                <div>
                  <span style={{
                    display: 'inline-block',
                    padding: '0.25rem 0.5rem',
                    borderRadius: '4px',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    background: STATUS_COLORS[lead.status] || '#6b7280',
                    color: '#fff',
                  }}>
                    {lead.status}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginTop: '1.5rem' }}>
              <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} style={{ padding: '0.5rem 1rem' }}>
                Previous
              </button>
              <span style={{ padding: '0.5rem' }}>Page {page} of {totalPages}</span>
              <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} style={{ padding: '0.5rem 1rem' }}>
                Next
              </button>
            </div>
          )}
        </>
      )}

      {selectedLead && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex',
          alignItems: 'center', justifyContent: 'center', zIndex: 1000,
        }} onClick={() => setSelectedLead(null)}>
          <div style={{
            background: '#fff', borderRadius: '12px', padding: '2rem', maxWidth: '500px',
            width: '90%', maxHeight: '80vh', overflow: 'auto',
          }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.3rem', fontWeight: 600 }}>Lead Detail</h2>
              <button onClick={() => setSelectedLead(null)} style={{ fontSize: '1.5rem', lineHeight: 1 }}>&times;</button>
            </div>

            <div style={{ display: 'grid', gap: '0.75rem', marginBottom: '1.5rem' }}>
              <div><strong>Email:</strong> {selectedLead.email}</div>
              <div><strong>Name:</strong> {selectedLead.name || '-'}</div>
              <div><strong>Phone:</strong> {selectedLead.phone || '-'}</div>
              <div><strong>Company:</strong> {selectedLead.company || '-'}</div>
              <div><strong>Note:</strong> {selectedLead.note || '-'}</div>
              <div><strong>Website:</strong> {selectedLead.run?.url || '-'}</div>
              <div><strong>Status:</strong> <span style={{
                padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600,
                background: STATUS_COLORS[selectedLead.status], color: '#fff',
              }}>{selectedLead.status}</span></div>
              <div><strong>Created:</strong> {new Date(selectedLead.createdAt).toLocaleString('fa-IR')}</div>
              {selectedLead.orders[0] && (
                <div><strong>Order:</strong> {selectedLead.orders[0].status} — {selectedLead.orders[0].amountToman.toLocaleString()} Toman{selectedLead.orders[0].paidAt ? ` (paid ${new Date(selectedLead.orders[0].paidAt).toLocaleDateString('fa-IR')})` : ''}</div>
              )}
            </div>

            <div>
              <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.75rem' }}>Update Status</h3>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {STATUSES.map(s => (
                  <button
                    key={s}
                    disabled={updating || s === selectedLead.status}
                    onClick={() => {
                      if (s === 'LOST') {
                        const reason = prompt('Lost reason (optional):')
                        updateStatus(selectedLead.id, s, reason || undefined)
                      } else {
                        updateStatus(selectedLead.id, s)
                      }
                    }}
                    style={{
                      padding: '0.4rem 0.75rem', borderRadius: '6px', border: `1px solid ${STATUS_COLORS[s]}`,
                      background: s === selectedLead.status ? STATUS_COLORS[s] : 'transparent',
                      color: s === selectedLead.status ? '#fff' : 'inherit',
                      cursor: updating ? 'not-allowed' : 'pointer', fontSize: '0.8rem',
                      opacity: updating ? 0.6 : 1,
                    }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
