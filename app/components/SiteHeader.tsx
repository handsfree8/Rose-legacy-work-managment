'use client'

import { usePathname } from 'next/navigation'

type SiteHeaderProps = {
  invoiceAppUrl?: string
}

export default function SiteHeader({ invoiceAppUrl }: SiteHeaderProps) {
  const pathname = usePathname()

  if (pathname?.startsWith('/landlord')) {
    return null
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
          padding: '14px 24px',
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
            gap: '10px',
          }}
        >
          <img
            src="/logo.png"
            alt="Rose Legacy logo"
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              objectFit: 'cover',
              border: '1px solid var(--border)',
              background: '#fff',
            }}
          />
          <span style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.15 }}>
            <span style={{ color: 'var(--text)', fontWeight: 700, fontSize: '16px' }}>
              Rose Legacy
            </span>
            <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
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
        </nav>
      </div>
    </header>
  )
}
