'use client'

import { useState } from 'react'

type InvoiceItem = {
  id: string
  description: string
  qty: number
  unit_price: number
  line_total: number
}

type Invoice = {
  id: string
  invoice_number: string | null
  invoice_date: string | null
  client_name: string | null
  payment_method: string | null
  terms: string | null
  notes: string | null
  warranty_disclaimer: string | null
  tax_rate: number | null
  discount_rate: number | null
  subtotal: number | null
  tax_amount: number | null
  discount_amount: number | null
  total: number
  payment_status: string | null
}

type Property = {
  name: string
  address: string | null
  city: string | null
  state: string | null
}

type InvoicePreviewProps = {
  invoice: Invoice
  items: InvoiceItem[]
  property: Property
}

export default function InvoicePreview({ invoice, items, property }: InvoicePreviewProps) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        style={{
          display: 'inline-block',
          textDecoration: 'none',
          background: 'var(--purple-soft)',
          color: 'var(--purple)',
          padding: '8px 14px',
          borderRadius: '10px',
          fontWeight: 700,
          fontSize: '13px',
          marginBottom: '12px',
          border: 'none',
          cursor: 'pointer',
        }}
      >
        View Invoice {invoice.invoice_number ? `(${invoice.invoice_number})` : ''} — $
        {Number(invoice.total).toFixed(2)} · {invoice.payment_status}
      </button>

      {open && (
        <div
          onClick={() => setOpen(false)}
          className="invoice-preview-overlay"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 3000,
            padding: '20px',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#fff',
              borderRadius: 'var(--radius)',
              boxShadow: 'var(--shadow-lg)',
              padding: '0',
              width: '100%',
              maxWidth: '680px',
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
          >
            <div
              className="invoice-preview-actions"
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '16px 24px',
                borderBottom: '1px solid var(--border)',
                position: 'sticky',
                top: 0,
                background: '#fff',
              }}
            >
              <h3 style={{ margin: 0 }}>Invoice {invoice.invoice_number || ''}</h3>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => window.print()}
                  style={{
                    background: 'var(--purple)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '8px 14px',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Download / Print
                </button>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  style={{
                    background: 'var(--purple-soft)',
                    color: 'var(--purple)',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '8px 14px',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Close ✕
                </button>
              </div>
            </div>

            <div className="invoice-print" style={{ padding: '28px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
                <div>
                  <h2 style={{ margin: '0 0 4px 0' }}>Rose Legacy</h2>
                  <p style={{ margin: 0, color: 'var(--text-muted)' }}>Home Solutions</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ margin: '0 0 4px 0', fontWeight: 700 }}>Invoice {invoice.invoice_number || ''}</p>
                  <p style={{ margin: 0, color: 'var(--text-muted)' }}>
                    {invoice.invoice_date ? new Date(invoice.invoice_date).toLocaleDateString() : ''}
                  </p>
                </div>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <p style={{ margin: '0 0 4px 0', fontWeight: 700 }}>Billed to</p>
                <p style={{ margin: 0 }}>{invoice.client_name || property.name}</p>
                <p style={{ margin: 0, color: 'var(--text-muted)' }}>
                  {property.address}, {property.city}, {property.state}
                </p>
              </div>

              <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--border)', textAlign: 'left' }}>
                    <th style={{ padding: '8px 4px' }}>Description</th>
                    <th style={{ padding: '8px 4px', textAlign: 'right' }}>Qty</th>
                    <th style={{ padding: '8px 4px', textAlign: 'right' }}>Unit Price</th>
                    <th style={{ padding: '8px 4px', textAlign: 'right' }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '8px 4px' }}>{item.description}</td>
                      <td style={{ padding: '8px 4px', textAlign: 'right' }}>{item.qty}</td>
                      <td style={{ padding: '8px 4px', textAlign: 'right' }}>${Number(item.unit_price).toFixed(2)}</td>
                      <td style={{ padding: '8px 4px', textAlign: 'right' }}>${Number(item.line_total).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <div style={{ width: '240px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                    <span>Subtotal</span>
                    <span>${Number(invoice.subtotal || 0).toFixed(2)}</span>
                  </div>
                  {!!invoice.discount_amount && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                      <span>Discount {invoice.discount_rate ? `(${invoice.discount_rate}%)` : ''}</span>
                      <span>-${Number(invoice.discount_amount).toFixed(2)}</span>
                    </div>
                  )}
                  {!!invoice.tax_amount && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                      <span>Tax {invoice.tax_rate ? `(${invoice.tax_rate}%)` : ''}</span>
                      <span>${Number(invoice.tax_amount).toFixed(2)}</span>
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderTop: '2px solid var(--border)', fontWeight: 700, fontSize: '16px' }}>
                    <span>Total</span>
                    <span>${Number(invoice.total).toFixed(2)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                    <span>Status</span>
                    <span style={{ textTransform: 'capitalize' }}>{invoice.payment_status}</span>
                  </div>
                </div>
              </div>

              {invoice.payment_method && (
                <p style={{ marginTop: '20px' }}>
                  <strong>Payment method:</strong> {invoice.payment_method}
                </p>
              )}
              {invoice.terms && (
                <p>
                  <strong>Terms:</strong> {invoice.terms}
                </p>
              )}
              {invoice.notes && (
                <p>
                  <strong>Notes:</strong> {invoice.notes}
                </p>
              )}
              {invoice.warranty_disclaimer && (
                <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>{invoice.warranty_disclaimer}</p>
              )}
            </div>
          </div>
        </div>
      )}

      <style>
        {`
          @media print {
            body * {
              visibility: hidden;
            }
            .invoice-print, .invoice-print * {
              visibility: visible;
            }
            .invoice-print {
              position: absolute;
              top: 0;
              left: 0;
              width: 100%;
              padding: 20px !important;
            }
            .invoice-preview-overlay, .invoice-preview-actions {
              background: none !important;
              box-shadow: none !important;
            }
          }
        `}
      </style>
    </>
  )
}
