import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import { updateTicket } from './actions'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!
)

type EditTicketPageProps = {
  params: Promise<{ id: string }>
}

export default async function EditTicketPage({ params }: EditTicketPageProps) {
  const { id } = await params

  const { data: ticket, error } = await supabase
    .from('tickets')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !ticket) {
    return (
      <main style={{ padding: '20px' }}>
        <Link href="/" style={{ display: 'inline-block', marginBottom: '20px' }}>
          ← Back
        </Link>
        <h1>Ticket not found</h1>
      </main>
    )
  }

  return (
    <main
      style={{
        padding: '20px',
        
        background: 'var(--bg)',
        minHeight: '100vh',
      }}
    >
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        <Link
          href={`/tickets/${ticket.id}`}
          style={{
            display: 'inline-block',
            marginBottom: '20px',
            textDecoration: 'none',
            color: 'var(--purple)',
            fontWeight: 600,
          }}
        >
          ← Back to ticket
        </Link>

        <div
          style={{
            background: '#fff',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius)',
            padding: '24px',
            boxShadow: 'var(--shadow)',
          }}
        >
          <h1 style={{ marginTop: 0 }}>Edit Ticket</h1>

          <form action={updateTicket} style={{ display: 'grid', gap: '16px' }}>
            <input type="hidden" name="ticket_id" value={ticket.id} />
            <input type="hidden" name="property_id" value={ticket.property_id} />

            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: 600 }}>
                Title
              </label>
              <input
                name="title"
                required
                defaultValue={ticket.title || ''}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '10px',
                  border: '1px solid var(--border)',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: 600 }}>
                Unit Number
              </label>
              <input
                name="unit_number"
                defaultValue={ticket.unit_number || ''}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '10px',
                  border: '1px solid var(--border)',
                }}
              />
            </div>

            <div
              style={{
                display: 'grid',
                gap: '16px',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              }}
            >
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: 600 }}>
                  Category
                </label>
                <input
                  name="category"
                  defaultValue={ticket.category || ''}
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '10px',
                    border: '1px solid var(--border)',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: 600 }}>
                  Subcategory
                </label>
                <input
                  name="subcategory"
                  defaultValue={ticket.subcategory || ''}
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '10px',
                    border: '1px solid var(--border)',
                  }}
                />
              </div>
            </div>

            <div
              style={{
                display: 'grid',
                gap: '16px',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              }}
            >
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: 600 }}>
                  Priority
                </label>
                <select
                  name="priority"
                  defaultValue={ticket.priority || 'low'}
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '10px',
                    border: '1px solid var(--border)',
                  }}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: 600 }}>
                  Status
                </label>
                <select
                  name="status"
                  defaultValue={ticket.status || 'new'}
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '10px',
                    border: '1px solid var(--border)',
                  }}
                >
                  <option value="new">New</option>
                  <option value="reviewed">Reviewed</option>
                  <option value="dispatched">Dispatched</option>
                  <option value="in_progress">In Progress</option>
                  <option value="resolved">Resolved</option>
                  <option value="closed">Closed</option>
                </select>
              </div>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: 600 }}>
                Summary (Spanish)
              </label>
              <textarea
                name="summary_es"
                rows={4}
                defaultValue={ticket.summary_es || ''}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '10px',
                  border: '1px solid var(--border)',
                  resize: 'vertical',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: 600 }}>
                Summary (English)
              </label>
              <textarea
                name="summary_en"
                rows={4}
                defaultValue={ticket.summary_en || ''}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '10px',
                  border: '1px solid var(--border)',
                  resize: 'vertical',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: 600 }}>
                Recommended Action
              </label>
              <textarea
                name="recommended_action"
                rows={3}
                defaultValue={ticket.recommended_action || ''}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '10px',
                  border: '1px solid var(--border)',
                  resize: 'vertical',
                }}
              />
            </div>

            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                fontWeight: 600,
              }}
            >
              <input type="checkbox" name="emergency" defaultChecked={!!ticket.emergency} />
              Emergency
            </label>

            <h2 style={{ marginBottom: 0 }}>Tenant Information</h2>

            <div
              style={{
                display: 'grid',
                gap: '16px',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              }}
            >
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: 600 }}>
                  Tenant Name
                </label>
                <input
                  name="tenant_name"
                  defaultValue={ticket.tenant_name || ''}
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '10px',
                    border: '1px solid var(--border)',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: 600 }}>
                  Tenant Phone
                </label>
                <input
                  name="tenant_phone"
                  defaultValue={ticket.tenant_phone || ''}
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '10px',
                    border: '1px solid var(--border)',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: 600 }}>
                  Tenant Email
                </label>
                <input
                  name="tenant_email"
                  type="email"
                  defaultValue={ticket.tenant_email || ''}
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '10px',
                    border: '1px solid var(--border)',
                  }}
                />
              </div>
            </div>

            <button
              type="submit"
              style={{
                background: 'var(--purple)',
                color: '#fff',
                border: 'none',
                padding: '14px 18px',
                borderRadius: '10px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Save Changes
            </button>
          </form>
        </div>
      </div>
    </main>
  )
}