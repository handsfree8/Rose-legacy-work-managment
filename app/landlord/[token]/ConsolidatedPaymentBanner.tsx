'use client'

import { useState } from 'react'

async function downloadConsolidatedPDF(
  inv: ConsolidatedInvoice,
  covered: OriginalInvoice[],
  tickets: Ticket[],
  propertyName: string,
) {
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF({ unit: 'pt', format: 'letter' })

  const purple = [74, 32, 128] as [number, number, number]
  const gray   = [120, 110, 140] as [number, number, number]
  const black  = [26, 22, 37]   as [number, number, number]
  const W = doc.internal.pageSize.getWidth()
  const ticketMap = new Map(tickets.map(t => [t.id, t]))

  // Header bar
  doc.setFillColor(...purple)
  doc.rect(0, 0, W, 80, 'F')

  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(22)
  doc.text('Rose Legacy Home Solutions', 40, 32)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.text('HVAC Services · Overland Park, KS', 40, 48)
  doc.text('appointments@roselegacyhvac.com · 816 298 4828', 40, 62)

  // Title
  doc.setTextColor(...black)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  doc.text('Consolidated Invoice', 40, 110)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(...gray)
  doc.text(`Invoice ${inv.invoice_number || '—'}`, 40, 128)
  doc.text(`Date: ${inv.invoice_date || new Date().toISOString().split('T')[0]}`, 40, 142)
  doc.text(`Client: ${propertyName}`, 40, 156)
  doc.text(`Status: ${inv.payment_status.toUpperCase()}`, 40, 170)

  // Divider
  doc.setDrawColor(...purple)
  doc.setLineWidth(1.5)
  doc.line(40, 186, W - 40, 186)

  // Table header
  doc.setFillColor(240, 234, 248)
  doc.rect(40, 194, W - 80, 24, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(...purple)
  doc.text('WORK ORDER', 52, 210)
  doc.text('INVOICE #', 320, 210)
  doc.text('AMOUNT', W - 80, 210, { align: 'right' })

  // Rows
  let y = 236
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)

  covered.forEach((orig, i) => {
    const ticket = orig.ticket_id ? ticketMap.get(orig.ticket_id) : null
    if (i % 2 === 0) {
      doc.setFillColor(250, 248, 255)
      doc.rect(40, y - 14, W - 80, 24, 'F')
    }
    doc.setTextColor(...black)
    doc.text(ticket?.title || 'Work Order', 52, y, { maxWidth: 240 })
    doc.setTextColor(...gray)
    doc.text(orig.invoice_number || '—', 320, y)
    doc.setTextColor(...purple)
    doc.setFont('helvetica', 'bold')
    doc.text(`$${Number(orig.total).toFixed(2)}`, W - 40, y, { align: 'right' })
    doc.setFont('helvetica', 'normal')
    y += 28
  })

  // Total row
  y += 8
  doc.setDrawColor(...purple)
  doc.setLineWidth(1)
  doc.line(40, y, W - 40, y)
  y += 20

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  doc.setTextColor(...black)
  doc.text('TOTAL DUE', 52, y)
  doc.setTextColor(...purple)
  doc.setFontSize(16)
  doc.text(`$${Number(inv.total).toFixed(2)}`, W - 40, y, { align: 'right' })

  // Footer
  const pageH = doc.internal.pageSize.getHeight()
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(...gray)
  doc.text('Thank you for your business — Rose Legacy Home Solutions LLC', W / 2, pageH - 30, { align: 'center' })

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
  // 'request' = prominent payment request (unpaid). 'history' = quiet, demoted
  // record of an already-settled consolidated payment, shown lower on the page.
  variant?: 'request' | 'history'
}

function getStatusColors(status: string) {
  if (status === 'paid') return { bg: '#f6ffed', border: '#b7eb8f', text: '#389e0d', dot: '#52c41a' }
  if (status === 'overdue') return { bg: '#fff1f0', border: '#ffa39e', text: '#cf1322', dot: '#ff4d4f' }
  return { bg: '#fff7e6', border: '#ffd591', text: '#d46b08', dot: '#fa8c16' }
}

export default function ConsolidatedPaymentBanner({ consolidatedInvoices, originalInvoices, tickets, propertyName, variant = 'request' }: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [downloadingId, setDownloadingId] = useState<string | null>(null)

  if (!consolidatedInvoices.length) return null

  const ticketMap = new Map(tickets.map(t => [t.id, t]))

  // Quiet "Payment history" render for already-settled consolidated payments.
  if (variant === 'history') {
    return (
      <div style={{ marginTop: '32px', marginBottom: '8px' }}>
        <div style={{
          fontSize: '13px', fontWeight: 700, color: 'var(--text-muted)',
          textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px',
        }}>
          Payment history
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {consolidatedInvoices.map(inv => {
            const covered = originalInvoices.filter(o => o.consolidated_into === inv.id)
            const isExpanded = expandedId === inv.id
            return (
              <div key={inv.id} style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px', padding: '14px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{
                      fontSize: '11px', fontWeight: 700, color: '#389e0d', background: '#f6ffed',
                      border: '1px solid #b7eb8f', borderRadius: '20px', padding: '3px 10px', whiteSpace: 'nowrap',
                    }}>
                      ✓ Paid
                    </span>
                    <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                      Invoice {inv.invoice_number || '—'} · {inv.invoice_date || ''} · covers {covered.length} work order{covered.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <span style={{ fontWeight: 700, color: 'var(--text)', fontSize: '15px' }}>
                      ${Number(inv.total).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </span>
                    <button
                      type="button"
                      disabled={downloadingId === inv.id}
                      onClick={async () => {
                        setDownloadingId(inv.id)
                        await downloadConsolidatedPDF(inv, covered, tickets, propertyName)
                        setDownloadingId(null)
                      }}
                      style={{ background: 'none', border: 'none', color: 'var(--purple)', fontWeight: 700, fontSize: '13px', cursor: 'pointer' }}
                    >
                      {downloadingId === inv.id ? 'Generating…' : 'Download PDF'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setExpandedId(isExpanded ? null : inv.id)}
                      style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '13px', cursor: 'pointer' }}
                    >
                      {isExpanded ? 'Hide' : 'Details'}
                    </button>
                  </div>
                </div>
                {isExpanded && (
                  <div style={{ borderTop: '1px solid var(--border)', padding: '8px 16px 14px' }}>
                    {covered.map(orig => {
                      const ticket = orig.ticket_id ? ticketMap.get(orig.ticket_id) : null
                      return (
                        <div key={orig.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)', fontSize: '13px' }}>
                          <span style={{ color: 'var(--text)' }}>{ticket?.title || 'Work Order'} <span style={{ color: 'var(--text-muted)' }}>· {orig.invoice_number || '—'}</span></span>
                          <span style={{ fontWeight: 600, color: 'var(--text)' }}>${Number(orig.total).toFixed(2)}</span>
                        </div>
                      )
                    })}
                  </div>
                )}
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
