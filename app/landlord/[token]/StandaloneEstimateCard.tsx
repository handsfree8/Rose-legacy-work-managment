'use client'

import { useState } from 'react'
import { approveEstimate, rejectEstimate, askEstimateQuestion } from './actions'

type StandaloneEstimate = {
  id: string
  amount: number
  description: string
  notes: string | null
  status: string
  landlord_comment: string | null
  expires_at: string | null
  created_at: string
}

function daysLeft(expiresAt: string | null): string | null {
  if (!expiresAt) return null
  const diff = new Date(expiresAt).getTime() - Date.now()
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24))
  if (days <= 0) return 'Expired'
  if (days === 1) return 'Expires tomorrow'
  return `Expires in ${days} days`
}

export default function StandaloneEstimateCard({
  estimate,
  token,
}: {
  estimate: StandaloneEstimate
  token: string
}) {
  const [showQuestion, setShowQuestion] = useState(false)
  const expiry = daysLeft(estimate.expires_at)
  const fmtUsd = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)

  return (
    <div
      style={{
        background: '#fff',
        border: '2px solid var(--purple)',
        borderRadius: '14px',
        overflow: 'hidden',
        boxShadow: '0 2px 12px rgba(74,32,128,0.08)',
      }}
    >
      {/* Header */}
      <div
        style={{
          background: 'linear-gradient(135deg, #4a2080 0%, #6b35b8 100%)',
          padding: '14px 18px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '12px',
          flexWrap: 'wrap',
        }}
      >
        <div>
          <div style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.75)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '2px' }}>
            Ball Park Estimate
          </div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: '#fff', lineHeight: 1 }}>
            {fmtUsd(Number(estimate.amount))}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          {estimate.status === 'pending' ? (
            <>
              <span style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', borderRadius: '999px', padding: '4px 10px', fontSize: '12px', fontWeight: 700 }}>
                Pending approval
              </span>
              {expiry && (
                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.7)', marginTop: '4px' }}>
                  {expiry}
                </div>
              )}
            </>
          ) : (
            <span
              style={{
                borderRadius: '999px',
                padding: '4px 12px',
                fontSize: '12px',
                fontWeight: 700,
                background: estimate.status === 'approved' ? '#f6ffed' : '#fff1f0',
                color: estimate.status === 'approved' ? '#389e0d' : '#cf1322',
              }}
            >
              {estimate.status.charAt(0).toUpperCase() + estimate.status.slice(1)}
            </span>
          )}
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: '12px' }}>

        {/* Line items parsed from description */}
        <div>
          <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>
            Scope of Work
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {estimate.description.split('\n').filter(Boolean).map((line, i) => (
              <div key={i} style={{ display: 'flex', gap: '8px', fontSize: '14px', color: 'var(--text)' }}>
                <span style={{ color: 'var(--purple)', fontWeight: 700, minWidth: '14px' }}>·</span>
                <span>{line}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Notes */}
        {estimate.notes && (
          <div style={{ background: 'var(--purple-light)', borderRadius: '10px', padding: '12px 14px' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--purple)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>
              Notes
            </div>
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--text)', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
              {estimate.notes}
            </p>
          </div>
        )}

        {/* Landlord comment */}
        {estimate.landlord_comment && (
          <div style={{ background: '#fff7e6', borderRadius: '10px', padding: '10px 14px', border: '1px solid #ffe58f' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#d46b08', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '2px' }}>
              Your question
            </div>
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--text)' }}>{estimate.landlord_comment}</p>
          </div>
        )}

        {/* Actions */}
        {estimate.status === 'pending' && (
          <>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <form action={approveEstimate}>
                <input type="hidden" name="estimate_id" value={estimate.id} />
                <input type="hidden" name="token" value={token} />
                <button
                  type="submit"
                  style={{
                    background: '#389e0d',
                    color: '#fff',
                    border: 'none',
                    padding: '10px 20px',
                    borderRadius: '10px',
                    fontWeight: 700,
                    fontSize: '14px',
                    cursor: 'pointer',
                  }}
                >
                  ✓ Approve — Create Work Order
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
                    padding: '10px 20px',
                    borderRadius: '10px',
                    fontWeight: 700,
                    fontSize: '14px',
                    cursor: 'pointer',
                  }}
                >
                  Decline
                </button>
              </form>
              <button
                type="button"
                onClick={() => setShowQuestion(!showQuestion)}
                style={{
                  background: 'none',
                  border: '1px solid var(--purple)',
                  color: 'var(--purple)',
                  padding: '10px 16px',
                  borderRadius: '10px',
                  fontWeight: 700,
                  fontSize: '14px',
                  cursor: 'pointer',
                }}
              >
                {showQuestion ? 'Cancel' : 'I have questions'}
              </button>
            </div>

            {showQuestion && (
              <form
                action={askEstimateQuestion}
                onSubmit={() => setShowQuestion(false)}
                style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}
              >
                <input type="hidden" name="estimate_id" value={estimate.id} />
                <input type="hidden" name="token" value={token} />
                <textarea
                  name="comment"
                  placeholder="Type your question or comment about this estimate..."
                  rows={3}
                  defaultValue={estimate.landlord_comment || ''}
                  style={{
                    flex: 1,
                    minWidth: '240px',
                    border: '1px solid var(--border)',
                    borderRadius: '10px',
                    padding: '10px 12px',
                    fontFamily: 'inherit',
                    fontSize: '14px',
                    resize: 'vertical',
                  }}
                />
                <button
                  type="submit"
                  style={{
                    background: 'var(--purple)',
                    color: '#fff',
                    border: 'none',
                    padding: '10px 18px',
                    borderRadius: '10px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    alignSelf: 'flex-start',
                  }}
                >
                  Send
                </button>
              </form>
            )}
          </>
        )}
      </div>
    </div>
  )
}
