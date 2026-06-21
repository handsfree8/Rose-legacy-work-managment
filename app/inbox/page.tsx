import Link from 'next/link'
import { supabaseAdmin as supabase } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

export default async function InboxPage() {
  const { data: estimates } = await supabase
    .from('estimates')
    .select('id, ticket_id, property_id, description, amount, status, landlord_comment, created_at')
    .not('landlord_comment', 'is', null)
    .order('created_at', { ascending: false })

  const ticketIds = [...new Set((estimates || []).map(e => e.ticket_id).filter(Boolean))]
  const { data: tickets } = ticketIds.length
    ? await supabase.from('tickets').select('id, title, unit_number, property_id, properties(name)').in('id', ticketIds)
    : { data: [] }
  const ticketMap = new Map((tickets || []).map(t => [t.id, t]))

  return (
    <main style={{ padding: '40px 24px 80px', background: 'var(--bg)', minHeight: '100vh' }}>
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '30px', margin: '0 0 6px' }}>Landlord Questions</h1>
        <p style={{ color: 'var(--text-muted)', marginBottom: '28px' }}>
          Questions landlords left on estimates. Open the work order to respond.
        </p>

        <div style={{ display: 'grid', gap: '12px' }}>
          {(estimates || []).map((e) => {
            const t = e.ticket_id ? ticketMap.get(e.ticket_id) : null
            const propName = (t?.properties as { name?: string } | null)?.name
            return (
              <Link
                key={e.id}
                href={t ? `/tickets/${e.ticket_id}` : '#'}
                style={{
                  textDecoration: 'none',
                  background: '#fff',
                  border: '1px solid var(--border)',
                  borderLeft: '4px solid #e5484d',
                  borderRadius: '14px',
                  padding: '16px 18px',
                  boxShadow: 'var(--shadow)',
                  display: 'block',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                  <span style={{ fontWeight: 700, color: 'var(--text)' }}>
                    {t?.title || e.description || 'Estimate'}
                  </span>
                  <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
                    {propName ? `${propName} · ` : ''}{e.created_at ? new Date(e.created_at).toLocaleDateString() : ''}
                  </span>
                </div>
                <p style={{ margin: '10px 0 0', color: 'var(--text)', background: '#fff7f7', border: '1px solid #ffd7d7', borderRadius: '10px', padding: '10px 12px' }}>
                  “{e.landlord_comment}”
                </p>
                <span style={{ display: 'inline-block', marginTop: '10px', color: 'var(--purple)', fontWeight: 700, fontSize: '13px' }}>
                  Open work order →
                </span>
              </Link>
            )
          })}
          {(!estimates || estimates.length === 0) && (
            <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: '12px', padding: '20px', color: 'var(--text-muted)' }}>
              No landlord questions right now. 🎉
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
