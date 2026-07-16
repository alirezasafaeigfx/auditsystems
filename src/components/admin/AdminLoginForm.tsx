'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { fetchCSRFHeaders } from '@/lib/csrf-client'

export function AdminLoginForm() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const csrfHeaders = await fetchCSRFHeaders()
      const res = await fetch('/api/admin/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...csrfHeaders },
        body: JSON.stringify({ username, password }),
      })

      if (res.ok) {
        router.push('/admin')
        router.refresh()
      } else {
        const data = await res.json()
        setError(data.error || 'Login failed')
      }
    } catch {
      setError('Network error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', padding: '2rem' }}>
      <div style={{ width: '100%', maxWidth: '24rem', display: 'grid', gap: '2rem', padding: '2rem', background: 'var(--surface)', borderRadius: '18px', border: '1px solid var(--line)', boxShadow: 'var(--shadow-card)' }}>
        <h2 style={{ textAlign: 'center', fontSize: '1.5rem', fontWeight: 700 }}>Admin Login</h2>
        
        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '1.5rem' }}>
          <label>
            Username
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </label>

          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </label>

          {error && (
            <div style={{ color: 'var(--danger)', fontSize: '0.88rem', textAlign: 'center' }}>{error}</div>
          )}

          <button
            type="submit"
            disabled={loading}
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  )
}
