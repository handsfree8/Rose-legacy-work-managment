'use client'

import { useState } from 'react'
import { payByCard } from './payment-actions'
import { surcharge } from '@/lib/surcharge'

export default function PayByCardButton({
  invoiceId,
  total,
  token,
}: {
  invoiceId: string
  total: number
  token: string
}) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { gross, fee } = surcharge(total)

  async function onClick() {
    setBusy(true)
    setError(null)
    const result = await payByCard(invoiceId, token)
    setBusy(false)
    if (result.error) {
      setError(result.error)
      return
    }
    if (result.url) window.open(result.url, '_blank', 'noopener,noreferrer')
  }

  return (
    <div style={{ marginTop: '10px' }}>
      <div
        style={{
          fontSize: '12px',
          color: '#9c6a16',
          background: '#fdf3e3',
          borderRadius: '8px',
          padding: '8px 10px',
          marginBottom: '8px',
        }}
      >
        Paying by credit/debit card adds a ${fee.toFixed(2)} processing fee (total ${gross.toFixed(2)}).
      </div>
      <button
        type="button"
        onClick={onClick}
        disabled={busy}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          background: '#2f9e44',
          color: '#fff',
          border: 'none',
          borderRadius: '10px',
          padding: '11px 18px',
          fontWeight: 700,
          fontSize: '14px',
          cursor: busy ? 'default' : 'pointer',
          opacity: busy ? 0.7 : 1,
        }}
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <rect x="2" y="5" width="20" height="14" rx="2" />
          <path d="M2 10h20" />
        </svg>
        {busy ? 'Opening…' : 'Pay by card'}
      </button>
      {error ? (
        <div style={{ color: '#cf1322', fontSize: '13px', marginTop: '6px', fontWeight: 600 }}>{error}</div>
      ) : null}
    </div>
  )
}
