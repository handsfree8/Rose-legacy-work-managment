'use client'

import { useState } from 'react'
import NewTicketForm from './NewTicketForm'
import MessageThread from './MessageThread'

type Ticket = {
  id: string
  title: string
  status: string
  category: string | null
  priority: string | null
  emergency: boolean
  created_at: string
}

type Message = {
  id: string
  sender: 'tenant' | 'manager'
  body: string
  read_at: string | null
  created_at: string
  ticket_id: string | null
}

type Tenant = {
  name: string
  unit: string | null
  rent_amount: number
  rent_due_day: number
  lease_end: string | null
  properties: { name: string; address: string | null; city: string | null; state: string | null } | null
}

const STATUS_LABELS: Record<string, { label: string; bg: string; color: string }> = {
  new:         { label: 'New',         bg: '#f0f9ff', color: '#0369a1' },
  in_progress: { label: 'In Progress', bg: '#e0f2fe', color: '#0369a1' },
  scheduled:   { label: 'Scheduled',   bg: '#fef9c3', color: '#92400e' },
  completed:   { label: 'Completed',   bg: '#f0fdf4', color: '#16a34a' },
  closed:      { label: 'Closed',      bg: '#f4f4f5', color: '#71717a' },
}

function statusBadge(status: string) {
  const s = STATUS_LABELS[status] ?? { label: status, bg: '#f4f4f5', color: '#71717a' }
  return (
    <span style={{ background: s.bg, color: s.color, borderRadius: 20, padding: '3px 9px', fontSize: 10, fontWeight: 700, whiteSpace: 'nowrap' }}>
      {s.label}
    </span>
  )
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function rentDueDate(dueDay: number) {
  const now = new Date()
  const d = new Date(now.getFullYear(), now.getMonth(), dueDay)
  if (d < now) d.setMonth(d.getMonth() + 1)
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}

export default function TenantPortalClient({ tenant, token, tickets, messages, managerName }: {
  tenant: Tenant
  token: string
  tickets: Ticket[]
  messages: Message[]
  managerName: string
}) {
  const [tab,           setTab]           = useState<'home' | 'tickets' | 'messages'>('home')
  const [showNewTicket, setShowNewTicket] = useState(false)

  const unread = messages.filter(m => m.sender === 'manager' && !m.read_at).length
  const prop   = tenant.properties

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', minHeight: '100dvh', display: 'flex', flexDirection: 'column', background: 'var(--bg)' }}>

      {/* ── Header ─────────────────────────────────────────────── */}
      <div style={{ background: 'linear-gradient(155deg,#2a0e56 0%,#4a2080 48%,#6b35b8 100%)', padding: '52px 20px 24px', flexShrink: 0 }}>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.16em', textTransform: 'uppercase', color: 'rgba(255,255,255,.4)', marginBottom: 4 }}>
          Rose Legacy · Tenant Portal
        </div>
        <div style={{ fontSize: 22, fontWeight: 800, color: '#fff', lineHeight: 1.15 }}>Hi, {tenant.name.split(' ')[0]}</div>
        {prop && (
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,.55)', marginTop: 4 }}>
            {prop.address}{tenant.unit ? ` · ${tenant.unit}` : ''}{prop.city ? ` · ${prop.city}, ${prop.state}` : ''}
          </div>
        )}

        {/* Rent card */}
        <div style={{ background: 'rgba(255,255,255,.11)', border: '1px solid rgba(255,255,255,.17)', borderRadius: 16, padding: '16px 18px', marginTop: 18 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,.5)', marginBottom: 4 }}>
                Monthly Rent
              </div>
              <div style={{ fontSize: 28, fontWeight: 800, color: '#fff', lineHeight: 1 }}>
                ${tenant.rent_amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,.55)', marginTop: 3 }}>
                Due {rentDueDate(tenant.rent_due_day)}
              </div>
            </div>
            <div style={{ background: '#f59e0b', borderRadius: 20, padding: '4px 11px', fontSize: 10, fontWeight: 700, color: '#fff' }}>
              Due day {tenant.rent_due_day}
            </div>
          </div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,.45)', background: 'rgba(255,255,255,.07)', borderRadius: 10, padding: '8px 12px' }}>
            💳 Online payments coming soon — contact your property manager to arrange payment.
          </div>
        </div>
      </div>

      {/* ── Tab bar ────────────────────────────────────────────── */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', background: 'var(--card)', flexShrink: 0 }}>
        {([
          { key: 'home',     label: 'Home' },
          { key: 'tickets',  label: 'My Requests' },
          { key: 'messages', label: 'Messages', badge: unread },
        ] as const).map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            flex: 1, padding: '13px 4px', background: 'none', border: 'none',
            borderBottom: tab === t.key ? '2px solid var(--purple)' : '2px solid transparent',
            color: tab === t.key ? 'var(--purple)' : 'var(--text-muted)',
            fontSize: 13, fontWeight: tab === t.key ? 700 : 500,
            position: 'relative',
          }}>
            {t.label}
            {'badge' in t && t.badge > 0 && (
              <span style={{ position: 'absolute', top: 8, right: '50%', transform: 'translateX(24px)', background: '#dc2626', color: '#fff', borderRadius: 20, fontSize: 9, fontWeight: 800, padding: '1px 5px' }}>
                {t.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Content ────────────────────────────────────────────── */}
      <div style={{ flex: 1, overflowY: tab === 'messages' ? 'hidden' : 'auto', display: 'flex', flexDirection: 'column' }}>

        {/* HOME */}
        {tab === 'home' && (
          <div style={{ padding: '20px 18px 32px', display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Quick actions */}
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 13 }}>Quick Actions</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
                <button onClick={() => { setShowNewTicket(true) }} style={{
                  background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)',
                  padding: '16px 14px', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 12,
                  boxShadow: 'var(--shadow)',
                }}>
                  <div style={{ width: 38, height: 38, borderRadius: 11, background: 'var(--purple-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="var(--purple)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/>
                    </svg>
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', lineHeight: 1.3 }}>New Request</div>
                </button>
                <button onClick={() => setTab('messages')} style={{
                  background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)',
                  padding: '16px 14px', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 12,
                  boxShadow: 'var(--shadow)',
                }}>
                  <div style={{ width: 38, height: 38, borderRadius: 11, background: '#e0f2fe', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#0369a1" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                    </svg>
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', lineHeight: 1.3 }}>
                    Messages{unread > 0 && <span style={{ display: 'inline-block', marginLeft: 6, background: '#dc2626', color: '#fff', borderRadius: 20, fontSize: 10, padding: '0 5px', verticalAlign: 'middle' }}>{unread}</span>}
                  </div>
                </button>
              </div>
            </div>

            {/* Recent requests */}
            {tickets.length > 0 && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Recent Requests</div>
                  <button onClick={() => setTab('tickets')} style={{ background: 'none', border: 'none', fontSize: 12, fontWeight: 600, color: 'var(--purple)' }}>View all</button>
                </div>
                {tickets.slice(0, 3).map(t => (
                  <div key={t.id} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '14px 16px', marginBottom: 8, boxShadow: 'var(--shadow)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', flex: 1 }}>{t.title}</div>
                      {statusBadge(t.status)}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{t.category} · {formatDate(t.created_at)}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Lease info */}
            {tenant.lease_end && (
              <div style={{ background: 'var(--purple-light)', border: '1px solid var(--purple-soft)', borderRadius: 'var(--radius)', padding: '14px 16px' }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--purple)', marginBottom: 3 }}>Lease</div>
                <div style={{ fontSize: 13, color: 'var(--text)' }}>Expires {formatDate(tenant.lease_end)}</div>
              </div>
            )}
          </div>
        )}

        {/* TICKETS */}
        {tab === 'tickets' && (
          <div style={{ padding: '20px 18px 32px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button onClick={() => setShowNewTicket(true)} style={{
              background: 'linear-gradient(135deg, var(--purple), var(--purple-mid))',
              color: '#fff', border: 'none', borderRadius: 'var(--radius-sm)',
              padding: '13px', fontSize: 14, fontWeight: 700, marginBottom: 4,
            }}>
              + New Request
            </button>
            {tickets.length === 0 && (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 13, padding: '40px 0' }}>
                No requests yet.
              </div>
            )}
            {tickets.map(t => (
              <div key={t.id} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '16px', boxShadow: 'var(--shadow)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 6 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', flex: 1 }}>{t.title}</div>
                  {statusBadge(t.status)}
                </div>
                {t.emergency && (
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#dc2626', marginBottom: 4 }}>⚠ EMERGENCY</div>
                )}
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{t.category} · Submitted {formatDate(t.created_at)}</div>
              </div>
            ))}
          </div>
        )}

        {/* MESSAGES */}
        {tab === 'messages' && (
          <MessageThread token={token} messages={messages} managerName={managerName} />
        )}
      </div>

      {/* New ticket sheet */}
      {showNewTicket && <NewTicketForm token={token} onClose={() => setShowNewTicket(false)} />}
    </div>
  )
}
