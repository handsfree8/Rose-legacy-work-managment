import { createClient } from '@supabase/supabase-js'
import PhotoGallery from '@/app/components/PhotoGallery'
import { approveEstimate, rejectEstimate } from './actions'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!
)

type LandlordPageProps = {
  params: Promise<{ token: string }>
}

const getStatusBadgeStyle = (status: string | null) => {
  const normalized = (status || '').toLowerCase()
  if (normalized === 'completed' || normalized === 'closed') return { background: '#f6ffed', color: '#389e0d' }
  if (normalized === 'in_progress' || normalized === 'dispatched') return { background: '#e6f4ff', color: '#0958d9' }
  return { background: '#f5f5f5', color: 'var(--text)' }
}

const getEstimateStatusStyle = (status: string) => {
  if (status === 'approved') return { background: '#f6ffed', color: '#389e0d' }
  if (status === 'rejected') return { background: '#fff1f0', color: '#cf1322' }
  return { background: '#fff7e6', color: '#d46b08' }
}

export default async function LandlordPortalPage({ params }: LandlordPageProps) {
  const { token } = await params

  const { data: property } = await supabase
    .from('properties')
    .select('id, name, address, city, state, photo_url')
    .eq('landlord_token', token)
    .maybeSingle()

  if (!property) {
    return (
      <main style={{ padding: '40px 20px', background: 'var(--bg)', minHeight: '100vh' }}>
        <div style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
          <h1>Link not found</h1>
          <p style={{ color: 'var(--text-muted)' }}>
            This portal link is invalid or has expired. Please contact Rose Legacy for a new link.
          </p>
        </div>
      </main>
    )
  }

  const { data: tickets } = await supabase
    .from('tickets')
    .select('*')
    .eq('property_id', property.id)
    .order('created_at', { ascending: false })

  const ticketIds = (tickets || []).map((t) => t.id)

  const { data: photos } = ticketIds.length
    ? await supabase.from('ticket_photos').select('id, url, photo_type, ticket_id').in('ticket_id', ticketIds)
    : { data: [] }

  const { data: estimates } = ticketIds.length
    ? await supabase.from('estimates').select('*').in('ticket_id', ticketIds).order('created_at', { ascending: false })
    : { data: [] }

  const { data: invoices } = ticketIds.length
    ? await supabase.from('invoices').select('id, invoice_number, total, payment_status, ticket_id').in('ticket_id', ticketIds)
    : { data: [] }

  const invoiceAppUrl = process.env.NEXT_PUBLIC_INVOICE_APP_URL
  const photosByTicket = new Map<string, { id: string; url: string; photo_type: string }[]>()
  for (const photo of photos || []) {
    const list = photosByTicket.get(photo.ticket_id) || []
    list.push(photo)
    photosByTicket.set(photo.ticket_id, list)
  }
  const estimatesByTicket = new Map<string, typeof estimates>()
  for (const estimate of estimates || []) {
    const list = estimatesByTicket.get(estimate.ticket_id) || []
    list!.push(estimate)
    estimatesByTicket.set(estimate.ticket_id, list)
  }
  const invoiceByTicket = new Map((invoices || []).map((inv) => [inv.ticket_id, inv]))

  return (
    <main style={{ padding: '20px', background: 'var(--bg)', minHeight: '100vh' }}>
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        <div
          style={{
            background: '#fff',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius)',
            padding: '20px',
            boxShadow: 'var(--shadow)',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
            flexWrap: 'wrap',
          }}
        >
          {property.photo_url && (
            <img
              src={`${property.photo_url}?width=120`}
              alt={property.name}
              style={{ width: '60px', height: '60px', borderRadius: '10px', objectFit: 'cover' }}
            />
          )}
          <div>
            <h1 style={{ margin: '0 0 4px 0' }}>{property.name}</h1>
            <p style={{ margin: 0, color: 'var(--text-muted)' }}>
              {property.address}, {property.city}, {property.state}
            </p>
          </div>
        </div>

        <p style={{ color: 'var(--text-muted)', marginBottom: '16px' }}>
          This is a read-only summary of work orders for your property.
        </p>

        {(!tickets || tickets.length === 0) && (
          <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: '12px', padding: '20px' }}>
            No work orders yet.
          </div>
        )}

        <div style={{ display: 'grid', gap: '16px' }}>
          {(tickets || []).map((ticket) => {
            const ticketPhotos = photosByTicket.get(ticket.id) || []
            const beforePhotos = ticketPhotos.filter((p) => p.photo_type === 'before')
            const afterPhotos = ticketPhotos.filter((p) => p.photo_type === 'after')
            const ticketEstimates = estimatesByTicket.get(ticket.id) || []
            const invoice = invoiceByTicket.get(ticket.id)

            return (
              <div
                key={ticket.id}
                style={{
                  background: '#fff',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius)',
                  padding: '20px',
                  boxShadow: 'var(--shadow)',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    gap: '12px',
                    flexWrap: 'wrap',
                    marginBottom: '12px',
                  }}
                >
                  <div>
                    <h2 style={{ margin: '0 0 4px 0' }}>{ticket.title}</h2>
                    <p style={{ margin: 0, color: 'var(--text-muted)' }}>
                      {ticket.unit_number || 'N/A'} ·{' '}
                      {ticket.created_at ? new Date(ticket.created_at).toLocaleDateString() : ''}
                    </p>
                  </div>
                  <span
                    style={{
                      padding: '8px 12px',
                      borderRadius: '999px',
                      fontSize: '13px',
                      fontWeight: 700,
                      textTransform: 'capitalize',
                      ...getStatusBadgeStyle(ticket.status),
                    }}
                  >
                    {(ticket.status || 'new').replace('_', ' ')}
                  </span>
                </div>

                {ticket.summary_en && (
                  <p style={{ margin: '0 0 12px 0', color: 'var(--text)' }}>{ticket.summary_en}</p>
                )}

                {(beforePhotos.length > 0 || afterPhotos.length > 0) && (
                  <div
                    style={{
                      display: 'grid',
                      gap: '12px',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                      marginBottom: '12px',
                    }}
                  >
                    {beforePhotos.length > 0 && (
                      <div>
                        <h4 style={{ margin: '0 0 6px 0' }}>Before</h4>
                        <PhotoGallery photos={beforePhotos} />
                      </div>
                    )}
                    {afterPhotos.length > 0 && (
                      <div>
                        <h4 style={{ margin: '0 0 6px 0' }}>After</h4>
                        <PhotoGallery photos={afterPhotos} />
                      </div>
                    )}
                  </div>
                )}

                {invoice && invoiceAppUrl && (
                  <a
                    href={`${invoiceAppUrl}?invoice=${invoice.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'inline-block',
                      textDecoration: 'none',
                      background: 'var(--purple-soft)',
                      color: 'var(--purple)',
                      padding: '8px 14px',
                      borderRadius: '10px',
                      fontWeight: 700,
                      fontSize: '13px',
                      marginBottom: '12px',
                    }}
                  >
                    View Invoice {invoice.invoice_number ? `(${invoice.invoice_number})` : ''} — $
                    {Number(invoice.total).toFixed(2)} · {invoice.payment_status}
                  </a>
                )}

                {ticketEstimates.length > 0 && (
                  <div>
                    <h4 style={{ margin: '0 0 8px 0' }}>Estimates</h4>
                    <div style={{ display: 'grid', gap: '10px' }}>
                      {ticketEstimates.map((estimate) => (
                        <div
                          key={estimate!.id}
                          style={{
                            border: '1px solid var(--border)',
                            borderRadius: '10px',
                            padding: '12px',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            gap: '12px',
                            flexWrap: 'wrap',
                          }}
                        >
                          <div>
                            <p style={{ margin: '0 0 4px 0', fontWeight: 600 }}>
                              ${Number(estimate!.amount).toFixed(2)}
                            </p>
                            <p style={{ margin: 0, color: 'var(--text-muted)' }}>{estimate!.description}</p>
                          </div>

                          {estimate!.status === 'pending' ? (
                            <div style={{ display: 'flex', gap: '8px' }}>
                              <form action={approveEstimate}>
                                <input type="hidden" name="estimate_id" value={estimate!.id} />
                                <input type="hidden" name="token" value={token} />
                                <button
                                  type="submit"
                                  style={{
                                    background: '#389e0d',
                                    color: '#fff',
                                    border: 'none',
                                    padding: '8px 14px',
                                    borderRadius: '8px',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                  }}
                                >
                                  Approve
                                </button>
                              </form>
                              <form action={rejectEstimate}>
                                <input type="hidden" name="estimate_id" value={estimate!.id} />
                                <input type="hidden" name="token" value={token} />
                                <button
                                  type="submit"
                                  style={{
                                    background: 'none',
                                    border: '1px solid #b91c1c',
                                    color: '#b91c1c',
                                    padding: '8px 14px',
                                    borderRadius: '8px',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                  }}
                                >
                                  Reject
                                </button>
                              </form>
                            </div>
                          ) : (
                            <span
                              style={{
                                padding: '6px 10px',
                                borderRadius: '999px',
                                fontSize: '12px',
                                fontWeight: 700,
                                textTransform: 'capitalize',
                                ...getEstimateStatusStyle(estimate!.status),
                              }}
                            >
                              {estimate!.status}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </main>
  )
}
