'use client'

import { useState, useTransition } from 'react'
import { replyToTenant, copyTenantLink } from './actions'

export default function TenantMessagesPanel({ tenantId, tenantToken, tenantName, hasUnread }: {
  tenantId: string
  tenantToken: string
  tenantName: string
  hasUnread: boolean
}) {
  const [open,    setOpen]    = useState(hasUnread)
  const [reply,   setReply]   = useState('')
  const [copied,  setCopied]  = useState(false)
  const [error,   setError]   = useState('')
  const [pending, startTransition] = useTransition()

  function handleCopy() {
    const url = `${window.location.origin}/tenant/${tenantToken}`
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  function handleReply(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = reply.trim()
    if (!trimmed) return
    setError('')
    const fd = new FormData()
    fd.set('tenant_id', tenantId)
    fd.set('body', trimmed)
    startTransition(async () => {
      try {
        await replyToTenant(fd)
        setReply('')
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Could not send.')
      }
    })
  }

  return (
    <div style={{ padding: '12px 20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
        <button onClick={() => setOpen(o => !o)} style={{
          background: 'none', border: 'none', fontSize: 12, fontWeight: 700,
          color: 'var(--purple)', cursor: 'pointer', padding: 0,
          display: 'flex', alignItems: 'center', gap: 6,
        }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
          {open ? 'Hide messages' : 'Send a message'}
        </button>

        <button onClick={handleCopy} style={{
          background: copied ? '#f0fdf4' : 'var(--purple-soft)',
          color: copied ? '#16a34a' : 'var(--purple)',
          border: 'none', borderRadius: 8, padding: '6px 12px',
          fontSize: 12, fontWeight: 700, cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 5,
        }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            {copied
              ? <><polyline points="20 6 9 17 4 12"/></>
              : <><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></>
            }
          </svg>
          {copied ? 'Link copied!' : 'Copy portal link'}
        </button>
      </div>

      {open && (
        <form onSubmit={handleReply} style={{ marginTop: 12, display: 'flex', gap: 8, alignItems: 'flex-end' }}>
          <div style={{ flex: 1 }}>
            {error && <div style={{ fontSize: 11, color: '#b91c1c', marginBottom: 5 }}>{error}</div>}
            <textarea
              value={reply}
              onChange={e => setReply(e.target.value)}
              rows={2}
              maxLength={4000}
              placeholder={`Message to ${tenantName}…`}
              style={{ width: '100%', resize: 'none', borderRadius: 10, padding: '9px 12px', fontSize: 13 }}
            />
          </div>
          <button type="submit" disabled={pending || !reply.trim()} style={{
            background: 'linear-gradient(135deg, var(--purple), var(--purple-mid))',
            color: '#fff', border: 'none', borderRadius: 10,
            padding: '10px 16px', fontSize: 13, fontWeight: 700,
            opacity: (!reply.trim() || pending) ? .6 : 1, flexShrink: 0,
          }}>
            {pending ? '…' : 'Send'}
          </button>
        </form>
      )}
    </div>
  )
}
