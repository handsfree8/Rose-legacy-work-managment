import Link from 'next/link'

import { supabaseAdmin as supabase } from '@/lib/supabase/admin'

type PropertyPageProps = {
  params: Promise<{ id: string }>
}

export default async function PropertyPage({ params }: PropertyPageProps) {
  const { id } = await params

  const { data: property, error: propertyError } = await supabase
    .from('properties')
    .select('*')
    .eq('id', id)
    .single()

  if (propertyError || !property) {
    return (
      <main style={{ padding: '20px' }}>
        <Link href="/" style={{ display: 'inline-block', marginBottom: '20px' }}>
          ← Back
        </Link>
        <h1>Property not found</h1>
      </main>
    )
  }

  const openStatuses = ['new', 'reviewed', 'dispatched', 'in_progress']

  const { count: openTicketsCount } = await supabase
    .from('tickets')
    .select('*', { count: 'exact', head: true })
    .eq('property_id', id)
    .in('status', openStatuses)

  const { count: callsTodayCount } = await supabase
    .from('calls')
    .select('*', { count: 'exact', head: true })
    .eq('property_id', id)
    .gte('created_at', new Date(new Date().setHours(0, 0, 0, 0)).toISOString())

  const { count: criticalIssuesCount } = await supabase
    .from('tickets')
    .select('*', { count: 'exact', head: true })
    .eq('property_id', id)
    .eq('priority', 'critical')
    .in('status', openStatuses)

  const { count: completedTicketsCount } = await supabase
    .from('tickets')
    .select('*', { count: 'exact', head: true })
    .eq('property_id', id)
    .in('status', ['completed', 'closed'])

  const { data: recentTickets, error: recentTicketsError } = await supabase
    .from('tickets')
    .select('*')
    .eq('property_id', id)
    .in('status', openStatuses)
    .order('created_at', { ascending: false })
    .limit(10)

  const getPriorityBadgeStyle = (priority: string | null) => {
    const normalized = (priority || '').toLowerCase()

    if (normalized === 'critical') return { background: '#ff4d4f', color: '#fff' }
    if (normalized === 'high') return { background: '#fa8c16', color: '#fff' }
    if (normalized === 'medium') return { background: '#1677ff', color: '#fff' }

    return { background: '#595959', color: '#fff' }
  }

  const getStatusBadgeStyle = (status: string | null) => {
    const normalized = (status || '').toLowerCase()

    if (normalized === 'new') return { background: '#f5f5f5', color: 'var(--purple)' }
    if (normalized === 'in_progress') return { background: '#e6f4ff', color: '#0958d9' }
    if (normalized === 'reviewed') return { background: '#fff7e6', color: '#d46b08' }
    if (normalized === 'dispatched') return { background: '#f6ffed', color: '#389e0d' }
    if (normalized === 'completed') return { background: '#f6ffed', color: '#389e0d' }
    if (normalized === 'closed') return { background: '#f0f5ff', color: '#1d39c4' }

    return { background: '#f5f5f5', color: 'var(--text)' }
  }

  return (
    <main
      style={{
        padding: '20px',
        
        background: 'var(--bg)',
        minHeight: '100vh',
      }}
    >
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '12px',
            flexWrap: 'wrap',
            marginBottom: '20px',
          }}
        >
          <Link
            href="/"
            style={{
              textDecoration: 'none',
              color: 'var(--purple)',
              fontWeight: 600,
            }}
          >
            ← Back to properties
          </Link>

          <Link
            href={`/access/${id}/new-ticket`}
            style={{
              textDecoration: 'none',
              background: 'var(--purple)',
              color: '#fff',
              padding: '10px 16px',
              borderRadius: '10px',
              fontWeight: 700,
            }}
          >
            + New Ticket
          </Link>
        </div>

        <div
          style={{
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius)',
            overflow: 'hidden',
            backgroundColor: '#fff',
            boxShadow: '0 4px 14px rgba(0,0,0,0.08)',
            marginBottom: '24px',
          }}
        >
          {property.photo_url && (
            <img
              src={property.photo_url}
              alt={property.name}
              style={{
                width: '100%',
                height: '280px',
                objectFit: 'cover',
                display: 'block',
              }}
            />
          )}

          <div style={{ padding: '24px' }}>
            <h1 style={{ margin: '0 0 8px 0', fontSize: '32px' }}>{property.name}</h1>
            <p style={{ margin: '0 0 6px 0', color: '#444', fontSize: '18px' }}>{property.address}</p>
            <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '16px' }}>
              {property.city}, {property.state} {property.zip_code}
            </p>
          </div>
        </div>

        <div
          style={{
            display: 'grid',
            gap: '16px',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            marginBottom: '28px',
          }}
        >
          <Link href={`/access/${id}/open-tickets`} style={{ textDecoration: 'none', color: 'inherit' }}>
            <div
              style={{
                background: '#fff',
                border: '1px solid var(--border)',
                borderRadius: '14px',
                padding: '20px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                cursor: 'pointer',
              }}
            >
              <h3 style={{ marginTop: 0, marginBottom: '10px', color: '#555' }}>Open Tickets</h3>
              <p style={{ fontSize: '34px', fontWeight: 700, margin: 0 }}>{openTicketsCount ?? 0}</p>
            </div>
          </Link>

          <Link href={`/access/${id}/calls-today`} style={{ textDecoration: 'none', color: 'inherit' }}>
            <div
              style={{
                background: '#fff',
                border: '1px solid var(--border)',
                borderRadius: '14px',
                padding: '20px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                cursor: 'pointer',
              }}
            >
              <h3 style={{ marginTop: 0, marginBottom: '10px', color: '#555' }}>Calls Today</h3>
              <p style={{ fontSize: '34px', fontWeight: 700, margin: 0 }}>{callsTodayCount ?? 0}</p>
            </div>
          </Link>

          <Link href={`/access/${id}/critical-issues`} style={{ textDecoration: 'none', color: 'inherit' }}>
            <div
              style={{
                background: '#fff',
                border: '1px solid var(--border)',
                borderRadius: '14px',
                padding: '20px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                cursor: 'pointer',
              }}
            >
              <h3 style={{ marginTop: 0, marginBottom: '10px', color: '#555' }}>Critical Issues</h3>
              <p style={{ fontSize: '34px', fontWeight: 700, margin: 0 }}>{criticalIssuesCount ?? 0}</p>
            </div>
          </Link>

          <Link href={`/access/${id}/completed-tickets`} style={{ textDecoration: 'none', color: 'inherit' }}>
            <div
              style={{
                background: '#fff',
                border: '1px solid var(--border)',
                borderRadius: '14px',
                padding: '20px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                cursor: 'pointer',
              }}
            >
              <h3 style={{ marginTop: 0, marginBottom: '10px', color: '#555' }}>Completed Tickets</h3>
              <p style={{ fontSize: '34px', fontWeight: 700, margin: 0 }}>{completedTicketsCount ?? 0}</p>
            </div>
          </Link>
        </div>

        <div
          style={{
            background: '#fff',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius)',
            padding: '24px',
            boxShadow: 'var(--shadow)',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '18px',
            }}
          >
            <h2 style={{ margin: 0 }}>Recent Open Tickets</h2>
            <Link
              href={`/access/${id}/work-order-history`}
              style={{ textDecoration: 'none', fontWeight: 700, color: 'var(--purple)' }}
            >
              View Work Order History →
            </Link>
          </div>

          {recentTicketsError && (
            <p style={{ color: 'red' }}>Error loading tickets: {recentTicketsError.message}</p>
          )}

          {!recentTickets || recentTickets.length === 0 ? (
            <div
              style={{
                border: '1px dashed #ccc',
                borderRadius: '12px',
                padding: '24px',
                textAlign: 'center',
                color: 'var(--text-muted)',
                background: 'var(--purple-light)',
              }}
            >
              No open tickets for this property.
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '14px' }}>
              {recentTickets.map((ticket) => {
                const priorityStyle = getPriorityBadgeStyle(ticket.priority)
                const statusStyle = getStatusBadgeStyle(ticket.status)

                return (
                  <Link
                    key={ticket.id}
                    href={`/tickets/${ticket.id}`}
                    style={{ textDecoration: 'none', color: 'inherit' }}
                  >
                    <div
                      style={{
                        border: '1px solid var(--border)',
                        borderRadius: '12px',
                        padding: '18px',
                        background: '#fff',
                        cursor: 'pointer',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'flex-start',
                          gap: '12px',
                          flexWrap: 'wrap',
                        }}
                      >
                        <div>
                          <h3 style={{ margin: '0 0 6px 0' }}>{ticket.title}</h3>
                          <p style={{ margin: '0 0 8px 0', color: 'var(--text-muted)' }}>
                            Address: {ticket.unit_number || ticket.reported_address || 'N/A'}
                          </p>
                        </div>

                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                          <span
                            style={{
                              padding: '6px 10px',
                              borderRadius: '999px',
                              fontSize: '12px',
                              fontWeight: 700,
                              textTransform: 'capitalize',
                              ...statusStyle,
                            }}
                          >
                            {(ticket.status || 'new').replace('_', ' ')}
                          </span>

                          <span
                            style={{
                              padding: '6px 10px',
                              borderRadius: '999px',
                              fontSize: '12px',
                              fontWeight: 700,
                              textTransform: 'capitalize',
                              ...priorityStyle,
                            }}
                          >
                            {ticket.priority || 'low'}
                          </span>
                        </div>
                      </div>

                      <p style={{ margin: '10px 0 6px 0', color: 'var(--text)' }}>
                        {ticket.summary_es || ticket.summary_en || 'No summary available.'}
                      </p>

                      <p style={{ margin: '0 0 8px 0', fontSize: '13px', color: '#777' }}>
                        Category: {ticket.category || 'Unknown'}
                        {ticket.subcategory ? ` · ${ticket.subcategory}` : ''}
                      </p>

                      <p style={{ margin: 0, fontSize: '12px', color: '#999' }}>
                        Created: {ticket.created_at ? new Date(ticket.created_at).toLocaleString() : 'N/A'}
                      </p>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </main>
  )
}