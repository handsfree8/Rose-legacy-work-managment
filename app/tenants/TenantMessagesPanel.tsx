'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { replyToTenant, markMessagesRead, sendWelcomeEmail, fetchTenantMessages } from './actions'
import { createBrowserSupabase } from '@/lib/supabase/browser'

type Message = {
  id: string
  sender: 'tenant' | 'manager'
  body: string
  read_at: string | null
  created_at: string
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}

export default function TenantMessagesPanel({
  tenantId,
  tenantToken,
  tenantName,
  hasUnread,
  messages: initialMessages,
  tenantEmail,
}: {
  tenantId: string
  tenantToken: string
  tenantName: string
  hasUnread: boolean
  messages: Message[]
  tenantEmail: string | null
  portalUrl: string
}) {
  const [open,     setOpen]     = useState(false)
  const [messages, setMessages] = useState(initialMessages)
  const [reply,    setReply]    = useState('')
  const [copied,   setCopied]   = useState(false)
  const [error,    setError]    = useState('')
  const [pending,  start]       = useTransition()
  const [localHasUnread, setLocalHasUnread] = useState(hasUnread)

  // Sync badge when server reports a new unread (never force-clear from props — only open chat clears it)
  useEffect(() => {
    if (hasUnread) setLocalHasUnread(true)
  }, [hasUnread])
  const [emailSent,    setEmailSent]    = useState(false)
  const [emailPending, startEmailTrans] = useTransition()
  const [emailError,   setEmailError]   = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (open) {
      setLocalHasUnread(false)
      markMessagesRead(tenantId).catch(() => {})
      setTimeout(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
        textareaRef.current?.focus()
      }, 80)
    }
  }, [open, tenantId])

  useEffect(() => {
    if (!open) return

    // Re-fetch via server action (uses supabaseAdmin, bypasses RLS) to catch messages sent while modal was closed
    fetchTenantMessages(tenantId).then(fresh => {
      setMessages(fresh)
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 80)
    }).catch(() => {})

    const supabase = createBrowserSupabase()

    const channel = supabase
      .channel(`tenant-messages-${tenantId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'tenant_messages',
          filter: `tenant_id=eq.${tenantId}`,
        },
        (payload) => {
          const newMsg = payload.new as Message
          setMessages(prev => {
            if (prev.some(m => m.id === newMsg.id)) return prev
            return [...prev, newMsg]
          })
          setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 80)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [open, tenantId])

  function handleWelcomeEmail() {
    setEmailError('')
    const fd = new FormData()
    fd.set('tenant_id', tenantId)
    startEmailTrans(async () => {
      const res = await sendWelcomeEmail(fd)
      if (res.ok) {
        setEmailSent(true)
        setTimeout(() => setEmailSent(false), 4000)
      } else {
        setEmailError(res.error)
      }
    })
  }

  function handleCopy() {
    const url = `${window.location.origin}/tenant/${tenantToken}`
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  function handleSend(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = reply.trim()
    if (!trimmed) return
    setError('')
    const fd = new FormData()
    fd.set('tenant_id', tenantId)
    fd.set('body', trimmed)
    start(async () => {
      try {
        await replyToTenant(fd)
        const optimistic: Message = {
          id: Date.now().toString(),
          sender: 'manager',
          body: trimmed,
          read_at: null,
          created_at: new Date().toISOString(),
        }
        setMessages(prev => [...prev, optimistic])
        setReply('')
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 80)
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Could not send.')
      }
    })
  }

  return (
    <>
      {/* Bottom action bar inside tenant card */}
      <div style={{ padding: '12px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
        <button
          onClick={() => setOpen(true)}
          style={{
            background: localHasUnread ? 'var(--purple)' : 'var(--purple-soft)',
            color: localHasUnread ? '#fff' : 'var(--purple)',
            border: 'none', borderRadius: 8, padding: '8px 14px',
            fontSize: 12, fontWeight: 700, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 6,
          }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
          {messages.length > 0 ? `Open Chat (${messages.length})` : 'Send a message'}
          {localHasUnread && (
            <span style={{ background: '#fff', color: 'var(--purple)', borderRadius: 20, padding: '1px 6px', fontSize: 10, fontWeight: 800 }}>
              NEW
            </span>
          )}
        </button>

        <button onClick={handleCopy} style={{
          background: copied ? '#f0fdf4' : 'transparent',
          color: copied ? '#16a34a' : 'var(--text-muted)',
          border: '1px solid var(--border)', borderRadius: 8, padding: '7px 12px',
          fontSize: 12, fontWeight: 600, cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 5,
        }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            {copied
              ? <polyline points="20 6 9 17 4 12"/>
              : <><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></>
            }
          </svg>
          {copied ? 'Copied!' : 'Copy portal link'}
        </button>

        {tenantEmail && (
          <button onClick={handleWelcomeEmail} disabled={emailPending || emailSent} style={{
            background: emailSent ? '#f0fdf4' : 'transparent',
            color: emailSent ? '#16a34a' : 'var(--text-muted)',
            border: '1px solid var(--border)', borderRadius: 8, padding: '7px 12px',
            fontSize: 12, fontWeight: 600, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 5,
            opacity: emailPending ? .6 : 1,
          }}>
            ✉ {emailSent ? 'Welcome email sent!' : emailPending ? '…' : 'Send welcome email'}
          </button>
        )}
        {emailError && <div style={{ fontSize: 11, color: '#b91c1c', width: '100%' }}>{emailError}</div>}
      </div>

      {/* Full-screen chat modal */}
      {open && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 60,
            background: 'rgba(15,10,26,.55)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '16px',
          }}
          onClick={e => { if (e.target === e.currentTarget) setOpen(false) }}
        >
          <div style={{
            background: 'var(--bg)', width: '100%', maxWidth: 560,
            height: '80vh', maxHeight: 680, borderRadius: 20,
            display: 'flex', flexDirection: 'column', overflow: 'hidden',
            boxShadow: '0 24px 64px rgba(0,0,0,.35)',
          }}>
            {/* Modal header */}
            <div style={{
              padding: '18px 20px 14px',
              borderBottom: '1px solid var(--border)',
              display: 'flex', alignItems: 'center', gap: 14, flexShrink: 0,
            }}>
              <button onClick={() => setOpen(false)} style={{
                background: 'var(--purple-soft)', border: 'none', borderRadius: 8,
                width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', flexShrink: 0,
              }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--purple)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15 18 9 12 15 6"/>
                </svg>
              </button>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)' }}>{tenantName}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>
                  {messages.length === 0 ? 'No messages yet' : `${messages.length} message${messages.length !== 1 ? 's' : ''}`}
                </div>
              </div>
              <button onClick={handleCopy} style={{
                background: copied ? '#f0fdf4' : 'var(--purple-soft)',
                color: copied ? '#16a34a' : 'var(--purple)',
                border: 'none', borderRadius: 8, padding: '7px 12px',
                fontSize: 11, fontWeight: 700, cursor: 'pointer', flexShrink: 0,
              }}>
                {copied ? '✓ Copied' : '🔗 Portal link'}
              </button>
            </div>

            {/* Message thread */}
            <div style={{ flex: 1, overflowY: 'auto', minHeight: 0, padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              {messages.length === 0 && (
                <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 13, padding: '48px 0' }}>
                  No messages yet. Send the first one below.
                </div>
              )}
              {messages.map(m => (
                <div key={m.id} style={{ display: 'flex', justifyContent: m.sender === 'manager' ? 'flex-end' : 'flex-start' }}>
                  <div style={{ maxWidth: '78%' }}>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 3, paddingInline: 4, textAlign: m.sender === 'manager' ? 'right' : 'left' }}>
                      {m.sender === 'manager' ? 'You' : tenantName}
                    </div>
                    <div style={{
                      background: m.sender === 'manager'
                        ? 'linear-gradient(135deg, var(--purple), var(--purple-mid))'
                        : 'var(--card)',
                      color: m.sender === 'manager' ? '#fff' : 'var(--text)',
                      border: m.sender === 'tenant' ? '1px solid var(--border)' : 'none',
                      borderRadius: m.sender === 'manager' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                      padding: '11px 14px', fontSize: 13, lineHeight: 1.55,
                      boxShadow: 'var(--shadow)',
                    }}>{m.body}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4, paddingInline: 4, textAlign: m.sender === 'manager' ? 'right' : 'left' }}>
                      {formatTime(m.created_at)}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>

            {/* Reply input */}
            <div style={{ padding: '12px 16px', paddingBottom: 'max(20px, env(safe-area-inset-bottom))', borderTop: '1px solid var(--border)', flexShrink: 0 }}>
              {error && <div style={{ fontSize: 12, color: '#b91c1c', marginBottom: 6 }}>{error}</div>}
              <form onSubmit={handleSend} style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
                <textarea
                  ref={textareaRef}
                  value={reply}
                  onChange={e => setReply(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(e as unknown as React.FormEvent) } }}
                  rows={2}
                  maxLength={4000}
                  placeholder={`Reply to ${tenantName}…`}
                  style={{ flex: 1, resize: 'none', borderRadius: 14, padding: '10px 14px', fontSize: 13, border: '1.5px solid var(--border)', background: 'var(--bg)', color: 'var(--text)' }}
                />
                <button type="submit" disabled={pending || !reply.trim()} style={{
                  width: 44, height: 44, borderRadius: '50%', flexShrink: 0,
                  background: 'linear-gradient(135deg, var(--purple), var(--purple-mid))',
                  border: 'none', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  opacity: (!reply.trim() || pending) ? .5 : 1,
                }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="22 2 15 22 11 13 2 9 22 2"/>
                  </svg>
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
