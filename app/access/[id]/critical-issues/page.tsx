import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!
)

type PageProps = {
  params: Promise<{ id: string }>
}

export default async function CriticalIssuesPage({ params }: PageProps) {
  const { id } = await params

  const { data: property } = await supabase
    .from('properties')
    .select('*')
    .eq('id', id)
    .single()

  const { data: tickets } = await supabase
    .from('tickets')
    .select('*')
    .eq('property_id', id)
    .eq('priority', 'critical')
    .in('status', ['new', 'reviewed', 'dispatched', 'in_progress'])
    .order('created_at', { ascending: false })

  return (
    <main style={{ padding: '20px',  background: 'var(--bg)', minHeight: '100vh' }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
        <Link href={`/access/${id}`} style={{ textDecoration: 'none', color: 'var(--purple)', fontWeight: 600 }}>
          ← Back to property
        </Link>

        <h1 style={{ marginTop: '20px' }}>Critical Issues</h1>
        <p style={{ color: 'var(--text-muted)' }}>{property?.name}</p>

        {!tickets || tickets.length === 0 ? (
          <div style={{ marginTop: '20px', background: '#fff', padding: '20px', borderRadius: '12px', border: '1px solid var(--border)' }}>
            No critical issues.
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '14px', marginTop: '20px' }}>
            {tickets.map((ticket) => (
              <Link
                key={ticket.id}
                href={`/tickets/${ticket.id}`}
                style={{ textDecoration: 'none', color: 'inherit' }}
              >
                <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: '12px', padding: '18px' }}>
                  <h3 style={{ margin: '0 0 8px 0' }}>{ticket.title}</h3>
                  <p style={{ margin: '0 0 8px 0', color: 'var(--text-muted)' }}>Unit: {ticket.unit_number || 'N/A'}</p>
                  <p style={{ margin: '0 0 8px 0' }}>{ticket.summary_es || ticket.summary_en}</p>
                  <p style={{ margin: 0, fontSize: '12px', color: '#999' }}>
                    Created: {ticket.created_at ? new Date(ticket.created_at).toLocaleString() : 'N/A'}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}