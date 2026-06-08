import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import { markTicketCompleted } from './actions'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!
)

type TicketPageProps = {
  params: Promise<{ id: string }>
}

export default async function TicketDetailPage({ params }: TicketPageProps) {
  const { id } = await params

  const { data: ticket, error } = await supabase
    .from('tickets')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !ticket) {
    return (
      <main style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
        <Link href="/" style={{ display: 'inline-block', marginBottom: '20px' }}>
          ← Back
        </Link>
        <h1>Ticket not found</h1>
      </main>
    )
  }

  const { data: property } = await supabase
    .from('properties')
    .select('id, name')
    .eq('id', ticket.property_id)
    .single()

  const getPriorityBadgeStyle = (priority: string | null) => {
    const normalized = (priority || '').toLowerCase()

    if (normalized === 'critical') return { background: '#ff4d4f', color: '#fff' }
    if (normalized === 'high') return { background: '#fa8c16', color: '#fff' }
    if (normalized === 'medium') return { background: '#1677ff', color: '#fff' }

    return { background: '#595959', color: '#fff' }
  }

  const getStatusBadgeStyle = (status: string | null) => {
    const normalized = (status || '').toLowerCase()

    if (normalized === 'new') return { background: '#f5f5f5', color: '#111' }
    if (normalized === 'in_progress') return { background: '#e6f4ff', color: '#0958d9' }
    if (normalized === 'reviewed') return { background: '#fff7e6', color: '#d46b08' }
    if (normalized === 'dispatched') return { background: '#f6ffed', color: '#389e0d' }
    if (normalized === 'completed') return { background: '#f6ffed', color: '#389e0d' }
    if (normalized === 'closed') return { background: '#f0f5ff', color: '#1d39c4' }

    return { background: '#f5f5f5', color: '#333' }
  }

  const priorityStyle = getPriorityBadgeStyle(ticket.priority)
  const statusStyle = getStatusBadgeStyle(ticket.status)
  const isCompleted = ['completed', 'closed'].includes((ticket.status || '').toLowerCase())

  return (
    <main
      style={{
        padding: '20px',
        fontFamily: 'Arial, sans-serif',
        background: '#f7f7f7',
        minHeight: '100vh',
      }}
    >
      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
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
          <div>
            <Link
              href={property ? `/access/${property.id}` : '/'}
              style={{
                display: 'inline-block',
                marginBottom: '10px',
                textDecoration: 'none',
                color: '#111',
                fontWeight: 600,
              }}
            >
              ← Back to property
            </Link>

            {property && (
              <p style={{ margin: 0, color: '#666' }}>
                Property: <strong>{property.name}</strong>
              </p>
            )}
          </div>

          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            {!isCompleted && (
              <form action={markTicketCompleted}>
                <input type="hidden" name="ticket_id" value={ticket.id} />
                <input type="hidden" name="property_id" value={ticket.property_id} />
                <button
                  type="submit"
                  style={{
                    background: '#389e0d',
                    color: '#fff',
                    border: 'none',
                    padding: '10px 16px',
                    borderRadius: '10px',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Mark Completed
                </button>
              </form>
            )}

            <Link
              href={`/tickets/${ticket.id}/edit`}
              style={{
                textDecoration: 'none',
                background: '#111',
                color: '#fff',
                padding: '10px 16px',
                borderRadius: '10px',
                fontWeight: 700,
              }}
            >
              Edit Ticket
            </Link>
          </div>
        </div>

        <div
          style={{
            background: '#fff',
            border: '1px solid #ddd',
            borderRadius: '16px',
            padding: '24px',
            boxShadow: '0 4px 14px rgba(0,0,0,0.06)',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              gap: '14px',
              flexWrap: 'wrap',
              marginBottom: '20px',
            }}
          >
            <div>
              <h1 style={{ margin: '0 0 8px 0' }}>{ticket.title}</h1>
              <p style={{ margin: 0, color: '#666' }}>
                Address: {ticket.reported_address || 'N/A'}
              </p>
            </div>

            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <span
                style={{
                  padding: '8px 12px',
                  borderRadius: '999px',
                  fontSize: '13px',
                  fontWeight: 700,
                  textTransform: 'capitalize',
                  ...statusStyle,
                }}
              >
                {(ticket.status || 'new').replace('_', ' ')}
              </span>

              <span
                style={{
                  padding: '8px 12px',
                  borderRadius: '999px',
                  fontSize: '13px',
                  fontWeight: 700,
                  textTransform: 'capitalize',
                  ...priorityStyle,
                }}
              >
                {ticket.priority || 'low'}
              </span>
            </div>
          </div>

          <div
            style={{
              display: 'grid',
              gap: '16px',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              marginBottom: '24px',
            }}
          >
            <div
              style={{
                border: '1px solid #e3e3e3',
                borderRadius: '12px',
                padding: '16px',
                background: '#fafafa',
              }}
            >
              <h3 style={{ marginTop: 0 }}>Category</h3>
              <p style={{ margin: 0 }}>
                {ticket.category || 'Unknown'}
                {ticket.subcategory ? ` · ${ticket.subcategory}` : ''}
              </p>
            </div>

            <div
              style={{
                border: '1px solid #e3e3e3',
                borderRadius: '12px',
                padding: '16px',
                background: '#fafafa',
              }}
            >
              <h3 style={{ marginTop: 0 }}>Emergency</h3>
              <p style={{ margin: 0 }}>{ticket.emergency ? 'Yes' : 'No'}</p>
            </div>

            <div
              style={{
                border: '1px solid #e3e3e3',
                borderRadius: '12px',
                padding: '16px',
                background: '#fafafa',
              }}
            >
              <h3 style={{ marginTop: 0 }}>Created</h3>
              <p style={{ margin: 0 }}>
                {ticket.created_at ? new Date(ticket.created_at).toLocaleString() : 'N/A'}
              </p>
            </div>
          </div>

          <div style={{ marginBottom: '24px' }}>
            <h2>Summary</h2>
           

            <div
              style={{
                border: '1px solid #e3e3e3',
                borderRadius: '12px',
                padding: '16px',
                background: '#fff',
              }}
            >
              <p style={{ margin: 0 }}>
                <strong></strong> {ticket.summary_en || 'No English summary available.'}
              </p>
            </div>
          </div>

          <div>
            <h2>Recommended Action</h2>
            <div
              style={{
                border: '1px solid #e3e3e3',
                borderRadius: '12px',
                padding: '16px',
                background: '#fafafa',
              }}
            >
              <p style={{ margin: 0 }}>
                {ticket.recommended_action || 'No recommended action available.'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}