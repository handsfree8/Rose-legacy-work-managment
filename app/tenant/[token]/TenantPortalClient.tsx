'use client'

import { useState } from 'react'
import NewTicketForm from './NewTicketForm'
import MessageThread from './MessageThread'
import { markManagerMessagesRead } from './actions'

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

type PaymentRow = {
  id: string
  period_year: number
  period_month: number
  amount: number
  method: string
  paid_at: string
  status: string
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

export default function TenantPortalClient({ tenant, token, tickets, messages, managerName, payments }: {
  tenant: Tenant
  token: string
  tickets: Ticket[]
  messages: Message[]
  managerName: string
  payments: PaymentRow[]
}) {
  const [tab,           setTab]           = useState<'home' | 'tickets' | 'messages' | 'payments'>('home')
  const [showNewTicket, setShowNewTicket] = useState(false)

  const unreadFromServer = messages.filter(m => m.sender === 'manager' && !m.read_at).length
  const [unread, setUnread] = useState(unreadFromServer)

  function goMessages() {
    setTab('messages')
    if (unread > 0) {
      setUnread(0)
      markManagerMessagesRead(token).catch(() => {})
    }
  }
  const prop   = tenant.properties

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', background: 'var(--bg)' }}>
      <style>{`
        /* ── Shell ── */
        .tp-shell {
          display: flex;
          flex: 1;
          align-items: stretch;
          min-height: 0;
        }

        /* ── Sidebar (desktop) ── */
        .tp-sidebar {
          width: 260px;
          flex-shrink: 0;
          background: linear-gradient(175deg, #1a0838 0%, #2a0e56 40%, #4a2080 100%);
          display: flex;
          flex-direction: column;
          position: sticky;
          top: 0;
          height: 100vh;
          overflow-y: auto;
          padding: 36px 20px 24px;
          color: #fff;
        }
        .tp-sidebar-eyebrow {
          font-size: 9px;
          font-weight: 700;
          letter-spacing: .18em;
          text-transform: uppercase;
          color: rgba(255,255,255,.35);
          margin-bottom: 22px;
        }
        .tp-sidebar-avatar {
          display: flex;
          align-items: center;
          gap: 13px;
          margin-bottom: 20px;
        }
        .tp-sidebar-initials {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          background: rgba(255,255,255,.14);
          border: 1.5px solid rgba(255,255,255,.22);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          font-size: 20px;
          font-weight: 800;
        }
        .tp-sidebar-name { font-size: 16px; font-weight: 800; line-height: 1.2; }
        .tp-sidebar-unit { font-size: 11px; opacity: .5; margin-top: 2px; }
        .tp-divider {
          height: 1px;
          background: rgba(255,255,255,.12);
          margin: 16px 0;
        }
        .tp-sidebar-sec {
          font-size: 9px;
          font-weight: 700;
          letter-spacing: .15em;
          text-transform: uppercase;
          opacity: .38;
          margin-bottom: 6px;
        }
        .tp-sidebar-action {
          background: rgba(255,255,255,.1);
          border: 1px solid rgba(255,255,255,.18);
          border-radius: 10px;
          padding: 11px 14px;
          color: #fff;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          text-align: left;
          display: flex;
          justify-content: space-between;
          align-items: center;
          transition: background .15s;
          margin-bottom: 8px;
        }
        .tp-sidebar-action:hover { background: rgba(255,255,255,.16); }
        .tp-sidebar-action-ghost {
          background: transparent;
          border: 1px solid rgba(255,255,255,.15);
          border-radius: 10px;
          padding: 11px 14px;
          color: rgba(255,255,255,.7);
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          text-align: left;
          display: flex;
          justify-content: space-between;
          align-items: center;
          transition: background .15s;
        }
        .tp-sidebar-action-ghost:hover { background: rgba(255,255,255,.07); }

        /* ── Main ── */
        .tp-main {
          flex: 1;
          min-width: 0;
          display: flex;
          flex-direction: column;
        }

        /* ── Tab bar ── */
        .tp-tabs {
          display: flex;
          border-bottom: 1px solid var(--border);
          background: var(--card);
          flex-shrink: 0;
          position: sticky;
          top: 0;
          z-index: 5;
        }
        .tp-tab {
          flex: 1;
          padding: 14px 4px;
          background: none;
          border: none;
          border-bottom: 2px solid transparent;
          font-size: 13px;
          cursor: pointer;
          position: relative;
          transition: color .12s;
        }
        .tp-tab.active {
          color: var(--purple);
          font-weight: 700;
          border-bottom-color: var(--purple);
        }
        .tp-tab:not(.active) {
          color: var(--text-muted);
          font-weight: 500;
        }

        /* ── Mobile: sidebar → top header strip ── */
        @media (max-width: 768px) {
          .tp-shell { flex-direction: column; }
          .tp-sidebar {
            width: 100%;
            height: auto;
            position: static;
            padding: 52px 20px 22px;
          }
          .tp-main { overflow-y: visible; }
          .tp-tabs { position: sticky; top: 0; }
          /* Hide desktop avatar on mobile (shown inline in header) */
          .tp-sidebar-avatar { display: none; }
        }
      `}</style>

      <div className="tp-shell">

        {/* ══ LEFT SIDEBAR ══ */}
        <div className="tp-sidebar">
          <div className="tp-sidebar-eyebrow">Rose Legacy · Tenant Portal</div>

          {/* Avatar + name — desktop only (hidden on mobile via CSS) */}
          <div className="tp-sidebar-avatar">
            <div className="tp-sidebar-initials">{tenant.name.charAt(0)}</div>
            <div>
              <div className="tp-sidebar-name">{tenant.name}</div>
              {tenant.unit && <div className="tp-sidebar-unit">{tenant.unit}</div>}
            </div>
          </div>

          {/* Mobile greeting (desktop: avatar covers this) */}
          <div style={{ display: 'none' }} className="tp-mobile-greeting">
            <div style={{ fontSize: 22, fontWeight: 800, lineHeight: 1.15 }}>Hi, {tenant.name.split(' ')[0]}</div>
          </div>

          {prop && (
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,.45)', marginBottom: 20, lineHeight: 1.5 }}>
              {prop.address}{tenant.unit ? ` · ${tenant.unit}` : ''}{prop.city ? ` · ${prop.city}, ${prop.state}` : ''}
            </div>
          )}

          <div className="tp-divider" />

          {/* Rent */}
          <div style={{ marginBottom: 4 }}>
            <div className="tp-sidebar-sec">Monthly Rent</div>
            <div style={{ fontSize: 28, fontWeight: 800, lineHeight: 1 }}>
              ${tenant.rent_amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,.5)', marginTop: 5 }}>
              Due {rentDueDate(tenant.rent_due_day)}
            </div>
          </div>

          {tenant.lease_end && (
            <>
              <div className="tp-divider" />
              <div>
                <div className="tp-sidebar-sec">Lease Expires</div>
                <div style={{ fontSize: 14, fontWeight: 700 }}>{formatDate(tenant.lease_end)}</div>
              </div>
            </>
          )}

          <div className="tp-divider" />

          {/* Quick actions */}
          <button className="tp-sidebar-action" onClick={() => setShowNewTicket(true)}>
            + New Request
          </button>
          <button className="tp-sidebar-action-ghost" onClick={goMessages}>
            Messages
            {unread > 0 && (
              <span style={{ background: '#dc2626', color: '#fff', borderRadius: 20, fontSize: 10, fontWeight: 800, padding: '2px 7px', flexShrink: 0 }}>
                {unread}
              </span>
            )}
          </button>

          <div style={{ marginTop: 'auto', paddingTop: 24, fontSize: 11, color: 'rgba(255,255,255,.32)', lineHeight: 1.5 }}>
            Rose Legacy Homes
          </div>
        </div>

        {/* ══ MAIN AREA ══ */}
        <div className="tp-main">

          {/* Tab bar */}
          <div className="tp-tabs">
            {([
              { key: 'home',     label: 'Home' },
              { key: 'tickets',  label: 'My Requests' },
              { key: 'messages', label: 'Messages', badge: unread },
              { key: 'payments', label: 'Payments' },
            ] as const).map(t => (
              <button
                key={t.key}
                onClick={() => t.key === 'messages' ? goMessages() : setTab(t.key)}
                className={`tp-tab${tab === t.key ? ' active' : ''}`}
              >
                <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                  {t.label}
                  {'badge' in t && t.badge > 0 && (
                    <span style={{ background: '#dc2626', color: '#fff', borderRadius: 20, fontSize: 9, fontWeight: 800, padding: '1px 5px', lineHeight: 1.4, display: 'inline-block' }}>
                      {t.badge}
                    </span>
                  )}
                </span>
              </button>
            ))}
          </div>

          {/* Content area */}
          <div style={{ flex: 1, overflowY: tab === 'messages' ? 'hidden' : 'auto', display: 'flex', flexDirection: 'column' }}>

            {/* HOME */}
            {tab === 'home' && (
              <div style={{ padding: '28px 28px 40px', maxWidth: 760, display: 'flex', flexDirection: 'column', gap: 20 }}>

                {/* Quick actions grid */}
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 13 }}>Quick Actions</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 10 }}>
                    <button
                      onClick={() => setShowNewTicket(true)}
                      style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '18px 16px', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 12, boxShadow: 'var(--shadow)', cursor: 'pointer' }}
                    >
                      <div style={{ width: 40, height: 40, borderRadius: 11, background: 'var(--purple-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="var(--purple)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/>
                        </svg>
                      </div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>New Request</div>
                    </button>
                    <button
                      onClick={goMessages}
                      style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '18px 16px', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 12, boxShadow: 'var(--shadow)', cursor: 'pointer' }}
                    >
                      <div style={{ width: 40, height: 40, borderRadius: 11, background: '#e0f2fe', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#0369a1" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                        </svg>
                      </div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>
                        Messages
                        {unread > 0 && (
                          <span style={{ display: 'inline-block', marginLeft: 6, background: '#dc2626', color: '#fff', borderRadius: 20, fontSize: 10, padding: '0 5px', verticalAlign: 'middle' }}>{unread}</span>
                        )}
                      </div>
                    </button>
                  </div>
                </div>

                {/* Recent requests */}
                {tickets.length > 0 && (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Recent Requests</div>
                      <button onClick={() => setTab('tickets')} style={{ background: 'none', border: 'none', fontSize: 12, fontWeight: 600, color: 'var(--purple)', cursor: 'pointer' }}>View all</button>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {tickets.slice(0, 3).map(t => (
                        <div key={t.id} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '14px 16px', boxShadow: 'var(--shadow)' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', flex: 1 }}>{t.title}</div>
                            {statusBadge(t.status)}
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{t.category} · {formatDate(t.created_at)}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {tickets.length === 0 && (
                  <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 13, padding: '40px 0' }}>
                    No requests yet. Use &ldquo;New Request&rdquo; to get started.
                  </div>
                )}
              </div>
            )}

            {/* TICKETS */}
            {tab === 'tickets' && (
              <div style={{ padding: '28px 28px 40px', maxWidth: 760, display: 'flex', flexDirection: 'column', gap: 10 }}>
                <button
                  onClick={() => setShowNewTicket(true)}
                  style={{ background: 'linear-gradient(135deg, var(--purple), var(--purple-mid))', color: '#fff', border: 'none', borderRadius: 'var(--radius-sm)', padding: '13px', fontSize: 14, fontWeight: 700, marginBottom: 4, cursor: 'pointer' }}
                >
                  + New Request
                </button>
                {tickets.length === 0 && (
                  <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 13, padding: '40px 0' }}>No requests yet.</div>
                )}
                {tickets.map(t => (
                  <div key={t.id} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '16px', boxShadow: 'var(--shadow)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 6 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', flex: 1 }}>{t.title}</div>
                      {statusBadge(t.status)}
                    </div>
                    {t.emergency && <div style={{ fontSize: 10, fontWeight: 700, color: '#dc2626', marginBottom: 4 }}>⚠ EMERGENCY</div>}
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{t.category} · Submitted {formatDate(t.created_at)}</div>
                  </div>
                ))}
              </div>
            )}

            {/* MESSAGES */}
            {tab === 'messages' && (
              <MessageThread token={token} messages={messages} managerName={managerName} />
            )}

            {/* PAYMENTS */}
            {tab === 'payments' && (() => {
              const now = new Date()
              const curYear = now.getFullYear()
              const curMonth = now.getMonth() + 1
              const monthName = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
              const currentPayment = payments.find(p => p.period_year === curYear && p.period_month === curMonth)
              const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']
              return (
                <div style={{ padding: '28px 28px 40px', maxWidth: 760, display: 'flex', flexDirection: 'column', gap: 20 }}>
                  {/* Current month card */}
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 13 }}>
                      Current Month · {monthName}
                    </div>
                    {currentPayment ? (
                      <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 'var(--radius)', padding: '20px 20px', display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                        <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12"/>
                          </svg>
                        </div>
                        <div>
                          <div style={{ fontSize: 15, fontWeight: 800, color: '#15803d' }}>Rent Paid</div>
                          <div style={{ fontSize: 13, color: '#166534', marginTop: 4 }}>
                            ${currentPayment.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })} · {currentPayment.method}
                          </div>
                          <div style={{ fontSize: 11, color: '#16a34a', marginTop: 3 }}>
                            Recorded {formatDate(currentPayment.paid_at)}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 'var(--radius)', padding: '20px 20px', display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                        <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 18 }}>
                          ⏳
                        </div>
                        <div>
                          <div style={{ fontSize: 15, fontWeight: 800, color: '#92400e' }}>Payment Pending</div>
                          <div style={{ fontSize: 13, color: '#78350f', marginTop: 4 }}>
                            ${tenant.rent_amount.toLocaleString('en-US', { minimumFractionDigits: 2 })} due · Due day {tenant.rent_due_day}
                          </div>
                          <div style={{ fontSize: 11, color: '#b45309', marginTop: 3 }}>
                            No payment recorded for {monthName} yet.
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Payment history */}
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 13 }}>
                      Payment History
                    </div>
                    {payments.length === 0 ? (
                      <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 13, padding: '40px 0' }}>
                        No payment history yet.
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {payments.map(p => (
                          <div key={p.id} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '14px 16px', boxShadow: 'var(--shadow)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                            <div>
                              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>
                                {MONTHS[p.period_month - 1]} {p.period_year}
                              </div>
                              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                                {p.method} · {formatDate(p.paid_at)}
                              </div>
                            </div>
                            <div style={{ fontSize: 15, fontWeight: 800, color: '#16a34a', whiteSpace: 'nowrap' }}>
                              ${p.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )
            })()}
          </div>
        </div>
      </div>

      {showNewTicket && <NewTicketForm token={token} onClose={() => setShowNewTicket(false)} />}
    </div>
  )
}
