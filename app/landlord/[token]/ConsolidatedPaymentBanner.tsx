'use client'

import { useState } from 'react'
import { payByCard } from './payment-actions'
import { surcharge } from '@/lib/surcharge'

async function loadLogoDataUrl(): Promise<string | null> {
  try {
    const res = await fetch('/logo.png')
    if (!res.ok) return null
    const blob = await res.blob()
    return await new Promise<string | null>((resolve) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(typeof reader.result === 'string' ? reader.result : null)
      reader.onerror = () => resolve(null)
      reader.readAsDataURL(blob)
    })
  } catch {
    return null
  }
}

async function downloadConsolidatedPDF(
  inv: ConsolidatedInvoice,
  covered: OriginalInvoice[],
  tickets: Ticket[],
  propertyName: string,
) {
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })

  const PURPLE: [number, number, number] = [74, 32, 128]
  const left = 40, right = 555
  const ticketMap = new Map(tickets.map(t => [t.id, t]))
  const money = (n: number) => `$${Number(n || 0).toFixed(2)}`

  // ── Header: logo + company (mirrors the single-invoice PDF) ──
  const logo = await loadLogoDataUrl()
  let y = 48
  if (logo) {
    try { doc.addImage(logo, 'PNG', left, y - 10, 42, 42) } catch { /* ignore bad image */ }
  }
  const tx = left + 58
  doc.setTextColor(0, 0, 0)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(15)
  doc.text('Rose Legacy Home Solutions LLC', tx, y)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.text('HVAC Services | Overland Park, KS', tx, y + 14)
  doc.text('Phone: 816 298 4828 | Email: roselegacyhs@icloud.com', tx, y + 26)
  y += 46

  // Purple accent line
  doc.setDrawColor(...PURPLE)
  doc.setLineWidth(1.5)
  doc.line(left, y, right, y)
  y += 34

  // ── Title + meta ──
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  doc.setTextColor(...PURPLE)
  doc.text('INVOICE', left, y)
  doc.setTextColor(0, 0, 0)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(11)
  const dateStr = inv.invoice_date || new Date().toISOString().slice(0, 10)
  doc.text(`Invoice #: ${inv.invoice_number || '—'}`, right - 175, y - 15)
  doc.text(`Date: ${dateStr}`, right - 175, y + 1)
  doc.text(`Status: ${(inv.payment_status || '').toUpperCase()}`, right - 175, y + 17)
  y += 30

  doc.setFont('helvetica', 'bold')
  doc.text('Client:', left, y)
  doc.setFont('helvetica', 'normal')
  doc.text(propertyName || '—', left + 44, y)
  y += 8

  // ── Items table (purple header + grid), one row per covered work order ──
  const colInvoiceX = 330
  const tableTop = y + 8
  const rowH = 26
  const headH = 24

  // header
  doc.setFillColor(...PURPLE)
  doc.rect(left, tableTop, right - left, headH, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.text('Work Order', left + 10, tableTop + 16)
  doc.text('Invoice #', colInvoiceX, tableTop + 16)
  doc.text('Amount', right - 10, tableTop + 16, { align: 'right' })

  // body
  let ry = tableTop + headH
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(0, 0, 0)
  covered.forEach((orig) => {
    const ticket = orig.ticket_id ? ticketMap.get(orig.ticket_id) : null
    doc.setFontSize(10)
    doc.text(ticket?.title || 'Work Order', left + 10, ry + 17, { maxWidth: colInvoiceX - left - 20 })
    doc.setTextColor(110, 100, 130)
    doc.text(orig.invoice_number || '—', colInvoiceX, ry + 17)
    doc.setTextColor(0, 0, 0)
    doc.text(money(Number(orig.total)), right - 10, ry + 17, { align: 'right' })
    // row divider
    doc.setDrawColor(225, 222, 235)
    doc.setLineWidth(0.5)
    doc.line(left, ry + rowH, right, ry + rowH)
    ry += rowH
  })
  // outer border
  doc.setDrawColor(225, 222, 235)
  doc.setLineWidth(0.75)
  doc.rect(left, tableTop, right - left, headH + covered.length * rowH)

  // ── Totals ──
  let endY = ry + 22
  const labelX = right - 200
  const total = Number(inv.total || 0)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text('Subtotal:', labelX, endY)
  doc.text(money(total), right, endY, { align: 'right' })
  endY += 18
  doc.setDrawColor(225, 225, 230)
  doc.setLineWidth(0.75)
  doc.line(labelX, endY - 11, right, endY - 11)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.setTextColor(...PURPLE)
  doc.text('Total Amount Due:', labelX, endY)
  doc.text(money(total), right, endY, { align: 'right' })
  doc.setTextColor(0, 0, 0)
  endY += 26

  // ── Payment / terms ──
  doc.setFontSize(10)
  if (inv.payment_method) {
    doc.setFont('helvetica', 'bold'); doc.text('Payment Method:', left, endY)
    doc.setFont('helvetica', 'normal'); doc.text(inv.payment_method, left + 100, endY)
    endY += 14
  }
  if (inv.terms) {
    doc.setFont('helvetica', 'bold'); doc.text('Terms:', left, endY)
    doc.setFont('helvetica', 'normal'); doc.text(inv.terms, left + 44, endY)
    endY += 14
  }
  if (inv.notes) {
    endY += 6
    doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.text('Notes:', left, endY)
    endY += 14
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9.5)
    doc.splitTextToSize(inv.notes, right - left).forEach((line: string) => { doc.text(line, left, endY); endY += 13 })
  }

  // ── Footer anchored near the bottom ──
  const pageHeight = doc.internal.pageSize.getHeight()
  const footerY = pageHeight - 70
  if (endY < footerY) {
    doc.setDrawColor(...PURPLE)
    doc.setLineWidth(0.75)
    doc.line(left, footerY, right, footerY)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.setTextColor(...PURPLE)
    doc.text('Thank you for choosing Rose Legacy Home Solutions LLC!', left, footerY + 18)
    doc.setTextColor(0, 0, 0)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.text('Questions about this invoice? Call 816 298 4828 or email roselegacyhs@icloud.com', left, footerY + 32)
  }

  doc.save(`consolidated-invoice-${inv.invoice_number || inv.id.slice(0, 8)}.pdf`)
}

type ConsolidatedInvoice = {
  id: string
  invoice_number: string | null
  total: number
  payment_status: string
  payment_link: string | null
  notes: string | null
  invoice_date: string | null
  payment_method?: string | null
  terms?: string | null
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
  propertyName: string
  token: string
  // 'request' = prominent payment request (unpaid). 'history' = quiet, demoted
  // record of an already-settled consolidated payment, shown lower on the page.
  variant?: 'request' | 'history'
}

function getStatusColors(status: string) {
  if (status === 'paid') return { bg: '#f6ffed', border: '#b7eb8f', text: '#389e0d', dot: '#52c41a' }
  if (status === 'overdue') return { bg: '#fff1f0', border: '#ffa39e', text: '#cf1322', dot: '#ff4d4f' }
  return { bg: '#fff7e6', border: '#ffd591', text: '#d46b08', dot: '#fa8c16' }
}

export default function ConsolidatedPaymentBanner({ consolidatedInvoices, originalInvoices, tickets, propertyName, token, variant = 'request' }: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [downloadingId, setDownloadingId] = useState<string | null>(null)
  const [payingId, setPayingId] = useState<string | null>(null)
  const [payError, setPayError] = useState<string | null>(null)

  async function startPayByCard(invoiceId: string) {
    setPayingId(invoiceId)
    setPayError(null)
    const result = await payByCard(invoiceId, token)
    setPayingId(null)
    if (result.error) setPayError(result.error)
    else if (result.url) window.open(result.url, '_blank', 'noopener,noreferrer')
  }

  if (!consolidatedInvoices.length) return null

  const ticketMap = new Map(tickets.map(t => [t.id, t]))

  // "Billing Summary" — settled consolidated payments with a visual breakdown bar.
  if (variant === 'history') {
    const SEG = ['#4a2080', '#6b35b8', '#8a5cd0', '#a87fe0', '#c4a4ec', '#ddccf4']
    return (
      <div style={{ marginTop: '4px', marginBottom: '20px' }}>
        <div style={{
          fontSize: '13px', fontWeight: 800, color: 'var(--text)',
          textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '12px',
        }}>
          Billing Summary
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {consolidatedInvoices.map(inv => {
            const covered = originalInvoices.filter(o => o.consolidated_into === inv.id)
            const total = Number(inv.total) || covered.reduce((s, c) => s + Number(c.total || 0), 0) || 1
            return (
              <div key={inv.id} style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: '16px', padding: '20px 22px', boxShadow: 'var(--shadow)' }}>
                {/* top row */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <span style={{ fontSize: '11px', fontWeight: 800, color: '#389e0d', background: '#f6ffed', border: '1px solid #b7eb8f', borderRadius: '20px', padding: '3px 10px' }}>✓ Paid</span>
                      <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                        Invoice {inv.invoice_number || '—'} · {inv.invoice_date || ''}
                      </span>
                    </div>
                    <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                      Covers {covered.length} work order{covered.length !== 1 ? 's' : ''}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Total Paid</div>
                    <div style={{ fontSize: '28px', fontWeight: 800, color: 'var(--purple)', lineHeight: 1.1 }}>
                      ${total.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                </div>

                {/* breakdown bar */}
                <div style={{ display: 'flex', height: '14px', borderRadius: '999px', overflow: 'hidden', margin: '16px 0 14px', background: 'var(--purple-soft)' }}>
                  {covered.map((orig, i) => (
                    <div
                      key={orig.id}
                      title={`${(orig.ticket_id && ticketMap.get(orig.ticket_id)?.title) || 'Work Order'}: $${Number(orig.total).toFixed(2)}`}
                      style={{ width: `${(Number(orig.total) / total) * 100}%`, background: SEG[i % SEG.length] }}
                    />
                  ))}
                </div>

                {/* legend */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '6px 18px' }}>
                  {covered.map((orig, i) => {
                    const ticket = orig.ticket_id ? ticketMap.get(orig.ticket_id) : null
                    return (
                      <div key={orig.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', padding: '3px 0' }}>
                        <span style={{ width: '10px', height: '10px', borderRadius: '3px', background: SEG[i % SEG.length], flexShrink: 0 }} />
                        <span style={{ color: 'var(--text)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {ticket?.title || 'Work Order'}
                        </span>
                        <span style={{ fontWeight: 700, color: 'var(--text)' }}>${Number(orig.total).toFixed(2)}</span>
                      </div>
                    )
                  })}
                </div>

                <div style={{ marginTop: '16px', borderTop: '1px solid var(--border)', paddingTop: '12px', display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    disabled={downloadingId === inv.id}
                    onClick={async () => {
                      setDownloadingId(inv.id)
                      await downloadConsolidatedPDF(inv, covered, tickets, propertyName)
                      setDownloadingId(null)
                    }}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', background: 'var(--purple-soft)', border: 'none', color: 'var(--purple)', fontWeight: 700, fontSize: '13px', padding: '9px 16px', borderRadius: '10px', cursor: 'pointer' }}
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                    {downloadingId === inv.id ? 'Generating…' : 'Download PDF'}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

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

                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
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
                  {!inv.payment_link && !isPaid && (
                    <button
                      type="button"
                      disabled={payingId === inv.id}
                      onClick={() => startPayByCard(inv.id)}
                      style={{
                        background: '#2f9e44',
                        color: '#fff',
                        border: 'none',
                        padding: '12px 20px',
                        borderRadius: '10px',
                        fontWeight: 700,
                        fontSize: '14px',
                        whiteSpace: 'nowrap',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        cursor: payingId === inv.id ? 'wait' : 'pointer',
                        opacity: payingId === inv.id ? 0.7 : 1,
                      }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/></svg>
                      {payingId === inv.id ? 'Opening…' : 'Pay by card'}
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={downloadingId === inv.id}
                    onClick={async () => {
                      setDownloadingId(inv.id)
                      const covered = originalInvoices.filter(o => o.consolidated_into === inv.id)
                      await downloadConsolidatedPDF(inv, covered, tickets, propertyName)
                      setDownloadingId(null)
                    }}
                    style={{
                      background: isPaid ? 'var(--purple)' : 'rgba(255,255,255,0.15)',
                      color: isPaid ? '#fff' : '#fff',
                      border: isPaid ? 'none' : '1px solid rgba(255,255,255,0.4)',
                      padding: '12px 18px',
                      borderRadius: '10px',
                      fontWeight: 700,
                      fontSize: '14px',
                      cursor: downloadingId === inv.id ? 'wait' : 'pointer',
                      whiteSpace: 'nowrap',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                    {downloadingId === inv.id ? 'Generating…' : 'Download PDF'}
                  </button>
                </div>
              </div>
            </div>

            {/* Card-fee disclosure (only when an unpaid invoice can be paid by card) */}
            {!inv.payment_link && !isPaid && (
              <div style={{ padding: '12px 24px 0' }}>
                <div
                  style={{
                    fontSize: '12px',
                    fontWeight: 600,
                    color: '#9c6a16',
                    background: '#fdf3e3',
                    border: '1px solid #ffe2b0',
                    borderRadius: '10px',
                    padding: '8px 12px',
                  }}
                >
                  Paying by credit/debit card adds a ${surcharge(Number(inv.total)).fee.toFixed(2)} processing fee
                  (total ${surcharge(Number(inv.total)).gross.toFixed(2)}).
                </div>
                {payingId !== inv.id && payError ? (
                  <div style={{ color: '#cf1322', fontSize: '13px', fontWeight: 600, marginTop: '6px' }}>{payError}</div>
                ) : null}
              </div>
            )}

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
