'use client'

import { useState } from 'react'
import PhotoGallery from '@/app/components/PhotoGallery'
import { approveEstimate, rejectEstimate } from './actions'

const getStatusBadgeStyle = (status: string | null) => {
  const normalized = (status || '').toLowerCase()
  if (normalized === 'completed' || normalized === 'closed') return { background: '#f6ffed', color: '#389e0d' }
  if (normalized === 'in_progress' || normalized === 'dispatched') return { background: '#e6f4ff', color: '#0958d9' }
  return { background: '#f5f5f5', color: 'var(--text)' }
}

const getEstimateStatusStyle = (status: string) => {
  if (status === 'approved') return { background: '#f6ffed', color: '#389e0d' }
  if (status === 'rejected') return { background: '#fff1f0', color: '#cf1322' }
  return { background: '#fff7e6', color: '#d46b08' }
}

type Photo = { id: string; url: string; photo_type: string }
type Estimate = {
  id: string
  amount: number
  description: string
  status: string
}
type Invoice = { id: string; invoice_number: string | null; total: number; payment_status: string }

type LandlordTicketCardProps = {
  ticket: {
    id: string
    title: string
    status: string | null
    unit_number: string | null
    created_at: string | null
    summary_en: string | null
    recommended_action: string | null
  }
  beforePhotos: Photo[]
  afterPhotos: Photo[]
  estimates: Estimate[]
  invoice?: Invoice
  invoiceAppUrl?: string
  token: string
}

export default function LandlordTicketCard({
  ticket,
  beforePhotos,
  afterPhotos,
  estimates,
  invoice,
  invoiceAppUrl,
  token,
}: LandlordTicketCardProps) {
  const [expanded, setExpanded] = useState(false)
  const hasPhotos = beforePhotos.length > 0 || afterPhotos.length > 0

  return (
    <div
      style={{
        background: '#fff',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius)',
        padding: '20px',
        boxShadow: 'var(--shadow)',
        cursor: 'pointer',
        transition: 'box-shadow 0.15s ease',
      }}
      onClick={() => setExpanded((v) => !v)}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: '12px',
          flexWrap: 'wrap',
        }}
      >
        <div>
          <h2 style={{ margin: '0 0 4px 0' }}>{ticket.title}</h2>
          <p style={{ margin: 0, color: 'var(--text-muted)' }}>
            {ticket.unit_number || 'N/A'} ·{' '}
            {ticket.created_at ? new Date(ticket.created_at).toLocaleDateString() : ''}
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span
            style={{
              padding: '8px 12px',
              borderRadius: '999px',
              fontSize: '13px',
              fontWeight: 700,
              textTransform: 'capitalize',
              ...getStatusBadgeStyle(ticket.status),
            }}
          >
            {(ticket.status || 'new').replace('_', ' ')}
          </span>
          <span style={{ color: 'var(--purple)', fontWeight: 700, fontSize: '13px' }}>
            {expanded ? 'Hide details ▲' : 'View details ▼'}
          </span>
        </div>
      </div>

      {!expanded && hasPhotos && (
        <div
          style={{
            display: 'flex',
            gap: '8px',
            marginTop: '14px',
            overflow: 'hidden',
          }}
        >
          {[...beforePhotos, ...afterPhotos].slice(0, 4).map((photo) => (
            <img
              key={photo.id}
              src={`${photo.url}?width=160`}
              alt="Job photo preview"
              loading="lazy"
              style={{
                width: '70px',
                height: '70px',
                objectFit: 'cover',
                borderRadius: '8px',
                border: '1px solid var(--border)',
              }}
            />
          ))}
        </div>
      )}

      {expanded && (
        <div onClick={(e) => e.stopPropagation()} style={{ marginTop: '16px' }}>
          {ticket.summary_en && (
            <p style={{ margin: '0 0 12px 0', color: 'var(--text)' }}>{ticket.summary_en}</p>
          )}

          {ticket.recommended_action && (
            <div
              style={{
                border: '1px solid var(--border)',
                borderRadius: '10px',
                padding: '12px',
                background: 'var(--purple-light)',
                marginBottom: '12px',
              }}
            >
              <strong>Recommended action:</strong> {ticket.recommended_action}
            </div>
          )}

          {hasPhotos && (
            <div
              style={{
                display: 'grid',
                gap: '12px',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                marginBottom: '12px',
              }}
            >
              {beforePhotos.length > 0 && (
                <div>
                  <h4 style={{ margin: '0 0 6px 0' }}>Before</h4>
                  <PhotoGallery photos={beforePhotos} />
                </div>
              )}
              {afterPhotos.length > 0 && (
                <div>
                  <h4 style={{ margin: '0 0 6px 0' }}>After</h4>
                  <PhotoGallery photos={afterPhotos} />
                </div>
              )}
            </div>
          )}

          {invoice && invoiceAppUrl && (
            <a
              href={`${invoiceAppUrl}?invoice=${invoice.id}`}
              target="_blank"
              rel="noopener noreferrer"
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
              }}
            >
              View Invoice {invoice.invoice_number ? `(${invoice.invoice_number})` : ''} — $
              {Number(invoice.total).toFixed(2)} · {invoice.payment_status}
            </a>
          )}

          {estimates.length > 0 && (
            <div>
              <h4 style={{ margin: '0 0 8px 0' }}>Estimates</h4>
              <div style={{ display: 'grid', gap: '10px' }}>
                {estimates.map((estimate) => (
                  <div
                    key={estimate.id}
                    style={{
                      border: '1px solid var(--border)',
                      borderRadius: '10px',
                      padding: '12px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: '12px',
                      flexWrap: 'wrap',
                    }}
                  >
                    <div>
                      <p style={{ margin: '0 0 4px 0', fontWeight: 600 }}>
                        ${Number(estimate.amount).toFixed(2)}
                      </p>
                      <p style={{ margin: 0, color: 'var(--text-muted)' }}>{estimate.description}</p>
                    </div>

                    {estimate.status === 'pending' ? (
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <form action={approveEstimate}>
                          <input type="hidden" name="estimate_id" value={estimate.id} />
                          <input type="hidden" name="token" value={token} />
                          <button
                            type="submit"
                            style={{
                              background: '#389e0d',
                              color: '#fff',
                              border: 'none',
                              padding: '8px 14px',
                              borderRadius: '8px',
                              fontWeight: 700,
                              cursor: 'pointer',
                            }}
                          >
                            Approve
                          </button>
                        </form>
                        <form action={rejectEstimate}>
                          <input type="hidden" name="estimate_id" value={estimate.id} />
                          <input type="hidden" name="token" value={token} />
                          <button
                            type="submit"
                            style={{
                              background: 'none',
                              border: '1px solid #b91c1c',
                              color: '#b91c1c',
                              padding: '8px 14px',
                              borderRadius: '8px',
                              fontWeight: 700,
                              cursor: 'pointer',
                            }}
                          >
                            Reject
                          </button>
                        </form>
                      </div>
                    ) : (
                      <span
                        style={{
                          padding: '6px 10px',
                          borderRadius: '999px',
                          fontSize: '12px',
                          fontWeight: 700,
                          textTransform: 'capitalize',
                          ...getEstimateStatusStyle(estimate.status),
                        }}
                      >
                        {estimate.status}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
