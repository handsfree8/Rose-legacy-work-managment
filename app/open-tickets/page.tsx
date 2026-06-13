import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!
)

const getStatusBadgeStyle = (status: string | null) => {
  const normalized = (status || '').toLowerCase()
  if (normalized === 'in_progress' || normalized === 'dispatched') return { background: '#e6f4ff', color: '#0958d9' }
  if (normalized === 'reviewed') return { background: '#fff7e6', color: '#d46b08' }
  return { background: '#f5f5f5', color: 'var(--text)' }
}

export const dynamic = 'force-dynamic'

export default async function OpenTicketsPage() {
  const { data: tickets } = await supabase
    .from('tickets')
    .select('id, title, status, priority, emergency, unit_number, created_at, property_id, properties(name)')
    .not('status', 'in', '(resolved,closed)')
    .order('created_at', { ascending: true })

  const allTickets = tickets || []
  const emergencyTickets = allTickets.filter((t) => t.emergency)
  const regularTickets = allTickets.filter((t) => !t.emergency)

  const byProperty = new Map<string, { name: string; tickets: typeof regularTickets }>()
  for (const ticket of regularTickets) {
    const property = ticket.properties as unknown as { name: string } | null
    const propertyName = property?.name || 'Unknown Property'
    const entry = byProperty.get(ticket.property_id) || { name: propertyName, tickets: [] }
    entry.tickets.push(ticket)
    byProperty.set(ticket.property_id, entry)
  }

  const daysAgo = (dateStr: string | null) => {
    if (!dateStr) return null
    const diff = Date.now() - new Date(dateStr).getTime()
    return Math.floor(diff / (1000 * 60 * 60 * 24))
  }

  const renderTicketRow = (ticket: (typeof allTickets)[number]) => {
    const age = daysAgo(ticket.created_at)
    return (
      <Link
        key={ticket.id}
        href={`/tickets/${ticket.id}`}
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '12px',
          flexWrap: 'wrap',
          padding: '14px 16px',
          background: '#fff',
          border: '1px solid var(--border)',
          borderRadius: '12px',
          textDecoration: 'none',
          color: 'var(--text)',
        }}
      >
        <div>
          <p style={{ margin: '0 0 4px 0', fontWeight: 700 }}>{ticket.title}</p>
          <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '13px' }}>
            {ticket.unit_number || 'N/A'}
            {age !== null && ` · ${age === 0 ? 'Today' : `${age} day${age === 1 ? '' : 's'} ago`}`}
          </p>
        </div>
        <span
          style={{
            padding: '6px 12px',
            borderRadius: '999px',
            fontSize: '12px',
            fontWeight: 700,
            textTransform: 'capitalize',
            ...getStatusBadgeStyle(ticket.status),
          }}
        >
          {(ticket.status || 'new').replace('_', ' ')}
        </span>
      </Link>
    )
  }

  return (
    <main style={{ padding: '24px', background: 'var(--bg)', minHeight: '100vh' }}>
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        <Link
          href="/"
          style={{
            display: 'inline-block',
            marginBottom: '20px',
            textDecoration: 'none',
            color: 'var(--purple)',
            fontWeight: 600,
          }}
        >
          ← Back to Properties
        </Link>

        <h1 style={{ marginTop: 0 }}>Open Tickets</h1>
        <p style={{ color: 'var(--text-muted)', marginBottom: '24px' }}>
          {allTickets.length} ticket{allTickets.length === 1 ? '' : 's'} need attention across all properties.
        </p>

        {emergencyTickets.length > 0 && (
          <div style={{ marginBottom: '28px' }}>
            <h2 style={{ color: '#b91c1c', marginBottom: '12px' }}>🚨 Emergencies</h2>
            <div style={{ display: 'grid', gap: '10px' }}>
              {emergencyTickets.map((ticket) => {
                const property = ticket.properties as unknown as { name: string } | null
                return (
                  <div key={ticket.id}>
                    <p style={{ margin: '0 0 4px 0', fontSize: '13px', fontWeight: 700, color: 'var(--text-muted)' }}>
                      {property?.name || 'Unknown Property'}
                    </p>
                    {renderTicketRow(ticket)}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {allTickets.length === 0 && (
          <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: '12px', padding: '20px' }}>
            Nothing open right now — great job!
          </div>
        )}

        <div style={{ display: 'grid', gap: '24px' }}>
          {Array.from(byProperty.entries()).map(([propertyId, { name, tickets: propertyTickets }]) => (
            <div key={propertyId}>
              <h2 style={{ marginBottom: '12px' }}>
                {name}{' '}
                <span style={{ color: 'var(--text-muted)', fontSize: '14px', fontWeight: 400 }}>
                  ({propertyTickets.length})
                </span>
              </h2>
              <div style={{ display: 'grid', gap: '10px' }}>
                {propertyTickets.map((ticket) => renderTicketRow(ticket))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}
