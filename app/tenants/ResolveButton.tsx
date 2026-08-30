'use client'

import { useTransition } from 'react'
import { resolveTicket } from './actions'

export default function ResolveButton({ ticketId }: { ticketId: string }) {
  const [pending, start] = useTransition()
  return (
    <button
      disabled={pending}
      onClick={() => start(async () => { await resolveTicket(ticketId) })}
      style={{
        background: pending ? '#f0fdf4' : 'transparent',
        color: pending ? '#16a34a' : 'var(--text-muted)',
        border: '1px solid var(--border)', borderRadius: 6, padding: '3px 8px',
        fontSize: 11, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap',
        opacity: pending ? .7 : 1,
      }}
    >
      {pending ? '✓ Done' : 'Resolve'}
    </button>
  )
}
