'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { createBrowserSupabase } from '@/lib/supabase/browser'

type SiteHeaderProps = {
  invoiceAppUrl?: string
}

export default function SiteHeader({ invoiceAppUrl }: SiteHeaderProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [openCount, setOpenCount] = useState<number | null>(null)
  const [questionCount, setQuestionCount] = useState<number | null>(null)

  const hidden = pathname?.startsWith('/landlord') || pathname === '/login'

  useEffect(() => {
    if (hidden) return
    let cancelled = false
    const supabase = createBrowserSupabase()
    ;(async () => {
      const [openRes, qRes] = await Promise.all([
        supabase.from('tickets').select('id', { count: 'exact', head: true })
          .not('status', 'in', '(resolved,closed,completed)'),
        supabase.from('estimates').select('id', { count: 'exact', head: true })
          .not('landlord_comment', 'is', null),
      ])
      if (cancelled) return
      setOpenCount(openRes.count ?? 0)
      setQuestionCount(qRes.count ?? 0)
    })()
    return () => { cancelled = true }
  }, [hidden, pathname])

  if (hidden) return null

  async function handleSignOut() {
    const supabase = createBrowserSupabase()
    await supabase.auth.signOut()
    router.replace('/login')
    router.refresh()
  }

  const isProperties = pathname === '/' || pathname?.startsWith('/access') || pathname?.startsWith('/properties')
  const isDashboard = pathname?.startsWith('/dashboard')
  const isOpenTickets = pathname?.startsWith('/open-tickets')
  const isNewTicket = pathname?.startsWith('/new-ticket')
  const isUsers = pathname?.startsWith('/users')

  const navLink = (active: boolean): React.CSSProperties => ({
    textDecoration: 'none',
    color: active ? 'var(--purple)' : 'var(--text)',
    fontWeight: active ? 800 : 600,
    fontSize: '14px',
    padding: '6px 10px',
    borderRadius: '8px',
    background: active ? 'var(--purple-soft)' : 'transparent',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '7px',
  })

  const badge = (n: number, tone: 'purple' | 'red'): React.CSSProperties => ({
    fontSize: '11px',
    fontWeight: 800,
    lineHeight: 1,
    minWidth: '18px',
    height: '18px',
    padding: '0 5px',
    borderRadius: '999px',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#fff',
    background: tone === 'red' ? '#e5484d' : 'var(--purple)',
  })

  return (
    <header
      style={{
        background: 'var(--card)',
        borderBottom: '1px solid var(--border)',
        boxShadow: 'var(--shadow)',
        position: 'sticky',
        top: 0,
        zIndex: 50,
      }}
    >
      <div
        style={{
          maxWidth: '1200px',
          margin: '0 auto',
          padding: '16px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
          flexWrap: 'wrap',
        }}
      >
        <a href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <img
            src="/logo.png"
            alt="Rose Legacy logo"
            style={{ width: '48px', height: '48px', borderRadius: '12px', objectFit: 'cover', border: '1px solid var(--border)', background: '#fff' }}
          />
          <span style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.2 }}>
            <span style={{ color: 'var(--text)', fontWeight: 700, fontSize: '20px' }}>Rose Legacy</span>
            <span style={{ color: 'var(--text-muted)', fontSize: '13px', letterSpacing: '0.04em' }}>Work Management</span>
          </span>
        </a>

        <nav style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <a href="/" style={navLink(!!isProperties)}>Properties</a>

          <a href="/dashboard" style={navLink(!!isDashboard)}>Dashboard</a>

          <a href="/users" style={navLink(!!isUsers)}>Users</a>

          <a href="/open-tickets" style={navLink(!!isOpenTickets)}>
            Open Tickets
            {openCount != null && openCount > 0 && <span style={badge(openCount, 'purple')}>{openCount}</span>}
          </a>

          {/* Landlord questions inbox */}
          <a href="/inbox" style={navLink(pathname?.startsWith('/inbox') ?? false)} title="Landlord questions">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
            {questionCount != null && questionCount > 0 && <span style={badge(questionCount, 'red')}>{questionCount}</span>}
          </a>

          <a
            href="/new-ticket"
            style={{
              textDecoration: 'none',
              background: isNewTicket ? 'var(--purple-mid)' : 'var(--purple)',
              color: '#fff',
              fontWeight: 700,
              fontSize: '14px',
              padding: '9px 14px',
              borderRadius: '999px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            New Ticket
          </a>

          {invoiceAppUrl && (
            <a
              href={invoiceAppUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{ textDecoration: 'none', background: 'var(--purple-soft)', color: 'var(--purple)', fontWeight: 700, fontSize: '14px', padding: '8px 14px', borderRadius: '999px' }}
            >
              Invoices ↗
            </a>
          )}
          <button
            onClick={handleSignOut}
            style={{ border: '1px solid var(--border)', background: '#fff', color: 'var(--text-muted)', fontWeight: 600, fontSize: '13px', padding: '8px 14px', borderRadius: '999px', cursor: 'pointer' }}
          >
            Sign out
          </button>
        </nav>
      </div>
    </header>
  )
}
