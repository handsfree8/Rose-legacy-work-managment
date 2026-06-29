'use client'

import { useState } from 'react'
import { payByCard } from './payment-actions'
import { surcharge } from '@/lib/surcharge'

type LineItem = { id: string; description: string; line_total: number }

type Props = {
  invoiceId: string
  invoiceNumber: string | null
  invoiceDate: string | null
  total: number
  paymentStatus: string
  paymentLink: string | null
  workOrderTitle: string
  items: LineItem[]
  token: string
}

export default function SingleInvoicePaymentBanner({
  invoiceId,
  invoiceNumber,
  invoiceDate,
  total,
  paymentStatus,
  paymentLink,
  workOrderTitle,
  items,
  token,
}: Props) {
  const [expanded, setExpanded] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { gross, fee } = surcharge(total)
  const isOverdue = paymentStatus === 'overdue'

  async function startPay() {
    setBusy(true)
    setError(null)
    const result = await payByCard(invoiceId, token)
    setBusy(false)
    if (result.error) setError(result.error)
    else if (result.url) window.open(result.url, '_blank', 'noopener,noreferrer')
  }

  return (
    <div
      style={{
        background: '#fff',
        border: '2px solid var(--purple)',
        borderRadius: '16px',
        overflow: 'hidden',
        boxShadow: '0 4px 24px rgba(74,32,128,0.12)',
        marginBottom: '16px',
      }}
    >
      {/* Header */}
      <div
        style={{
          background: 'var(--purple)',
          padding: '20px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.7)' }}>
              📋 Payment Request
            </span>
            <span
              style={{
                fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em',
                background: isOverdue ? '#fff1f0' : '#fff7e6',
                color: isOverdue ? '#cf1322' : '#d46b08',
                border: `1px solid ${isOverdue ? '#ffa39e' : '#ffd591'}`,
                padding: '2px 8px', borderRadius: '20px',
              }}
            >
              {paymentStatus}
            </span>
          </div>
          <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.85)' }}>
            Payment for: {workOrderTitle}
            {invoiceNumber ? ` · Invoice ${invoiceNumber}` : ''}
            {invoiceDate ? ` · ${invoiceDate}` : ''}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
          <div style={{ fontFamily: 'DM Serif Display, serif', fontSize: '36px', fontWeight: 400, color: '#fff', letterSpacing: '-0.02em' }}>
            ${Number(total).toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
          {paymentLink ? (
            <a
              href={paymentLink}
              target="_blank"
              rel="noopener noreferrer"
              style={{ background: '#fff', color: 'var(--purple)', padding: '12px 20px', borderRadius: '10px', fontWeight: 700, fontSize: '14px', textDecoration: 'none', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/></svg>
              Pay Now
            </a>
          ) : (
            <button
              type="button"
              disabled={busy}
              onClick={startPay}
              style={{ background: '#2f9e44', color: '#fff', border: 'none', padding: '12px 20px', borderRadius: '10px', fontWeight: 700, fontSize: '14px', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '6px', cursor: busy ? 'wait' : 'pointer', opacity: busy ? 0.7 : 1 }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/></svg>
              {busy ? 'Opening…' : 'Pay by card'}
            </button>
          )}
        </div>
      </div>

      {/* Card-fee disclosure */}
      {!paymentLink && (
        <div style={{ padding: '12px 24px 0' }}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: '#9c6a16', background: '#fdf3e3', border: '1px solid #ffe2b0', borderRadius: '10px', padding: '8px 12px' }}>
            Paying by credit/debit card adds a ${fee.toFixed(2)} processing fee (total ${gross.toFixed(2)}).
          </div>
          {error ? <div style={{ color: '#cf1322', fontSize: '13px', fontWeight: 600, marginTop: '6px' }}>{error}</div> : null}
        </div>
      )}

      {/* Breakdown */}
      {items.length > 0 && (
        <div style={{ padding: '0 24px' }}>
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            style={{ background: 'none', border: 'none', padding: '14px 0', fontSize: '13px', fontWeight: 600, color: 'var(--purple)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', width: '100%', borderBottom: expanded ? '1px solid var(--border)' : 'none' }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>
              <polyline points="6 9 12 15 18 9" />
            </svg>
            {expanded ? 'Hide' : 'View'} breakdown ({items.length} {items.length === 1 ? 'item' : 'items'})
          </button>
          {expanded && (
            <div style={{ paddingBottom: '16px' }}>
              {items.map((it) => (
                <div key={it.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border)', fontSize: '13px' }}>
                  <span style={{ color: 'var(--text)' }}>{it.description}</span>
                  <span style={{ fontWeight: 700, color: 'var(--purple)' }}>${Number(it.line_total).toFixed(2)}</span>
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0 2px' }}>
                <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)' }}>Total Due</span>
                <span style={{ fontFamily: 'DM Serif Display, serif', fontSize: '22px', color: 'var(--purple)' }}>${Number(total).toFixed(2)}</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
