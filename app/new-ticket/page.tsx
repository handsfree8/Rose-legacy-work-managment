import Link from 'next/link'
import { supabaseAdmin as supabase } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

export default async function NewTicketPicker() {
  const { data: properties } = await supabase
    .from('properties')
    .select('id, name, address, city, state, photo_url')
    .order('name', { ascending: true })

  return (
    <main style={{ padding: '40px 24px 80px', background: 'var(--bg)', minHeight: '100vh' }}>
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '30px', margin: '0 0 6px' }}>New Work Order</h1>
        <p style={{ color: 'var(--text-muted)', marginBottom: '28px' }}>
          Choose the property you want to create a work order for.
        </p>

        <div style={{ display: 'grid', gap: '12px' }}>
          {(properties || []).map((p) => (
            <Link
              key={p.id}
              href={`/access/${p.id}/new-ticket`}
              style={{
                textDecoration: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                background: '#fff',
                border: '1px solid var(--border)',
                borderRadius: '14px',
                padding: '14px 16px',
                boxShadow: 'var(--shadow)',
              }}
            >
              {p.photo_url ? (
                <img src={`${p.photo_url}?width=160`} alt={p.name} style={{ width: '64px', height: '64px', borderRadius: '12px', objectFit: 'cover' }} />
              ) : (
                <div style={{ width: '64px', height: '64px', borderRadius: '12px', background: 'var(--purple-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px' }}>🏠</div>
              )}
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, color: 'var(--text)', fontSize: '17px' }}>{p.name}</div>
                <div style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '2px' }}>
                  {[p.address, p.city, p.state].filter(Boolean).join(', ')}
                </div>
              </div>
              <span style={{ color: 'var(--purple)', fontWeight: 700, fontSize: '20px' }}>+</span>
            </Link>
          ))}
          {(!properties || properties.length === 0) && (
            <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: '12px', padding: '20px' }}>
              No properties yet. Add one first.
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
