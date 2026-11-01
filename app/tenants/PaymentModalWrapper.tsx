'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import PaymentModal from './PaymentModal'
import TenantDrawer from './TenantDrawer'
import TenantMessagesPanel from './TenantMessagesPanel'
import type { TenantSummaryRow, PaymentRow } from './actions'

type TicketRow = { id: string; title: string; status: string; created_at: string }
type MsgRow = { id: string; sender: 'tenant' | 'manager'; body: string; read_at: string | null; created_at: string }
type Filter = 'all' | 'pending' | 'paid' | 'pastdue' | 'renewals'

const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

function fmt(n: number) { return n.toLocaleString('en-US', { minimumFractionDigits: 2 }) }
function sfx(n: number) { return n === 1 ? 'st' : n === 2 ? 'nd' : n === 3 ? 'rd' : 'th' }

function Chip({ bg, color, border, children }: { bg: string; color: string; border: string; children: React.ReactNode }) {
  return (
    <span style={{ background: bg, color, border: `1px solid ${border}`, borderRadius: 20, padding: '2px 9px', fontSize: 10, fontWeight: 700, whiteSpace: 'nowrap' }}>
      {children}
    </span>
  )
}

export default function PaymentModalWrapper({
  tenants,
  histories,
  ticketsByTenant,
  unreadByTenant,
  messagesByTenant,
  portalBaseUrl,
}: {
  tenants: TenantSummaryRow[]
  histories: Record<string, PaymentRow[]>
  ticketsByTenant: Record<string, TicketRow[]>
  unreadByTenant: Record<string, number>
  messagesByTenant: Record<string, MsgRow[]>
  portalBaseUrl: string
}) {
  const router = useRouter()
  const now = new Date()
  const today = now.getDate()
  const monthLabel = MONTHS_SHORT[now.getMonth()] + ' ' + now.getFullYear()

  const [filter, setFilter] = useState<Filter>('all')
  const [search, setSearch] = useState('')
  const [modalTenant, setModalTenant] = useState<TenantSummaryRow | null>(null)
  const [drawerTenant, setDrawerTenant] = useState<TenantSummaryRow | null>(null)
  const [chatTenantId, setChatTenantId] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  // Derived stats
  const totalRent = tenants.reduce((s, t) => s + t.rent_amount, 0)
  const collected = tenants.filter(t => t.payment).reduce((s, t) => s + Number(t.payment!.amount), 0)
  const paidCount = tenants.filter(t => t.payment).length
  const collectionPct = totalRent > 0 ? Math.round(collected / totalRent * 100) : 0

  const isPastDue = (t: TenantSummaryRow) => !t.payment && today > t.rent_due_day
  const isPending = (t: TenantSummaryRow) => !t.payment && today <= t.rent_due_day
  const in90 = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000)
  const isRenewal = (t: TenantSummaryRow) => !!t.lease_end && new Date(t.lease_end) <= in90

  const pastDueList = tenants.filter(isPastDue)
  const pendingList = tenants.filter(isPending)
  const renewalList = tenants.filter(isRenewal)
  const pastDueAmt = pastDueList.reduce((s, t) => s + t.rent_amount, 0)
  const pendingAmt  = pendingList.reduce((s, t) => s + t.rent_amount, 0)
  const outstanding = pastDueAmt + pendingAmt

  const allOpenTickets = Object.values(ticketsByTenant).flat().filter(t => !['completed','closed'].includes(t.status))
  const totalUnread = Object.values(unreadByTenant).reduce((s, n) => s + n, 0)
  const occupancyPct = tenants.length > 0 ? Math.round(tenants.length / tenants.length * 100) : 0

  // Filtered list
  const filtered = tenants.filter(t => {
    if (search && !t.name.toLowerCase().includes(search.toLowerCase())) return false
    if (filter === 'paid')    return !!t.payment
    if (filter === 'pending') return !t.payment
    if (filter === 'pastdue') return isPastDue(t)
    if (filter === 'renewals') return isRenewal(t)
    return true
  })

  const filterCounts = {
    all: tenants.length,
    pending: pendingList.length,
    paid: paidCount,
    pastdue: pastDueList.length,
    renewals: renewalList.length,
  }

  const tabs: { key: Filter; label: string }[] = [
    { key: 'all', label: `All Residents` },
    { key: 'pending', label: `Pending Payment` },
    { key: 'paid', label: `Paid` },
    { key: 'pastdue', label: `Past Due` },
    { key: 'renewals', label: `Lease Renewals` },
  ]

  function openDrawer(t: TenantSummaryRow) {
    setDrawerTenant(t)
  }

  return (
    <>
      {/* ── KPI Cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14, marginBottom: 24 }}>
        {/* Monthly Rent Roll */}
        <div style={kpiCard}>
          <div style={kpiCardLabel}>Monthly Rent Roll</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.02em' }}>${fmt(totalRent)}</div>
            <div style={{ fontSize: 11, fontWeight: 700, color: collectionPct >= 100 ? '#16a34a' : 'var(--text-muted)' }}>{collectionPct}%</div>
          </div>
          <div style={{ marginTop: 8 }}>
            <div style={{ height: 4, background: 'var(--border)', borderRadius: 4, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${Math.min(collectionPct,100)}%`, background: 'var(--purple)', borderRadius: 4, transition: 'width .4s' }} />
            </div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>Collection progress · {tenants.length} active tenant{tenants.length !== 1 ? 's' : ''}</div>
          </div>
        </div>

        {/* Collected */}
        <div style={kpiCard}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={kpiCardLabel}>Collected — {monthLabel}</div>
            {paidCount === tenants.length && tenants.length > 0 && (
              <span style={{ fontSize: 14, lineHeight: 1 }}>✅</span>
            )}
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, color: paidCount > 0 ? '#16a34a' : 'var(--text)', letterSpacing: '-0.02em' }}>${fmt(collected)}</div>
          <div style={{ marginTop: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{paidCount} of {tenants.length} paid in full</div>
            <span style={{ fontSize: 10, fontWeight: 700, color: paidCount === tenants.length ? '#16a34a' : '#b45309', background: paidCount === tenants.length ? '#f0fdf4' : '#fffbeb', border: `1px solid ${paidCount === tenants.length ? '#bbf7d0' : '#fde68a'}`, borderRadius: 20, padding: '2px 8px' }}>
              {paidCount === tenants.length ? 'All Paid' : 'In Progress'}
            </span>
          </div>
        </div>

        {/* Outstanding */}
        <div style={kpiCard}>
          <div style={kpiCardLabel}>Outstanding Balance</div>
          <div style={{ fontSize: 26, fontWeight: 800, color: outstanding > 0 ? '#b91c1c' : 'var(--text)', letterSpacing: '-0.02em' }}>${fmt(outstanding)}</div>
          <div style={{ marginTop: 6, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {pendingList.length > 0 && (
              <span style={{ fontSize: 10, fontWeight: 700, color: '#b45309', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 20, padding: '2px 8px' }}>
                {pendingList.length} Pending (${fmt(pendingAmt)})
              </span>
            )}
            {pastDueList.length > 0 && (
              <span style={{ fontSize: 10, fontWeight: 700, color: '#b91c1c', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 20, padding: '2px 8px' }}>
                {pastDueList.length} Overdue (${fmt(pastDueAmt)})
              </span>
            )}
            {outstanding === 0 && <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>All clear</span>}
          </div>
        </div>

        {/* Maintenance & Leases */}
        <div style={kpiCard}>
          <div style={kpiCardLabel}>Maintenance &amp; Leases</div>
          <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.02em' }}>{occupancyPct}%</div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 8 }}>Occupancy ({tenants.length}/{tenants.length} Units Leased)</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: allOpenTickets.length > 0 ? '#d97706' : '#16a34a', background: allOpenTickets.length > 0 ? '#fffbeb' : '#f0fdf4', border: `1px solid ${allOpenTickets.length > 0 ? '#fde68a' : '#bbf7d0'}`, borderRadius: 20, padding: '3px 9px' }}>
              {allOpenTickets.length} Open Work Orders
            </span>
            {renewalList.length > 0 && (
              <span style={{ fontSize: 11, fontWeight: 700, color: '#7c3aed', background: '#f5f3ff', border: '1px solid #ddd6fe', borderRadius: 20, padding: '3px 9px' }}>
                {renewalList.length} Renewals
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── Filter Tabs + Search ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 0, borderBottom: '2px solid var(--border)', overflowX: 'auto', flexShrink: 0 }}>
          {tabs.map(({ key, label }) => {
            const count = filterCounts[key]
            const isActive = filter === key
            const isPastDueTab = key === 'pastdue' && count > 0
            return (
              <button
                key={key}
                onClick={() => setFilter(key)}
                style={{
                  padding: '8px 14px',
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer',
                  background: 'none',
                  border: 'none',
                  borderBottom: isActive ? '2px solid var(--purple)' : '2px solid transparent',
                  marginBottom: -2,
                  color: isActive ? 'var(--purple)' : isPastDueTab ? '#b91c1c' : 'var(--text-muted)',
                  whiteSpace: 'nowrap',
                }}
              >
                {label}
                {count > 0 && (
                  <span style={{ marginLeft: 5, fontSize: 10, fontWeight: 800, background: isActive ? 'var(--purple)' : isPastDueTab ? '#fef2f2' : 'var(--bg)', color: isActive ? '#fff' : isPastDueTab ? '#b91c1c' : 'var(--text-muted)', border: `1px solid ${isActive ? 'transparent' : isPastDueTab ? '#fca5a5' : 'var(--border)'}`, borderRadius: 20, padding: '1px 6px' }}>
                    {count}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        <input
          placeholder="Search residents…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ padding: '8px 12px', borderRadius: 8, border: '1.5px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: 13, width: 200, outline: 'none' }}
        />
      </div>

      {/* ── Tenant Cards ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {filtered.length === 0 && (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '48px 0', fontSize: 13 }}>No residents match this filter.</div>
        )}
        {filtered.map(t => {
          const tenantTickets = ticketsByTenant[t.id] ?? []
          const openTicketCount = tenantTickets.filter(tk => !['completed','closed'].includes(tk.status)).length
          const totalTicketCount = tenantTickets.length
          const unread = unreadByTenant[t.id] ?? 0
          const pastDue = isPastDue(t)
          const renewal = isRenewal(t)
          const leaseDaysLeft = t.lease_end ? Math.ceil((new Date(t.lease_end).getTime() - Date.now()) / (86400000)) : null

          return (
            <div key={t.id} style={{ background: 'var(--card)', border: `1px solid ${pastDue ? '#fca5a5' : 'var(--border)'}`, borderLeft: `3px solid ${pastDue ? '#dc2626' : t.payment ? '#16a34a' : 'var(--purple)'}`, borderRadius: 'var(--radius)', boxShadow: 'var(--shadow)' }}>
              <div style={{ padding: '16px 20px', display: 'grid', gridTemplateColumns: '40px 1fr auto auto', gap: 12, alignItems: 'center' }}>
                {/* Avatar */}
                <button
                  onClick={() => openDrawer(t)}
                  style={{ width: 40, height: 40, borderRadius: '50%', background: pastDue ? '#fef2f2' : 'var(--purple-soft)', border: `1.5px solid ${pastDue ? '#fca5a5' : 'var(--purple-border)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 15, color: pastDue ? '#b91c1c' : 'var(--purple)', cursor: 'pointer', flexShrink: 0 }}
                >
                  {t.name.split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase()}
                </button>

                {/* Info */}
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap', marginBottom: 4 }}>
                    <button
                      onClick={() => openDrawer(t)}
                      style={{ fontSize: 14, fontWeight: 800, color: 'var(--text)', cursor: 'pointer', background: 'none', border: 'none', padding: 0, textAlign: 'left' }}
                    >
                      {t.name}
                    </button>
                    {/* Status badge */}
                    {pastDue
                      ? <Chip bg="#fef2f2" color="#b91c1c" border="#fca5a5">⚠ Past Due</Chip>
                      : t.payment
                        ? <Chip bg="#f0fdf4" color="#16a34a" border="#bbf7d0">✓ Paid for {monthLabel}</Chip>
                        : <Chip bg="#fffbeb" color="#b45309" border="#fde68a">⏳ Due the {t.rent_due_day}{sfx(t.rent_due_day)}</Chip>
                    }
                    {t.email && <Chip bg="#f0f4ff" color="#4338ca" border="#c7d2fe">Portal Active</Chip>}
                    {renewal && leaseDaysLeft !== null && leaseDaysLeft > 0 && (
                      <Chip bg="#f5f3ff" color="#7c3aed" border="#ddd6fe">Renewal in {leaseDaysLeft}d</Chip>
                    )}
                    {unread > 0 && (
                      <Chip bg="#fef2f2" color="#dc2626" border="#fca5a5">{unread} new msg{unread > 1 ? 's' : ''}</Chip>
                    )}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    {t.unit && <span>{t.unit}</span>}
                    {(t.property_name || t.property_address) && <span>📍 {t.property_name ?? t.property_address}</span>}
                    {t.email && <span>✉ {t.email}</span>}
                    {t.lease_end && <span>📅 Ends {new Date(t.lease_end).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})}</span>}
                  </div>
                </div>

                {/* Rent + Maintenance */}
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--purple)' }}>${fmt(t.rent_amount)}<span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)' }}>/mo</span></div>
                  {!t.payment && (
                    <div style={{ fontSize: 11, fontWeight: 700, color: pastDue ? '#b91c1c' : '#b45309', marginTop: 2 }}>
                      ${fmt(t.rent_amount)} {pastDue ? 'Overdue' : 'Pending for ' + monthLabel}
                    </div>
                  )}
                  {t.payment && (
                    <div style={{ fontSize: 11, color: '#16a34a', fontWeight: 700, marginTop: 2 }}>$0.00 Balance</div>
                  )}
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>
                    🔧 {openTicketCount} Open / {totalTicketCount} Total
                  </div>
                </div>

                {/* Buttons */}
                <div style={{ display: 'flex', gap: 6, flexShrink: 0, flexDirection: 'column', alignItems: 'flex-end' }}>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      onClick={() => setModalTenant(t)}
                      style={{ background: 'var(--purple)', color: '#fff', border: 'none', borderRadius: 8, padding: '7px 12px', fontSize: 11, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}
                    >
                      💳 Record Payment
                    </button>
                    <TenantMessagesPanel
                      tenantId={t.id}
                      tenantToken={t.tenant_token}
                      tenantName={t.name}
                      hasUnread={unread > 0}
                      messages={(messagesByTenant[t.id] ?? []) as MsgRow[]}
                      tenantEmail={t.email ?? null}
                      portalUrl={`${portalBaseUrl}/tenant/${t.tenant_token}`}
                    />
                  </div>
                  <button
                    onClick={() => setExpandedId(expandedId === t.id ? null : t.id)}
                    style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, padding: '5px 10px', fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', cursor: 'pointer' }}
                  >
                    {expandedId === t.id ? '▲ Hide' : '▼ History'}
                  </button>
                </div>
              </div>

              {/* History accordion */}
              {expandedId === t.id && (
                <div style={{ borderTop: '1px solid var(--border)', padding: '14px 20px', background: 'var(--bg)' }}>
                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.13em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 10 }}>Payment History</div>
                  {(histories[t.id] ?? []).length === 0 ? (
                    <div style={{ fontSize: 13, color: 'var(--text-muted)', padding: '8px 0' }}>No payments recorded yet.</div>
                  ) : (
                    <div>
                      {(histories[t.id] ?? []).map((p, i) => (
                        <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 0', borderBottom: i < (histories[t.id] ?? []).length - 1 ? '1px solid var(--border)' : 'none' }}>
                          <div>
                            <div style={{ fontSize: 12, fontWeight: 700 }}>{MONTHS_SHORT[(p.period_month ?? 1) - 1]} {p.period_year}</div>
                            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 1 }}>
                              {p.method?.charAt(0).toUpperCase() + p.method?.slice(1)} · {new Date(p.paid_at).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})}
                            </div>
                          </div>
                          <div style={{ fontSize: 13, fontWeight: 800, color: '#16a34a' }}>${fmt(Number(p.amount))}</div>
                        </div>
                      ))}
                    </div>
                  )}
                  <div style={{ marginTop: 12, padding: '10px 12px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, fontSize: 11 }}>
                    <span style={{ fontWeight: 700, color: '#d97706' }}>📧 Auto-reminder</span>
                    <span style={{ color: 'var(--text-muted)', marginLeft: 6 }}>
                      Sent 3 days before the {t.rent_due_day}{sfx(t.rent_due_day)} · {t.email ? 'Scheduled' : 'No email on file'}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* ── Resident Communication section ── */}
      {tenants.length > 0 && totalUnread > 0 && (
        <div style={{ marginTop: 28, padding: '14px 18px', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#b91c1c' }}>💬 {totalUnread} unread message{totalUnread > 1 ? 's' : ''} from residents</span>
          <span style={{ fontSize: 11, color: '#b91c1c' }}>Open Chat buttons above to reply</span>
        </div>
      )}

      {/* Payment modal */}
      {modalTenant && (
        <PaymentModal tenant={modalTenant} onClose={() => { setModalTenant(null); router.refresh() }} />
      )}

      {/* Tenant drawer */}
      {drawerTenant && (
        <TenantDrawer
          tenant={drawerTenant}
          history={histories[drawerTenant.id] ?? []}
          tickets={ticketsByTenant[drawerTenant.id] ?? []}
          unread={unreadByTenant[drawerTenant.id] ?? 0}
          messages={(messagesByTenant[drawerTenant.id] ?? []) as MsgRow[]}
          portalBaseUrl={portalBaseUrl}
          onClose={() => setDrawerTenant(null)}
          onRecordPayment={() => setModalTenant(drawerTenant)}
        />
      )}
    </>
  )
}

const kpiCard: React.CSSProperties = {
  background: 'var(--card)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius)',
  padding: '18px 20px',
  boxShadow: 'var(--shadow)',
}
const kpiCardLabel: React.CSSProperties = {
  fontSize: 10, fontWeight: 700, letterSpacing: '.13em', textTransform: 'uppercase',
  color: 'var(--text-muted)', marginBottom: 8,
}
