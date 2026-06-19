'use client'

import { usePathname, useRouter } from 'next/navigation'
import { createBrowserSupabase } from '@/lib/supabase/browser'

type SiteHeaderProps = {
  invoiceAppUrl?: string
}

export default function SiteHeader({ invoiceAppUrl }: SiteHeaderProps) {
  const pathname = usePathname()
  const router = useRouter()

  if (pathname?.startsWith('/landlord') || pathname === '/login') {
    return null
  }

  async function handleSignOut() {
    const supabase = createBrowserSupabase()
    await supabase.auth.signOut()
    router.replace('/login')
    router.refresh()
  }

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
          padding: '20px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
          flexWrap: 'wrap',
        }}
      >
        <a
          href="/"
          style={{
            textDecoration: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
          }}
        >
          <img
            src="/logo.png"
            alt="Rose Legacy logo"
            style={{
              width: '52px',
              height: '52px',
              borderRadius: '12px',
              objectFit: 'cover',
              border: '1px solid var(--border)',
              background: '#fff',
            }}
          />
          <span style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.2 }}>
            <span style={{ color: 'var(--text)', fontWeight: 700, fontSize: '20px' }}>
              Rose Legacy
            </span>
            <span style={{ color: 'var(--text-muted)', fontSize: '13px', letterSpacing: '0.04em' }}>
              Work Management
            </span>
          </span>
        </a>

        <nav style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <a
            href="/"
            style={{
              textDecoration: 'none',
              color: 'var(--text)',
              fontWeight: 600,
              fontSize: '14px',
            }}
          >
            Properties
          </a>
          <a
            href="/open-tickets"
            style={{
              textDecoration: 'none',
              color: 'var(--text)',
              fontWeight: 600,
              fontSize: '14px',
            }}
          >
            Open Tickets
          </a>
          {invoiceAppUrl && (
            <a
              href={invoiceAppUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                textDecoration: 'none',
                background: 'var(--purple-soft)',
                color: 'var(--purple)',
                fontWeight: 700,
                fontSize: '14px',
                padding: '8px 14px',
                borderRadius: '999px',
              }}
            >
              Invoices ↗
            </a>
          )}
          <button
            onClick={handleSignOut}
            style={{
              border: '1px solid var(--border)',
              background: '#fff',
              color: 'var(--text-muted)',
              fontWeight: 600,
              fontSize: '13px',
              padding: '8px 14px',
              borderRadius: '999px',
              cursor: 'pointer',
            }}
          >
            Sign out
          </button>
        </nav>
      </div>
    </header>
  )
}
