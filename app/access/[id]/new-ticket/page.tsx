import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import { createTicket } from './actions'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!
)

type NewTicketPageProps = {
  params: Promise<{ id: string }>
}

export default async function NewTicketPage({ params }: NewTicketPageProps) {
  const { id } = await params

  const { data: property, error } = await supabase
    .from('properties')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !property) {
    return (
      <main style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
        <Link href="/" style={{ display: 'inline-block', marginBottom: '20px' }}>
          ← Back
        </Link>
        <h1>Property not found</h1>
      </main>
    )
  }

  return (
    <main
      style={{
        padding: '20px',
        fontFamily: 'Arial, sans-serif',
        background: '#f7f7f7',
        minHeight: '100vh',
      }}
    >
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        <Link
          href={`/access/${id}`}
          style={{
            display: 'inline-block',
            marginBottom: '20px',
            textDecoration: 'none',
            color: '#111',
            fontWeight: 600,
          }}
        >
          ← Back to property
        </Link>

        <div
          style={{
            background: '#fff',
            border: '1px solid #ddd',
            borderRadius: '16px',
            padding: '24px',
            boxShadow: '0 4px 14px rgba(0,0,0,0.05)',
          }}
        >
          <h1 style={{ marginTop: 0 }}>New Ticket</h1>
          <p style={{ color: '#666', marginBottom: '24px' }}>
            Property: <strong>{property.name}</strong>
          </p>

          <form action={createTicket} style={{ display: 'grid', gap: '16px' }}>
            <input type="hidden" name="property_id" value={id} />

            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: 600 }}>
                Title
              </label>
              <input
                name="title"
                required
                placeholder="Example: No cooling in bedroom"
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '10px',
                  border: '1px solid #ccc',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: 600 }}>
                Address 
              </label>
              <input
                name="unit_number"
                placeholder="Example: 302"
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '10px',
                  border: '1px solid #ccc',
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
                  placeholder="HVAC, Plumbing, Electrical..."
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '10px',
                    border: '1px solid #ccc',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: 600 }}>
                  Subcategory
                </label>
                <input
                  name="subcategory"
                  placeholder="No cooling, Toilet overflow..."
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '10px',
                    border: '1px solid #ccc',
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
                  defaultValue="low"
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '10px',
                    border: '1px solid #ccc',
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
                  defaultValue="new"
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '10px',
                    border: '1px solid #ccc',
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
                Summary (English)
              </label>
              <textarea
                name="summary_en"
                rows={4}
                placeholder="Describe the issue in English..."
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '10px',
                  border: '1px solid #ccc',
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
                placeholder="Example: Dispatch HVAC technician and inspect condenser."
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '10px',
                  border: '1px solid #ccc',
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
              <input type="checkbox" name="emergency" />
              Emergency
            </label>

            <button
              type="submit"
              style={{
                background: '#111',
                color: '#fff',
                border: 'none',
                padding: '14px 18px',
                borderRadius: '10px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Save Ticket
            </button>
          </form>
        </div>
      </div>
    </main>
  )
}