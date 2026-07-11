import type { Metadata } from 'next'
import { AdminLeads } from '@/components/admin/AdminLeads'

export const metadata: Metadata = {
  title: 'Lead Management - Audit Systems',
  robots: { index: false, follow: false },
}

export default function AdminLeadsPage() {
  return <AdminLeads />
}
