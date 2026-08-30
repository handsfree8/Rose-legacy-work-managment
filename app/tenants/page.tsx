import { supabaseAdmin as supabase } from '@/lib/supabase/admin'
import Link from 'next/link'
import TenantMessagesPanel from './TenantMessagesPanel'
import { getCurrentMonthSummary, getPaymentHistory } from './actions'
import PaymentModalWrapper from './PaymentModalWrapper'

export const dynamic = 'force-dynamic'

export default async function TenantsPage() {
  // Fetch payment summary and histories
  const summary = await getCurrentMonthSummary()
  const histories: Record<string, Awaited<ReturnType<typeof getPaymentHistory>>> = {}
  await Promise.all(summary.map(async t => {
    histories[t.id] = await getPaymentHistory(t.id)
  }))

  // Fetch tenants with tokens for messages panel
  const { data: tenants } = await supabase
    .from('tenants')
    .select(`
      id, name, unit, rent_amount, rent_due_day, active, tenant_token, lease_end,
      properties(id, name, address, city, state)
    `)
    .eq('active', true)
    .order('created_at', { ascending: false })

  // Load unread message counts per tenant
  const tenantIds = (tenants || []).map(t => t.id)

  // Load all messages + compute unread counts per tenant
  const { data: allMessages } = tenantIds.length
    ? await supabase
        .from('tenant_messages')
        .select('id, tenant_id, sender, body, read_at, created_at')
        .in('tenant_id', tenantIds)
        .order('created_at', { ascending: true })
    : { data: [] }

  type MsgRow = { id: string; tenant_id: string; sender: string; body: string; read_at: string | null; created_at: string }
  const messagesByTenant: Record<string, MsgRow[]> = {}
  const unreadByTenant: Record<string, number> = {}
  for (const m of (allMessages ?? []) as MsgRow[]) {
    if (!messagesByTenant[m.tenant_id]) messagesByTenant[m.tenant_id] = []
    messagesByTenant[m.tenant_id].push(m)
    if (m.sender === 'tenant' && !m.read_at) {
      unreadByTenant[m.tenant_id] = (unreadByTenant[m.tenant_id] || 0) + 1
    }
  }

  // Load recent tickets submitted by tenants
  const { data: tickets } = tenantIds.length
    ? await supabase
        .from('tickets')
        .select('id, title, status, created_at, tenant_id')
        .in('tenant_id', tenantIds)
        .order('created_at', { ascending: false })
        .limit(50)
    : { data: [] }

  type TicketRow = NonNullable<typeof tickets>[number]
  const ticketsByTenant: Record<string, TicketRow[]> = {}
  for (const t of tickets || []) {
    if (!t.tenant_id) continue
    if (!ticketsByTenant[t.tenant_id]) ticketsByTenant[t.tenant_id] = []
    ticketsByTenant[t.tenant_id]!.push(t)
  }

  const totalUnread = Object.values(unreadByTenant).reduce((s, n) => s + n, 0)

  return (
    <main style={{ padding: '28px 20px 60px', maxWidth: 860, margin: '0 auto' }}>
      {/* Back link */}
      <Link href="/dashboard" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', textDecoration: 'none', marginBottom: 20 }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
        Back to Dashboard
      </Link>

      {/* Header */}
      <div className="tenants-header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>Tenants</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 4 }}>
            Manage residents, record payments, and reply to messages.
          </p>
        </div>
        {totalUnread > 0 && (
          <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 10, padding: '8px 14px', fontSize: 13, fontWeight: 700, color: '#b91c1c' }}>
            {totalUnread} unread message{totalUnread > 1 ? 's' : ''}
          </div>
        )}
      </div>

      {summary.length === 0 && (
        <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '60px 0', fontSize: 14 }}>
          No active tenants yet. Add one from Supabase or ask your developer.
        </div>
      )}

      {/* Payment summary + payment cards */}
      {summary.length > 0 && (
        <PaymentModalWrapper tenants={summary} histories={histories} />
      )}

      {/* Messages & tickets section */}
      {(tenants || []).length > 0 && (
        <div style={{ marginTop: 36 }}>
          <h2 style={{ fontSize: 16, fontWeight: 800, margin: '0 0 16px' }}>Messages &amp; Requests</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {(tenants || []).map(tenant => {
              const prop = Array.isArray(tenant.properties) ? tenant.properties[0] : tenant.properties
              const unread = unreadByTenant[tenant.id] || 0
              const tenantTickets = ticketsByTenant[tenant.id] || []
              const openTickets = tenantTickets.filter(t => t.status !== 'completed' && t.status !== 'closed')

              return (
                <div key={tenant.id} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow)', overflow: 'hidden' }}>
                  {/* Tenant header row */}
                  <div style={{ padding: '18px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                        <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--purple-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--purple)' }}>{tenant.name.charAt(0)}</span>
                        </div>
                        <div>
                          <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text)' }}>{tenant.name}</div>
                          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                            {tenant.unit && <span>{tenant.unit} · </span>}
                            {prop?.name || prop?.address || '—'}
                            {prop?.city && `, ${prop.city}`}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--purple)' }}>
                          ${Number(tenant.rent_amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Due day {tenant.rent_due_day}</div>
                      </div>
                      {unread > 0 && (
                        <div style={{ background: '#dc2626', color: '#fff', borderRadius: 20, padding: '3px 9px', fontSize: 11, fontWeight: 700 }}>
                          {unread} new
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Stats bar */}
                  <div className="tenants-stats-bar" style={{ borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)', background: 'var(--bg)', display: 'flex' }}>
                    <div style={{ flex: 1, padding: '10px 20px', borderRight: '1px solid var(--border)' }}>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>Open Requests</div>
                      <div style={{ fontSize: 18, fontWeight: 800, color: openTickets.length > 0 ? 'var(--purple)' : 'var(--text-muted)' }}>{openTickets.length}</div>
                    </div>
                    <div style={{ flex: 1, padding: '10px 20px', borderRight: '1px solid var(--border)' }}>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>Total Requests</div>
                      <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)' }}>{tenantTickets.length}</div>
                    </div>
                    <div style={{ flex: 1, padding: '10px 20px' }}>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>Lease Ends</div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>
                        {tenant.lease_end ? new Date(tenant.lease_end).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                      </div>
                    </div>
                  </div>

                  {/* Tickets preview */}
                  {openTickets.length > 0 && (
                    <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border)' }}>
                      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 8 }}>Open Requests</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {openTickets.slice(0, 3).map(t => (
                          <Link key={t.id} href={`/tickets/${t.id}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', textDecoration: 'none', padding: '8px 12px', background: 'var(--bg)', borderRadius: 8, gap: 8 }}>
                            <span style={{ fontSize: 13, color: 'var(--text)', fontWeight: 600 }}>{t.title}</span>
                            <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--purple)', background: 'var(--purple-soft)', borderRadius: 20, padding: '2px 8px', whiteSpace: 'nowrap', flexShrink: 0 }}>{t.status.replace('_', ' ')}</span>
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Messages panel + actions */}
                  <TenantMessagesPanel
                    tenantId={tenant.id}
                    tenantToken={tenant.tenant_token}
                    tenantName={tenant.name}
                    hasUnread={unread > 0}
                    messages={(messagesByTenant[tenant.id] ?? []) as { id: string; sender: 'tenant' | 'manager'; body: string; read_at: string | null; created_at: string }[]}
                  />
                </div>
              )
            })}
          </div>
        </div>
      )}
    </main>
  )
}
