import { supabaseAdmin as supabase } from '@/lib/supabase/admin'
import Link from 'next/link'
import { getCurrentMonthSummary, getPaymentHistory } from './actions'
import PaymentModalWrapper from './PaymentModalWrapper'

export const dynamic = 'force-dynamic'

export default async function TenantsPage() {
  const summary = await getCurrentMonthSummary()
  const histories: Record<string, Awaited<ReturnType<typeof getPaymentHistory>>> = {}
  await Promise.all(summary.map(async t => {
    histories[t.id] = await getPaymentHistory(t.id)
  }))

  const tenantIds = summary.map(t => t.id)

  // Messages + unread counts
  const { data: allMessages } = tenantIds.length
    ? await supabase
        .from('tenant_messages')
        .select('id, tenant_id, sender, body, read_at, created_at')
        .in('tenant_id', tenantIds)
        .order('created_at', { ascending: true })
    : { data: [] }

  type MsgRow = { id: string; tenant_id: string; sender: 'tenant' | 'manager'; body: string; read_at: string | null; created_at: string }
  const messagesByTenant: Record<string, MsgRow[]> = {}
  const unreadByTenant: Record<string, number> = {}
  for (const m of (allMessages ?? []) as MsgRow[]) {
    if (!messagesByTenant[m.tenant_id]) messagesByTenant[m.tenant_id] = []
    messagesByTenant[m.tenant_id].push(m)
    if (m.sender === 'tenant' && !m.read_at) {
      unreadByTenant[m.tenant_id] = (unreadByTenant[m.tenant_id] || 0) + 1
    }
  }

  // Tickets
  const { data: tickets } = tenantIds.length
    ? await supabase
        .from('tickets')
        .select('id, title, status, created_at, tenant_id')
        .in('tenant_id', tenantIds)
        .order('created_at', { ascending: false })
        .limit(100)
    : { data: [] }

  type TicketRow = { id: string; title: string; status: string; created_at: string }
  const ticketsByTenant: Record<string, TicketRow[]> = {}
  for (const t of tickets || []) {
    if (!t.tenant_id) continue
    if (!ticketsByTenant[t.tenant_id]) ticketsByTenant[t.tenant_id] = []
    ticketsByTenant[t.tenant_id]!.push({ id: t.id, title: t.title, status: t.status, created_at: t.created_at })
  }

  const portalBaseUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''

  return (
    <main style={{ padding: '28px 20px 60px', maxWidth: 1100, margin: '0 auto' }}>
      <Link href="/dashboard" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', textDecoration: 'none', marginBottom: 20 }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
        Back to Dashboard
      </Link>

      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>Tenants</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 4 }}>
          Manage residents, record payments, and reply to messages.
        </p>
      </div>

      {summary.length === 0 ? (
        <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '60px 0', fontSize: 14 }}>
          No active tenants yet.
        </div>
      ) : (
        <PaymentModalWrapper
          tenants={summary}
          histories={histories}
          ticketsByTenant={ticketsByTenant}
          unreadByTenant={unreadByTenant}
          messagesByTenant={messagesByTenant as Record<string, { id: string; sender: 'tenant' | 'manager'; body: string; read_at: string | null; created_at: string }[]>}
          portalBaseUrl={portalBaseUrl}
        />
      )}
    </main>
  )
}
