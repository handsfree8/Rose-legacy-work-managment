import Link from 'next/link'

import { supabaseAdmin as supabase } from '@/lib/supabase/admin'

export default async function Home() {
  const { data: properties, error } = await supabase
    .from('properties')
    .select('*')
    .order('created_at', { ascending: true })

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
                      href={`/landlord/${p.landlord_token}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Open this property's landlord portal in a new tab"
                      style={{
                        textDecoration: 'none',
                        color: 'var(--gold, #b8860b)',
                        fontWeight: 700,
                        fontSize: '14px',
                        padding: '8px 12px',
                        borderRadius: '10px',
                        background: '#fff7e6',
                        border: '1px solid #ffe1a8',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
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
                      padding: '8px 12px',
                      borderRadius: '10px',
                      background: 'var(--purple-soft)',
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