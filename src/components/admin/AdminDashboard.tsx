'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
interface Stats {
  totalAudits: number
  totalOrders: number
  pendingOrders: number
  recentAudits: Array<{
    id: string
    url: string
    status: string
    createdAt: string
  }>
}

export function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    fetch('/api/admin/stats')
      .then(res => {
        if (res.status === 401) {
          router.push('/admin/login')
          return null
        }
        return res.json()
      })
      .then(data => {
        if (data) {
          setStats(data)
        }
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [router])

  const handleLogout = async () => {
    await fetch('/api/admin/auth/logout', { method: 'POST' })
    router.push('/admin/login')
  }

  if (loading) {
    return <div style={{ padding: '2rem' }}>Loading...</div>
  }

  return (
    <div style={{ padding: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.8rem', fontWeight: 700 }}>Admin Dashboard</h1>
        <button onClick={handleLogout}>Logout</button>
      </div>
      
      <div style={{ display: 'grid', gap: '1.5rem', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', marginBottom: '2rem' }}>
        <div className="card" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--muted)' }}>Total Audits</h3>
          <p style={{ fontSize: '2rem', fontWeight: 700 }}>{stats?.totalAudits || 0}</p>
        </div>
        
        <div className="card" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--muted)' }}>Total Orders</h3>
          <p style={{ fontSize: '2rem', fontWeight: 700 }}>{stats?.totalOrders || 0}</p>
        </div>
        
        <div className="card" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--muted)' }}>Pending Orders</h3>
          <p style={{ fontSize: '2rem', fontWeight: 700 }}>{stats?.pendingOrders || 0}</p>
        </div>
      </div>

      <div className="card" style={{ padding: '1.5rem' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>Recent Audits</h3>
        <div style={{ display: 'grid', gap: '1rem' }}>
          {stats?.recentAudits?.map(audit => (
            <div key={audit.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '0.5rem', borderBottom: '1px solid var(--line)' }}>
              <div>
                <p style={{ fontWeight: 500 }}>{audit.url}</p>
                <p style={{ fontSize: '0.82rem', color: 'var(--muted)' }}>{new Date(audit.createdAt).toLocaleString('fa-IR')}</p>
              </div>
              <span className="badge">{audit.status}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
