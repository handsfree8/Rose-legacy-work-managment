'use client'

import { useRef, useState, useTransition } from 'react'
import { sendTenantMessage } from './actions'

type Message = {
  id: string
  sender: 'tenant' | 'manager'
  body: string
  created_at: string
  ticket_id: string | null
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}

export default function MessageThread({ token, messages, managerName }: {
  token: string
  messages: Message[]
  managerName: string
}) {
  const [body,    setBody]    = useState('')
  const [error,   setError]   = useState('')
  const [pending, startTransition] = useTransition()
  const bottomRef = useRef<HTMLDivElement>(null)

  function handleSend(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = body.trim()
    if (!trimmed) return
    setError('')
    const fd = new FormData()
    fd.set('token', token)
    fd.set('body', trimmed)
    startTransition(async () => {
      try {
        await sendTenantMessage(fd)
        setBody('')
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Could not send.')
      }
    })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Thread */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 16px 0', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {messages.length === 0 && (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 13, padding: '40px 0' }}>
            No messages yet. Send the first one below.
          </div>
        )}
        {messages.map(m => (
          <div key={m.id} style={{ display: 'flex', justifyContent: m.sender === 'tenant' ? 'flex-end' : 'flex-start' }}>
            <div style={{ maxWidth: '78%' }}>
              {m.sender === 'manager' && (
                <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 3, paddingLeft: 4 }}>{managerName}</div>
              )}
              <div style={{
                background: m.sender === 'tenant'
                  ? 'linear-gradient(135deg, var(--purple), var(--purple-mid))'
                  : 'var(--card)',
                color: m.sender === 'tenant' ? '#fff' : 'var(--text)',
                border: m.sender === 'manager' ? '1px solid var(--border)' : 'none',
                borderRadius: m.sender === 'tenant' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                padding: '11px 14px',
                fontSize: 13,
                lineHeight: 1.55,
                boxShadow: 'var(--shadow)',
              }}>{m.body}</div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4, textAlign: m.sender === 'tenant' ? 'right' : 'left', paddingInline: 4 }}>
                {formatTime(m.created_at)}
              </div>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{ padding: '12px 16px 20px', borderTop: '1px solid var(--border)', background: 'var(--bg)', flexShrink: 0 }}>
        {error && <div style={{ fontSize: 12, color: '#b91c1c', marginBottom: 8 }}>{error}</div>}
        <form onSubmit={handleSend} style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
          <textarea
            value={body}
            onChange={e => setBody(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(e as unknown as React.FormEvent) } }}
            rows={2}
            maxLength={4000}
            placeholder="Write a message… (Enter to send)"
            style={{ flex: 1, resize: 'none', borderRadius: 16, padding: '10px 14px', fontSize: 13 }}
          />
          <button type="submit" disabled={pending || !body.trim()} style={{
            width: 42, height: 42, borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--purple), var(--purple-mid))',
            border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0, opacity: (!body.trim() || pending) ? .5 : 1,
          }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="22 2 15 22 11 13 2 9 22 2"/>
            </svg>
          </button>
        </form>
      </div>
    </div>
  )
}
