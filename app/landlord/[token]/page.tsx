import LandlordTicketCard from './LandlordTicketCard'
import ConsolidatedPaymentBanner from './ConsolidatedPaymentBanner'

import { supabaseAdmin as supabase } from '@/lib/supabase/admin'

type LandlordPageProps = {
  params: Promise<{ token: string }>
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
    ? await supabase.from('invoices').select('*').in('ticket_id', ticketIds)
    : { data: [] }

  // Find consolidated invoices referenced by any of this property's invoices
  const consolidatedIds = [...new Set(
    (invoices || []).map(inv => inv.consolidated_into).filter(Boolean)
  )]
  const { data: consolidatedInvoices } = consolidatedIds.length
    ? await supabase.from('invoices').select('id, invoice_number, total, payment_status, payment_link, notes, invoice_date').in('id', consolidatedIds)
    : { data: [] }

  const invoiceIds = (invoices || []).map((inv) => inv.id)
  const { data: invoiceItems } = invoiceIds.length
    ? await supabase.from('invoice_items').select('*').in('invoice_id', invoiceIds).order('position', { ascending: true })
    : { data: [] }

  type InvoiceItemRow = { id: string; invoice_id: string; description: string; qty: number; unit_price: number; line_total: number; position: number }
  const itemsByInvoice = new Map<string, InvoiceItemRow[]>()
  for (const item of invoiceItems || []) {
    const list = itemsByInvoice.get(item.invoice_id) || []
    list.push(item)
    itemsByInvoice.set(item.invoice_id, list)
  }

  const photosByTicket = new Map<string, { id: string; url: string; photo_type: string }[]>()
  for (const photo of photos || []) {
    const list = photosByTicket.get(photo.ticket_id) || []
    list.push(photo)
    photosByTicket.set(photo.ticket_id, list)
  }
  type EstimateRow = { id: string; amount: number; description: string; status: string; ticket_id: string; landlord_comment: string | null }
  const estimatesByTicket = new Map<string, EstimateRow[]>()
  for (const estimate of estimates || []) {
    const list = estimatesByTicket.get(estimate.ticket_id) || []
    list.push(estimate)
    estimatesByTicket.set(estimate.ticket_id, list)
  }
  const invoiceByTicket = new Map((invoices || []).map((inv) => [inv.ticket_id, inv]))

  // Split consolidated invoices: unpaid stay prominent at top; paid become a quiet
  // "Payment history" entry at the bottom so they don't look like a current balance.
  const pendingConsolidated = (consolidatedInvoices || []).filter(c => c.payment_status !== 'paid')
  const paidConsolidated = (consolidatedInvoices || []).filter(c => c.payment_status === 'paid')
  const consolidatedById = new Map((consolidatedInvoices || []).map(c => [c.id, c]))

  // Per-ticket "Paid · INV-xxx" tag for work orders covered by a settled consolidated payment.
  const paidTicketTags = new Map<string, string>()
  for (const inv of invoices || []) {
    if (!inv.consolidated_into || !inv.ticket_id) continue
    const parent = consolidatedById.get(inv.consolidated_into)
    if (parent && parent.payment_status === 'paid') {
      paidTicketTags.set(inv.ticket_id, parent.invoice_number || '')
    }
  }

  return (
    <main style={{ padding: '20px', background: 'var(--bg)', minHeight: '100vh' }}>
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        <div
          style={{
            background: '#fff',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius)',
            padding: '28px',
            boxShadow: 'var(--shadow)',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '20px',
            flexWrap: 'wrap',
          }}
        >
          {property.photo_url && (
            <img
              src={`${property.photo_url}?width=400`}
              alt={property.name}
              style={{ width: '120px', height: '120px', borderRadius: '14px', objectFit: 'cover' }}
            />
          )}
          <div>
            <h1 style={{ margin: '0 0 6px 0', fontSize: '28px' }}>{property.name}</h1>
            <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '16px' }}>
              {property.address}, {property.city}, {property.state}
            </p>
          </div>
        </div>

        <p style={{ color: 'var(--text-muted)', marginBottom: '16px' }}>
          This is a read-only summary of work orders for your property. Click a work order to see more details.
        </p>

        <ConsolidatedPaymentBanner
          consolidatedInvoices={pendingConsolidated}
          originalInvoices={(invoices || []).filter(inv => inv.consolidated_into)}
          tickets={(tickets || []).map(t => ({ id: t.id, title: t.title, unit_number: t.unit_number }))}
          propertyName={property.name}
        />

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
            const invoiceItemsForTicket = invoice ? itemsByInvoice.get(invoice.id) || [] : []

            return (
              <LandlordTicketCard
                key={ticket.id}
                ticket={ticket}
                beforePhotos={beforePhotos}
                afterPhotos={afterPhotos}
                estimates={ticketEstimates}
                invoice={invoice}
                invoiceItems={invoiceItemsForTicket}
                property={property}
                token={token}
                paidInvoiceNumber={paidTicketTags.get(ticket.id) ?? null}
              />
            )
          })}
        </div>

        <ConsolidatedPaymentBanner
          consolidatedInvoices={paidConsolidated}
          originalInvoices={(invoices || []).filter(inv => inv.consolidated_into)}
          tickets={(tickets || []).map(t => ({ id: t.id, title: t.title, unit_number: t.unit_number }))}
          propertyName={property.name}
          variant="history"
        />
      </div>
    </main>
  )
}
