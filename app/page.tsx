import Link from 'next/link'
import { headers } from 'next/headers'

import { supabaseAdmin as supabase } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

export default async function Home() {
  const { data: properties, error } = await supabase
    .from('properties')
    .select('*')
    .order('created_at', { ascending: true })

  // Base URL for building per-property landlord portal links (Email / share).
  const h = await headers()
  const baseUrl = `${h.get('x-forwarded-proto') || 'https'}://${h.get('x-forwarded-host') || h.get('host') || 'rose-legacy-work-management.vercel.app'}`

  // Business pulse — counts for the KPI strip.
  const [openTickets, pendingEstimates, landlordQuestions, unpaidInvoices] = await Promise.all([
    supabase.from('tickets').select('id', { count: 'exact', head: true })
      .not('status', 'in', '(resolved,closed,completed)'),
    supabase.from('estimates').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('estimates').select('id', { count: 'exact', head: true }).not('landlord_comment', 'is', null),
    supabase.from('invoices').select('total, payment_status').in('payment_status', ['pending', 'overdue']),
  ])

  const unpaidRows = unpaidInvoices.data || []
  const unpaidTotal = unpaidRows.reduce((sum, r) => sum + Number(r.total || 0), 0)
  const fmtUsd = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)

  const kpis = [
    { label: 'Open Tickets', value: String(openTickets.count ?? 0), sub: 'need attention', href: '/open-tickets', tone: '#6b35b8' },
    { label: 'Pending Estimates', value: String(pendingEstimates.count ?? 0), sub: 'awaiting landlord', href: '/open-tickets', tone: '#c9622a' },
    { label: 'Landlord Questions', value: String(landlordQuestions.count ?? 0), sub: 'to respond', href: '/inbox', tone: '#e5484d' },
    { label: 'Unpaid Invoices', value: String(unpaidRows.length), sub: unpaidTotal > 0 ? fmtUsd(unpaidTotal) + ' due' : 'all paid', href: '/open-tickets', tone: '#1e8e3e' },
  ]

  return (
    <main
      style={{
        minHeight: '100vh',
        background: 'var(--bg)',
        padding: '48px 24px 80px',
        
      }}
    >
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        
        {/* HEADER */}
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <p
            style={{
              margin: 0,
              color: 'var(--purple-mid)',
              fontWeight: 700,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              fontSize: '12px',
            }}
          >
            Rose Legacy Management
          </p>

          <h1
            style={{
              margin: '10px 0 10px',
              fontSize: '52px',
              lineHeight: 1.05,
              color: 'var(--text)',
              fontWeight: 700,
            }}
          >
            Properties
          </h1>

          <p
            style={{
              margin: 0,
              color: '#6b7280',
              fontSize: '18px',
            }}
          >
            Manage your properties and access maintenance activity in one place.
          </p>
        </div>

        {/* KPI STRIP — business pulse */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
            gap: '14px',
            marginBottom: '40px',
          }}
        >
          {kpis.map((k) => (
            <Link
              key={k.label}
              href={k.href}
              style={{
                textDecoration: 'none',
                background: '#fff',
                border: '1px solid var(--border)',
                borderRadius: '16px',
                padding: '18px 20px',
                boxShadow: 'var(--shadow)',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
                borderTop: `3px solid ${k.tone}`,
              }}
            >
              <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                {k.label}
              </span>
              <span style={{ fontSize: '34px', fontWeight: 800, color: k.tone, lineHeight: 1.1 }}>
                {k.value}
              </span>
              <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{k.sub}</span>
            </Link>
          ))}
        </div>

        {/* ERROR */}
        {error && (
          <p
            style={{
              color: '#b91c1c',
              marginBottom: '20px',
              background: '#fee2e2',
              border: '1px solid #fecaca',
              padding: '12px 14px',
              borderRadius: '12px',
            }}
          >
            Error: {error.message}
          </p>
        )}

        {/* GRID */}
        <div
          style={{
            display: 'grid',
            gap: '28px',
            gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))',
          }}
        >
          {properties?.map((p) => (
            <div
              key={p.id}
              className="property-card"
              style={{
                border: '1px solid #e5e7eb',
                borderRadius: '24px',
                overflow: 'hidden',
                backgroundColor: '#fff',
                boxShadow: '0 10px 30px rgba(15, 23, 42, 0.08)',
                transition: 'all 0.25s ease',
              }}
            >
              {/* IMAGE CLICKABLE */}
              <Link
                href={`/access/${p.id}`}
                style={{
                  textDecoration: 'none',
                  color: 'inherit',
                  display: 'block',
                }}
              >
                {p.photo_url && (
                  <img
                    src={p.photo_url}
                    alt={p.name}
                    style={{
                      width: '100%',
                      height: '220px',
                      objectFit: 'cover',
                      display: 'block',
                    }}
                  />
                )}

                <div style={{ padding: '20px 20px 10px' }}>
                  <div
                    style={{
                      display: 'inline-block',
                      marginBottom: '14px',
                      padding: '7px 12px',
                      borderRadius: '999px',
                      background: 'var(--purple-soft)',
                      color: 'var(--purple-mid)',
                      fontSize: '12px',
                      fontWeight: 700,
                    }}
                  >
                    Active Property
                  </div>

                  <h2
                    style={{
                      margin: '0 0 12px 0',
                      fontSize: '24px',
                      lineHeight: 1.2,
                      color: 'var(--text)',
                      fontWeight: 700,
                    }}
                  >
                    {p.name}
                  </h2>

                  <p
                    style={{
                      margin: '0 0 8px 0',
                      color: '#374151',
                      fontSize: '16px',
                    }}
                  >
                    {p.address}
                  </p>

                  <p
                    style={{
                      margin: '0 0 20px 0',
                      color: '#6b7280',
                      fontSize: '16px',
                    }}
                  >
                    {p.city}, {p.state}
                  </p>
                </div>
              </Link>

              {/* ACTIONS */}
              <div
                style={{
                  padding: '0 20px 20px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <Link
                  href={`/access/${p.id}`}
                  style={{
                    textDecoration: 'none',
                    color: 'var(--text)',
                    fontWeight: 700,
                    fontSize: '15px',
                  }}
                >
                  View Property →
                </Link>

                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  {p.landlord_token && (
                    <a
                      href={`mailto:?subject=${encodeURIComponent(`Work Order Report — ${p.name}`)}&body=${encodeURIComponent(`Hello,\n\nHere is the live work order report for ${p.name} from Rose Legacy Home Solutions:\n\n${baseUrl}/landlord/${p.landlord_token}\n\nYou can review all work orders, photos, and payment history at the link above.\n\nThank you,\nRose Legacy Home Solutions`)}`}
                      title="Email this property's portal link to the landlord"
                      style={{
                        textDecoration: 'none',
                        color: 'var(--purple-mid)',
                        height: '36px',
                        width: '36px',
                        borderRadius: '10px',
                        background: 'var(--purple-soft)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 5L2 7"/></svg>
                    </a>
                  )}
                  {p.landlord_token && (
                    <a
                      href={`/landlord/${p.landlord_token}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Open this property's landlord portal in a new tab"
                      style={{
                        textDecoration: 'none',
                        color: 'var(--gold, #b8860b)',
                        fontWeight: 700,
                        fontSize: '14px',
                        lineHeight: 1,
                        height: '36px',
                        padding: '0 14px',
                        borderRadius: '10px',
                        background: '#fff7e6',
                        border: '1px solid #ffe1a8',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        whiteSpace: 'nowrap',
                        boxSizing: 'border-box',
                      }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                      Landlord View
                    </a>
                  )}
                  <Link
                    href={`/properties/${p.id}/edit`}
                    style={{
                      textDecoration: 'none',
                      color: 'var(--purple-mid)',
                      fontWeight: 700,
                      fontSize: '14px',
                      lineHeight: 1,
                      height: '36px',
                      padding: '0 14px',
                      borderRadius: '10px',
                      background: 'var(--purple-soft)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      whiteSpace: 'nowrap',
                      boxSizing: 'border-box',
                    }}
                  >
                    Manage
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* ADD BUTTON */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            marginTop: '40px',
          }}
        >
          <Link
            href="/properties/new"
            style={{
              textDecoration: 'none',
              background: 'var(--purple)',
              color: '#fff',
              padding: '14px 20px',
              borderRadius: '14px',
              fontWeight: 700,
              fontSize: '16px',
            }}
          >
            + Add Property
          </Link>
        </div>
      </div>

      {/* HOVER EFFECT */}
      <style>
        {`
          .property-card:hover {
            transform: translateY(-6px);
            box-shadow: 0 18px 40px rgba(15, 23, 42, 0.14);
            border-color: var(--purple-soft);
          }
        `}
      </style>
    </main>
  )
}