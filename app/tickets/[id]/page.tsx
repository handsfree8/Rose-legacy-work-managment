import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import { markTicketCompleted, createEstimate, deleteEstimate } from './actions'
import TicketPhotoUpload from '@/app/components/TicketPhotoUpload'
import PhotoGallery from '@/app/components/PhotoGallery'
import SubmitButton from '@/app/components/SubmitButton'

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
      <main style={{ padding: '20px' }}>
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

  const { data: existingInvoice } = await supabase
    .from('invoices')
    .select('id, invoice_number')
    .eq('ticket_id', ticket.id)
    .maybeSingle()

  const { data: photos } = await supabase
    .from('ticket_photos')
    .select('id, url, photo_type')
    .eq('ticket_id', ticket.id)
    .order('created_at', { ascending: true })

  const beforePhotos = (photos || []).filter((p) => p.photo_type === 'before')
  const afterPhotos = (photos || []).filter((p) => p.photo_type === 'after')

  const { data: estimates } = await supabase
    .from('estimates')
    .select('*')
    .eq('ticket_id', ticket.id)
    .order('created_at', { ascending: false })

  const getEstimateStatusStyle = (status: string) => {
    if (status === 'approved') return { background: '#f6ffed', color: '#389e0d' }
    if (status === 'rejected') return { background: '#fff1f0', color: '#cf1322' }
    return { background: '#fff7e6', color: '#d46b08' }
  }

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

  const priorityStyle = getPriorityBadgeStyle(ticket.priority)
  const statusStyle = getStatusBadgeStyle(ticket.status)
  const isCompleted = ['completed', 'closed'].includes((ticket.status || '').toLowerCase())
  const invoiceAppUrl = process.env.NEXT_PUBLIC_INVOICE_APP_URL

  return (
    <main
      style={{
        padding: '20px',
        
        background: 'var(--bg)',
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
                color: 'var(--purple)',
                fontWeight: 600,
              }}
            >
              ← Back to property
            </Link>

            {property && (
              <p style={{ margin: 0, color: 'var(--text-muted)' }}>
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

            {isCompleted && invoiceAppUrl && existingInvoice && (
              <a
                href={`${invoiceAppUrl}?invoice=${existingInvoice.id}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  textDecoration: 'none',
                  background: 'var(--purple-soft)',
                  color: 'var(--purple)',
                  padding: '10px 16px',
                  borderRadius: '10px',
                  fontWeight: 700,
                  border: '1px solid var(--purple)',
                }}
              >
                View Invoice {existingInvoice.invoice_number ? `(${existingInvoice.invoice_number})` : ''}
              </a>
            )}

            {isCompleted && invoiceAppUrl && !existingInvoice && (
              <a
                href={`${invoiceAppUrl}?ticket=${ticket.id}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  textDecoration: 'none',
                  background: 'var(--purple)',
                  color: '#fff',
                  padding: '10px 16px',
                  borderRadius: '10px',
                  fontWeight: 700,
                }}
              >
                Generate Invoice
              </a>
            )}

            <Link
              href={`/tickets/${ticket.id}/edit`}
              style={{
                textDecoration: 'none',
                background: 'var(--purple)',
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
              alignItems: 'flex-start',
              gap: '14px',
              flexWrap: 'wrap',
              marginBottom: '20px',
            }}
          >
            <div>
              <h1 style={{ margin: '0 0 8px 0' }}>{ticket.title}</h1>
              <p style={{ margin: 0, color: 'var(--text-muted)' }}>
                Address: {ticket.unit_number || ticket.reported_address || 'N/A'}
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
                border: '1px solid var(--border)',
                borderRadius: '12px',
                padding: '16px',
                background: 'var(--purple-light)',
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
                border: '1px solid var(--border)',
                borderRadius: '12px',
                padding: '16px',
                background: 'var(--purple-light)',
              }}
            >
              <h3 style={{ marginTop: 0 }}>Emergency</h3>
              <p style={{ margin: 0 }}>{ticket.emergency ? 'Yes' : 'No'}</p>
            </div>

            <div
              style={{
                border: '1px solid var(--border)',
                borderRadius: '12px',
                padding: '16px',
                background: 'var(--purple-light)',
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
                border: '1px solid var(--border)',
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

          <div style={{ marginBottom: '24px' }}>
            <h2>Recommended Action</h2>
            <div
              style={{
                border: '1px solid var(--border)',
                borderRadius: '12px',
                padding: '16px',
                background: 'var(--purple-light)',
              }}
            >
              <p style={{ margin: 0 }}>
                {ticket.recommended_action || 'No recommended action available.'}
              </p>
            </div>
          </div>

          <div style={{ marginBottom: '24px' }}>
            <h2>Tenant Information</h2>
            <div
              style={{
                border: '1px solid var(--border)',
                borderRadius: '12px',
                padding: '16px',
                background: '#fff',
                display: 'grid',
                gap: '6px',
              }}
            >
              <p style={{ margin: 0 }}>
                <strong>Name:</strong> {ticket.tenant_name || 'N/A'}
              </p>
              <p style={{ margin: 0 }}>
                <strong>Phone:</strong> {ticket.tenant_phone || 'N/A'}
              </p>
              <p style={{ margin: 0 }}>
                <strong>Email:</strong> {ticket.tenant_email || 'N/A'}
              </p>
            </div>
          </div>

          <div style={{ marginBottom: '24px' }}>
            <h2>Job Photos</h2>
            <div
              style={{
                display: 'grid',
                gap: '16px',
                gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
              }}
            >
              <div
                style={{
                  border: '1px solid var(--border)',
                  borderRadius: '12px',
                  padding: '16px',
                  background: '#fff',
                }}
              >
                <h3 style={{ marginTop: 0 }}>Before</h3>
                <div style={{ marginBottom: '12px' }}>
                  <PhotoGallery photos={beforePhotos} emptyLabel="No 'before' photos yet." />
                </div>
                <TicketPhotoUpload ticketId={ticket.id} photoType="before" />
              </div>

              <div
                style={{
                  border: '1px solid var(--border)',
                  borderRadius: '12px',
                  padding: '16px',
                  background: '#fff',
                }}
              >
                <h3 style={{ marginTop: 0 }}>After</h3>
                <div style={{ marginBottom: '12px' }}>
                  <PhotoGallery photos={afterPhotos} emptyLabel="No 'after' photos yet." />
                </div>
                <TicketPhotoUpload ticketId={ticket.id} photoType="after" />
              </div>
            </div>
          </div>

          <div>
            <h2>Estimates</h2>
            <div
              style={{
                border: '1px solid var(--border)',
                borderRadius: '12px',
                padding: '16px',
                background: '#fff',
              }}
            >
              {(!estimates || estimates.length === 0) && (
                <p style={{ margin: '0 0 16px 0', color: 'var(--text-muted)' }}>
                  No estimates created for this ticket yet.
                </p>
              )}

              {estimates && estimates.length > 0 && (
                <div style={{ display: 'grid', gap: '10px', marginBottom: '16px' }}>
                  {estimates.map((estimate) => (
                    <div
                      key={estimate.id}
                      style={{
                        border: '1px solid var(--border)',
                        borderRadius: '10px',
                        padding: '12px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        gap: '12px',
                        flexWrap: 'wrap',
                      }}
                    >
                      <div>
                        <p style={{ margin: '0 0 4px 0', fontWeight: 600 }}>
                          ${Number(estimate.amount).toFixed(2)}
                        </p>
                        <p style={{ margin: 0, color: 'var(--text-muted)' }}>{estimate.description}</p>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span
                          style={{
                            padding: '6px 10px',
                            borderRadius: '999px',
                            fontSize: '12px',
                            fontWeight: 700,
                            textTransform: 'capitalize',
                            ...getEstimateStatusStyle(estimate.status),
                          }}
                        >
                          {estimate.status}
                        </span>

                        {estimate.status === 'pending' && (
                          <form action={deleteEstimate}>
                            <input type="hidden" name="estimate_id" value={estimate.id} />
                            <input type="hidden" name="ticket_id" value={ticket.id} />
                            <button
                              type="submit"
                              style={{
                                background: 'none',
                                border: '1px solid #b91c1c',
                                color: '#b91c1c',
                                borderRadius: '8px',
                                padding: '6px 10px',
                                fontWeight: 600,
                                fontSize: '12px',
                                cursor: 'pointer',
                              }}
                            >
                              Remove
                            </button>
                          </form>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <form action={createEstimate} style={{ display: 'grid', gap: '12px' }}>
                <input type="hidden" name="ticket_id" value={ticket.id} />
                <input type="hidden" name="property_id" value={ticket.property_id} />

                <div
                  style={{
                    display: 'grid',
                    gap: '12px',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                  }}
                >
                  <div>
                    <label style={{ display: 'block', marginBottom: '6px', fontWeight: 600 }}>
                      Description
                    </label>
                    <input
                      name="description"
                      placeholder="Example: Replace AC condenser unit"
                      required
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
                      Amount ($)
                    </label>
                    <input
                      name="amount"
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      style={{
                        width: '100%',
                        padding: '12px',
                        borderRadius: '10px',
                        border: '1px solid var(--border)',
                      }}
                    />
                  </div>
                </div>

                <SubmitButton
                  pendingText="Adding..."
                  style={{
                    background: 'var(--purple)',
                    color: '#fff',
                    border: 'none',
                    padding: '12px 18px',
                    borderRadius: '10px',
                    fontWeight: 700,
                    justifySelf: 'start',
                  }}
                >
                  Add Estimate
                </SubmitButton>
              </form>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}