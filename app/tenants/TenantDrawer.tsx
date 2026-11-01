'use client'

import { useState } from 'react'
import type { TenantSummaryRow, PaymentRow } from './actions'
import TenantMessagesPanel from './TenantMessagesPanel'

type TicketRow = { id: string; title: string; status: string; created_at: string }
type MsgRow = { id: string; sender: 'tenant' | 'manager'; body: string; read_at: string | null; created_at: string }

type Tab = 'overview' | 'ledger' | 'maintenance'

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const METHOD_LABEL: Record<string,string> = { check:'Check', cash:'Cash', transfer:'Transfer' }

function fmt(n: number) { return n.toLocaleString('en-US', { minimumFractionDigits: 2 }) }

function leaseMonthsLeft(end: string | null) {
  if (!end) return null
  const diff = new Date(end).getTime() - Date.now()
  const months = Math.round(diff / (1000 * 60 * 60 * 24 * 30))
  return months
}

function daysUntil(end: string | null) {
  if (!end) return null
  const diff = new Date(end).getTime() - Date.now()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

type Props = {
  tenant: TenantSummaryRow
  history: PaymentRow[]
  tickets: TicketRow[]
  unread: number
  messages: MsgRow[]
  portalBaseUrl: string
  onClose: () => void
  onRecordPayment: () => void
}

export default function TenantDrawer({ tenant, history, tickets, unread, messages, portalBaseUrl, onClose, onRecordPayment }: Props) {
  const [tab, setTab] = useState<Tab>('overview')

  const openTickets = tickets.filter(t => !['completed','closed'].includes(t.status))
  const resolvedTickets = tickets.filter(t => ['completed','closed'].includes(t.status))
  const monthsLeft = leaseMonthsLeft(tenant.lease_end)
  const leaseDaysLeft = daysUntil(tenant.lease_end)
  const isPaid = !!tenant.payment
  const today = new Date().getDate()
  const isPastDue = !isPaid && today > tenant.rent_due_day
  const residentId = '#RES-' + tenant.id.substring(0, 4).toUpperCase()
  const portalUrl = `${portalBaseUrl}/tenant/${tenant.tenant_token}`

  function statusBadge() {
    if (isPastDue) return <span style={badge('#fef2f2','#b91c1c','#fca5a5')}>⚠ Past Due</span>
    if (isPaid) return <span style={badge('#f0fdf4','#16a34a','#bbf7d0')}>✓ Paid</span>
    return <span style={badge('#fffbeb','#b45309','#fde68a')}>⏳ Due the {tenant.rent_due_day}{sfx(tenant.rent_due_day)}</span>
  }

  const tabStyle = (t: Tab) => ({
    padding: '10px 14px',
    fontSize: 12,
    fontWeight: 700,
    cursor: 'pointer',
    background: 'none',
    border: 'none',
    borderBottom: tab === t ? '2px solid var(--purple)' : '2px solid transparent',
    color: tab === t ? 'var(--purple)' : 'var(--text-muted)',
    whiteSpace: 'nowrap' as const,
  })

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, zIndex: 40, background: 'rgba(15,10,26,.45)', backdropFilter: 'blur(2px)' }}
      />

      {/* Drawer */}
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, zIndex: 50,
        width: '100%', maxWidth: 520,
        background: 'var(--card)',
        boxShadow: '-8px 0 40px rgba(0,0,0,.18)',
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{ padding: '20px 22px 0', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--purple)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span style={{ fontSize: 18, fontWeight: 800, color: '#fff', letterSpacing: '-0.02em' }}>
                  {tenant.name.split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase()}
                </span>
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)' }}>{tenant.name}</span>
                  <span style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600 }}>ID: {residentId}</span>
                </div>
                <div style={{ display: 'flex', gap: 6, marginTop: 5, flexWrap: 'wrap' }}>
                  {statusBadge()}
                  {tenant.email && <span style={badge('#f0f4ff','#4338ca','#c7d2fe')}>🌐 Portal Active</span>}
                  {leaseDaysLeft !== null && leaseDaysLeft <= 90 && leaseDaysLeft > 0 && (
                    <span style={badge('#f5f3ff','#7c3aed','#ddd6fe')}>📅 Renewal in {leaseDaysLeft}d</span>
                  )}
                </div>
              </div>
            </div>
            <button onClick={onClose} style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 10px', fontSize: 18, cursor: 'pointer', color: 'var(--text-muted)', lineHeight: 1, flexShrink: 0 }}>×</button>
          </div>

          {/* Contact row */}
          {(tenant.email || tenant.unit) && (
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12, display: 'flex', gap: 14, flexWrap: 'wrap' }}>
              {tenant.email && <span>✉ {tenant.email}</span>}
              {tenant.unit && <span>📍 {tenant.unit}{tenant.property_name ? ' · ' + tenant.property_name : ''}{tenant.property_address ? ' — ' + tenant.property_address : ''}</span>}
            </div>
          )}

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
            <button
              onClick={() => { onClose(); onRecordPayment() }}
              style={{ flex: 1, background: 'var(--purple)', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
            >
              💳 Record Payment
            </button>
            <button
              onClick={() => setTab('maintenance')}
              style={{ flex: 1, background: 'var(--card)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 8, padding: '9px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
            >
              🔧 Maintenance {tickets.length > 0 ? `(${tickets.length})` : ''}
            </button>
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', gap: 0, overflowX: 'auto' }}>
            <button style={tabStyle('overview')} onClick={() => setTab('overview')}>Overview &amp; Lease</button>
            <button style={tabStyle('ledger')} onClick={() => setTab('ledger')}>Ledger &amp; Balance</button>
            <button style={tabStyle('maintenance')} onClick={() => setTab('maintenance')}>
              Maintenance {openTickets.length > 0 ? `(${openTickets.length})` : ''}
            </button>
          </div>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 22px' }}>
          {tab === 'overview' && <OverviewTab tenant={tenant} monthsLeft={monthsLeft} />}
          {tab === 'ledger' && <LedgerTab tenant={tenant} history={history} />}
          {tab === 'maintenance' && <MaintenanceTab tickets={tickets} openTickets={openTickets} resolvedTickets={resolvedTickets} />}
        </div>

        {/* Footer */}
        <div style={{ borderTop: '1px solid var(--border)', padding: '14px 22px', display: 'flex', gap: 8, flexShrink: 0 }}>
          <a
            href={portalUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{ flex: 1, textAlign: 'center', background: 'var(--bg)', color: 'var(--text-muted)', border: '1px solid var(--border)', borderRadius: 8, padding: '9px 12px', fontSize: 12, fontWeight: 700, textDecoration: 'none' }}
          >
            🔗 Portal Link
          </a>
          <div style={{ flex: 2 }}>
            <TenantMessagesPanel
              tenantId={tenant.id}
              tenantToken={tenant.tenant_token}
              tenantName={tenant.name}
              hasUnread={unread > 0}
              messages={messages}
              tenantEmail={tenant.email ?? null}
              portalUrl={portalUrl}
              compact
            />
          </div>
        </div>
      </div>
    </>
  )
}

function OverviewTab({ tenant, monthsLeft }: { tenant: TenantSummaryRow; monthsLeft: number | null }) {
  const leaseStart = null // not in current schema, show what we have
  const leaseEndFmt = tenant.lease_end
    ? new Date(tenant.lease_end).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : null
  const dueOrdinal = tenant.rent_due_day + sfx(tenant.rent_due_day)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      {/* Active Lease */}
      <section>
        <div style={sectionHeader}>
          <span>📋 Active Lease Agreement</span>
          <span style={{ fontSize: 10, fontWeight: 700, color: '#16a34a', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 20, padding: '2px 8px' }}>Active Term</span>
        </div>
        <div style={card}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
            <div>
              <div style={kpiLabel}>Monthly Rent</div>
              <div style={kpiValue}>${(tenant.rent_amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>Due {dueOrdinal} of each month</div>
            </div>
            {leaseEndFmt && (
              <div>
                <div style={kpiLabel}>Lease Ends</div>
                <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text)' }}>{leaseEndFmt}</div>
                {monthsLeft !== null && (
                  <div style={{ fontSize: 10, color: monthsLeft <= 3 ? '#b45309' : 'var(--text-muted)', marginTop: 2 }}>
                    {monthsLeft > 0 ? `${monthsLeft} months remaining` : 'Expired'}
                  </div>
                )}
              </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {tenant.unit && <span style={infoPill}>🏠 {tenant.unit}</span>}
            {tenant.property_name && <span style={infoPill}>🏢 {tenant.property_name}</span>}
            {tenant.email && <span style={infoPill}>🌐 Portal Active</span>}
          </div>
        </div>
      </section>

      {/* Current payment status */}
      <section>
        <div style={sectionHeader}>💰 Financial Status</div>
        <div style={card}>
          {tenant.payment ? (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>
                  {MONTHS[(tenant.payment.period_month ?? 1) - 1]} {tenant.payment.period_year} Rent
                </span>
                <span style={badge('#f0fdf4','#16a34a','#bbf7d0')}>✓ Paid</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--text-muted)' }}>
                <span>{METHOD_LABEL[tenant.payment.method] ?? tenant.payment.method}</span>
                <span style={{ fontWeight: 700, color: '#16a34a' }}>${fmt(Number(tenant.payment.amount))}</span>
              </div>
              {tenant.payment.paid_at && (
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                  Received {new Date(tenant.payment.paid_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </div>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>Current Month Balance</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>No payment recorded this month</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 20, fontWeight: 800, color: '#b91c1c' }}>${fmt(tenant.rent_amount)}</div>
                <div style={{ fontSize: 10, color: '#b91c1c', fontWeight: 700 }}>Outstanding</div>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}

function LedgerTab({ tenant, history }: { tenant: TenantSummaryRow; history: PaymentRow[] }) {
  const total = history.reduce((s, p) => s + Number(p.amount), 0)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <section>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div style={sectionHeader}>📊 Payment Ledger</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Last 24 months</div>
        </div>
        {history.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-muted)', fontSize: 13 }}>No payments recorded yet.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {history.map((p, i) => (
              <div key={p.id} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '12px 0',
                borderBottom: i < history.length - 1 ? '1px solid var(--border)' : 'none',
              }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>
                    {MONTHS[(p.period_month ?? 1) - 1]} {p.period_year}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                    {METHOD_LABEL[p.method] ?? p.method}
                    {p.paid_at && ' · ' + new Date(p.paid_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 14, fontWeight: 800, color: '#16a34a' }}>+${fmt(Number(p.amount))}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>
                    {p.status === 'paid' ? '✓ Confirmed' : p.status}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {history.length > 0 && (
        <div style={{ ...card, display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--purple-soft)', border: '1px solid var(--purple-border)' }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--purple)' }}>Total Collected</span>
          <span style={{ fontSize: 18, fontWeight: 800, color: 'var(--purple)' }}>${fmt(total)}</span>
        </div>
      )}
    </div>
  )
}

function MaintenanceTab({ tickets, openTickets, resolvedTickets }: { tickets: TicketRow[]; openTickets: TicketRow[]; resolvedTickets: TicketRow[] }) {
  const [filter, setFilter] = useState<'all' | 'open' | 'resolved'>('all')
  const shown = filter === 'open' ? openTickets : filter === 'resolved' ? resolvedTickets : tickets

  const STATUS_COLOR: Record<string, {bg: string; color: string; border: string}> = {
    open:        { bg:'#eff6ff', color:'#1d4ed8', border:'#bfdbfe' },
    in_progress: { bg:'#fffbeb', color:'#b45309', border:'#fde68a' },
    pending:     { bg:'#f5f3ff', color:'#7c3aed', border:'#ddd6fe' },
    completed:   { bg:'#f0fdf4', color:'#16a34a', border:'#bbf7d0' },
    closed:      { bg:'#f1f5f9', color:'#64748b', border:'#e2e8f0' },
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 6 }}>
        {(['all','open','resolved'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{
            padding: '5px 12px', borderRadius: 20, fontSize: 11, fontWeight: 700,
            cursor: 'pointer', border: '1px solid',
            ...(filter === f
              ? { background: 'var(--purple)', color: '#fff', borderColor: 'var(--purple)' }
              : { background: 'var(--bg)', color: 'var(--text-muted)', borderColor: 'var(--border)' }),
          }}>
            {f === 'all' ? `All (${tickets.length})` : f === 'open' ? `In Progress (${openTickets.length})` : `Resolved (${resolvedTickets.length})`}
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-muted)', fontSize: 13 }}>No tickets found.</div>
      ) : (
        shown.map(t => {
          const sc = STATUS_COLOR[t.status] ?? STATUS_COLOR.open
          const isOpen = !['completed','closed'].includes(t.status)
          return (
            <div key={t.id} style={{
              border: `1px solid ${isOpen ? '#fde68a' : 'var(--border)'}`,
              borderLeft: `3px solid ${isOpen ? '#d97706' : '#16a34a'}`,
              borderRadius: 10, padding: '12px 14px',
              background: 'var(--card)',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                <a
                  href={`/tickets/${t.id}`}
                  style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', textDecoration: 'none', flex: 1 }}
                >
                  {t.title}
                </a>
                <span style={{ ...badge(sc.bg, sc.color, sc.border), whiteSpace: 'nowrap' }}>
                  {t.status.replace('_', ' ')}
                </span>
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>
                Reported {new Date(t.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </div>
            </div>
          )
        })
      )}
    </div>
  )
}

// Helpers
function sfx(n: number) { return n === 1 ? 'st' : n === 2 ? 'nd' : n === 3 ? 'rd' : 'th' }

function badge(bg: string, color: string, border: string): React.CSSProperties {
  return { background: bg, color, border: `1px solid ${border}`, borderRadius: 20, padding: '2px 8px', fontSize: 10, fontWeight: 700, display: 'inline-block' }
}

const sectionHeader: React.CSSProperties = {
  fontSize: 11, fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase',
  color: 'var(--text-muted)', marginBottom: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center',
}
const card: React.CSSProperties = {
  background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 16px',
}
const kpiLabel: React.CSSProperties = { fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 3 }
const kpiValue: React.CSSProperties = { fontSize: 20, fontWeight: 800, color: 'var(--text)' }
const infoPill: React.CSSProperties = { fontSize: 11, color: 'var(--text-muted)', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 20, padding: '3px 10px' }
