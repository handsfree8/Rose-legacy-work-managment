'use client'

import { useState } from 'react'

type ConsolidatedInvoice = {
  id: string
  invoice_number: string | null
  total: number
  payment_status: string
  payment_link: string | null
  notes: string | null
  invoice_date: string | null
}

type OriginalInvoice = {
  id: string
  invoice_number: string | null
  total: number
  consolidated_into: string | null
  ticket_id: string | null
}

type Ticket = {
  id: string
  title: string
  unit_number: string | null
}

type Props = {
  consolidatedInvoices: ConsolidatedInvoice[]
  originalInvoices: OriginalInvoice[]
  tickets: Ticket[]
}

function getStatusColors(status: string) {
  if (status === 'paid') return { bg: '#f6ffed', border: '#b7eb8f', text: '#389e0d', dot: '#52c41a' }
  if (status === 'overdue') return { bg: '#fff1f0', border: '#ffa39e', text: '#cf1322', dot: '#ff4d4f' }
  return { bg: '#fff7e6', border: '#ffd591', text: '#d46b08', dot: '#fa8c16' }
}

export default function ConsolidatedPaymentBanner({ consolidatedInvoices, originalInvoices, tickets }: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  if (!consolidatedInvoices.length) return null

  const ticketMap = new Map(tickets.map(t => [t.id, t]))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '28px' }}>
      {consolidatedInvoices.map(inv => {
        const colors = getStatusColors(inv.payment_status)
        const isPaid = inv.payment_status === 'paid'
        const covered = originalInvoices.filter(o => o.consolidated_into === inv.id)
        const isExpanded = expandedId === inv.id

        return (
          <div
            key={inv.id}
            style={{
              background: isPaid ? '#f6ffed' : '#fff',
              border: `2px solid ${isPaid ? '#b7eb8f' : 'var(--purple)'}`,
              borderRadius: '16px',
              overflow: 'hidden',
              boxShadow: isPaid ? 'none' : '0 4px 24px rgba(74,32,128,0.12)',
            }}
          >
            {/* Header */}
            <div style={{
              background: isPaid ? '#f6ffed' : 'var(--purple)',
              padding: '20px 24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '12px',
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                  <span style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                    color: isPaid ? '#389e0d' : 'rgba(255,255,255,0.7)',
                  }}>
                    {isPaid ? '✓ Payment Received' : '📋 Payment Request'}
                  </span>
                  <span style={{
                    fontSize: '10px',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    background: colors.bg,
                    color: colors.text,
                    border: `1px solid ${colors.border}`,
                    padding: '2px 8px',
                    borderRadius: '20px',
                  }}>
                    {inv.payment_status}
                  </span>
                </div>
                <div style={{
                  fontSize: '13px',
                  color: isPaid ? '#389e0d' : 'rgba(255,255,255,0.85)',
                }}>
                  Rose Legacy is requesting a consolidated payment covering {covered.length} work order{covered.length !== 1 ? 's' : ''}
                  {inv.invoice_number ? ` · Invoice ${inv.invoice_number}` : ''}
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{
                  fontFamily: 'DM Serif Display, serif',
                  fontSize: '36px',
                  fontWeight: 400,
                  color: isPaid ? '#389e0d' : '#fff',
                  letterSpacing: '-0.02em',
                }}>
                  ${Number(inv.total).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </div>

                {inv.payment_link && !isPaid && (
                  <a
                    href={inv.payment_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      background: '#fff',
                      color: 'var(--purple)',
                      padding: '12px 20px',
                      borderRadius: '10px',
                      fontWeight: 700,
                      fontSize: '14px',
                      textDecoration: 'none',
                      whiteSpace: 'nowrap',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/></svg>
                    Pay Now
                  </a>
                )}
              </div>
            </div>

            {/* Breakdown toggle */}
            <div style={{ padding: '0 24px' }}>
              <button
                type="button"
                onClick={() => setExpandedId(isExpanded ? null : inv.id)}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: '14px 0',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: 'var(--purple)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  width: '100%',
                  borderBottom: isExpanded ? '1px solid var(--border)' : 'none',
                }}
              >
                <svg
                  width="14" height="14" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2.5"
                  style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}
                >
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
                {isExpanded ? 'Hide' : 'View'} breakdown ({covered.length} work orders)
              </button>

              {isExpanded && (
                <div style={{ paddingBottom: '16px' }}>
                  {covered.map(orig => {
                    const ticket = orig.ticket_id ? ticketMap.get(orig.ticket_id) : null
                    return (
                      <div
                        key={orig.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          padding: '10px 0',
                          borderBottom: '1px solid var(--border)',
                        }}
                      >
                        <div style={{
                          width: '8px', height: '8px', borderRadius: '50%',
                          background: 'var(--purple-mid)', flexShrink: 0,
                        }}/>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)' }}>
                            {ticket?.title || 'Work Order'}
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                            {ticket?.unit_number ? `Unit ${ticket.unit_number} · ` : ''}
                            Invoice {orig.invoice_number || '—'}
                          </div>
                        </div>
                        <div style={{ fontWeight: 700, color: 'var(--purple)', fontSize: '14px' }}>
                          ${Number(orig.total).toFixed(2)}
                        </div>
                      </div>
                    )
                  })}

                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '14px 0 2px',
                  }}>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)' }}>Total Due</span>
                    <span style={{
                      fontFamily: 'DM Serif Display, serif',
                      fontSize: '22px',
                      color: 'var(--purple)',
                    }}>
                      ${Number(inv.total).toFixed(2)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
