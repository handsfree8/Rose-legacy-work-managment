import Link from 'next/link'
import { supabaseAdmin as supabase } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

export default async function EstimatesPage() {
  const { data: estimates } = await supabase
    .from('estimates')
    .select('*, properties(id, name, address, city, state)')
    .eq('status', 'pending')
    .order('created_at', { ascending: false })

  const fmtUsd = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)

  const pending = (estimates || [])
  const standalone = pending.filter((e) => !e.ticket_id)
  const ticketLinked = pending.filter((e) => e.ticket_id)

  function daysLeft(expiresAt: string | null): string {
    if (!expiresAt) return ''
    const diff = new Date(expiresAt).getTime() - Date.now()
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24))
    if (days <= 0) return 'Expired'
    if (days === 1) return 'Expires tomorrow'
    return `Expires in ${days} days`
  }

  const EstimateRow = ({ est }: { est: typeof pending[number] }) => {
    const property = est.properties as unknown as { id: string; name: string; address: string; city: string; state: string } | null
    const expiry = daysLeft(est.expires_at)
    return (
      <div
        style={{
          background: '#fff',
          border: '1px solid var(--border)',
          borderRadius: '14px',
          padding: '18px 20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: '16px',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ flex: 1, minWidth: '200px' }}>
          <div style={{ fontWeight: 700, fontSize: '18px', color: 'var(--purple)', marginBottom: '4px' }}>
            {fmtUsd(Number(est.amount))}
          </div>
          {property && (
            <Link
              href={`/access/${property.id}`}
              style={{ textDecoration: 'none', color: 'var(--text)', fontWeight: 600, fontSize: '14px' }}
            >
              {property.name} — {property.address}, {property.city}, {property.state}
            </Link>
          )}
          <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '6px', whiteSpace: 'pre-line' }}>
            {(est.description || '').split('\n').slice(0, 3).join('\n')}
            {(est.description || '').split('\n').length > 3 && ' …'}
          </div>
          {est.landlord_comment && (
            <div style={{ marginTop: '8px', background: '#fff7e6', borderRadius: '8px', padding: '8px 10px', fontSize: '13px', color: '#92400e' }}>
              Question: {est.landlord_comment}
            </div>
          )}
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontSize: '12px', color: '#c9622a', fontWeight: 700 }}>{expiry}</div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
            {new Date(est.created_at).toLocaleDateString()}
          </div>
          {est.ticket_id && (
            <Link
              href={`/tickets/${est.ticket_id}`}
              style={{ display: 'block', marginTop: '8px', fontSize: '12px', color: 'var(--purple)', fontWeight: 700 }}
            >
              View ticket →
            </Link>
          )}
        </div>
      </div>
    )
  }

  return (
    <main style={{ padding: '32px 20px 80px', background: 'var(--bg)', minHeight: '100vh' }}>
      <div style={{ maxWidth: '860px', margin: '0 auto' }}>
        <Link href="/" style={{ textDecoration: 'none', color: 'var(--purple)', fontWeight: 600 }}>← Back to Properties</Link>

        <div style={{ margin: '20px 0 28px' }}>
          <h1 style={{ margin: '0 0 6px', fontSize: '32px' }}>Pending Estimates</h1>
          <p style={{ margin: 0, color: 'var(--text-muted)' }}>Estimates waiting for landlord approval.</p>
        </div>

        {pending.length === 0 && (
          <div style={{ textAlign: 'center', padding: '48px', background: '#fff', border: '1px dashed #ccc', borderRadius: '14px', color: 'var(--text-muted)' }}>
            No pending estimates right now.
          </div>
        )}

        {standalone.length > 0 && (
          <div style={{ marginBottom: '28px' }}>
            <div style={{ fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-muted)', marginBottom: '10px' }}>
              Standalone — awaiting approval ({standalone.length})
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {standalone.map((e) => <EstimateRow key={e.id} est={e} />)}
            </div>
          </div>
        )}

        {ticketLinked.length > 0 && (
          <div>
            <div style={{ fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-muted)', marginBottom: '10px' }}>
              Linked to work orders ({ticketLinked.length})
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {ticketLinked.map((e) => <EstimateRow key={e.id} est={e} />)}
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
