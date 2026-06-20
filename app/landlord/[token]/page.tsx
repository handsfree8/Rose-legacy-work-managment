import { headers } from 'next/headers'
import LandlordTicketCard from './LandlordTicketCard'
import ConsolidatedPaymentBanner from './ConsolidatedPaymentBanner'
import LandlordActions from './LandlordActions'

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
    ? await supabase.from('invoices').select('id, invoice_number, total, payment_status, payment_link, notes, invoice_date, payment_method, terms').in('id', consolidatedIds)
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

  // ── Summary stats for the report header ──
  const DONE = new Set(['completed', 'closed', 'resolved'])
  const allTickets = tickets || []
  const completedCount = allTickets.filter(t => DONE.has((t.status || '').toLowerCase())).length
  const activeCount = allTickets.length - completedCount

  const paidTotal =
    (invoices || []).filter(i => i.payment_status === 'paid').reduce((s, i) => s + Number(i.total || 0), 0) +
    paidConsolidated.reduce((s, c) => s + Number(c.total || 0), 0)
  const fmtUsd = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)

  // Active work orders first, then completed — each group newest-first (already ordered).
  const sortedTickets = [...allTickets].sort((a, b) => {
    const ad = DONE.has((a.status || '').toLowerCase()) ? 1 : 0
    const bd = DONE.has((b.status || '').toLowerCase()) ? 1 : 0
    return ad - bd
  })

  // Build the absolute portal URL (for the "Email report" / "Copy link" actions).
  const h = await headers()
  const host = h.get('x-forwarded-host') || h.get('host') || 'rose-legacy-work-management.vercel.app'
  const proto = h.get('x-forwarded-proto') || 'https'
  const portalUrl = `${proto}://${host}/landlord/${token}`

  const stats = [
    { label: 'Work Orders', value: String(allTickets.length), tone: 'var(--purple)' },
    { label: 'In Progress', value: String(activeCount), tone: '#c9622a' },
    { label: 'Completed', value: String(completedCount), tone: '#1e8e3e' },
    { label: 'Total Paid', value: fmtUsd(paidTotal), tone: 'var(--purple)' },
  ]

  const activeTickets = sortedTickets.filter(t => !DONE.has((t.status || '').toLowerCase()))
  const completedTickets = sortedTickets.filter(t => DONE.has((t.status || '').toLowerCase()))

  const renderTicket = (ticket: (typeof allTickets)[number]) => {
    const ticketPhotos = photosByTicket.get(ticket.id) || []
    return (
      <LandlordTicketCard
        key={ticket.id}
        ticket={ticket}
        beforePhotos={ticketPhotos.filter((p) => p.photo_type === 'before')}
        afterPhotos={ticketPhotos.filter((p) => p.photo_type === 'after')}
        estimates={estimatesByTicket.get(ticket.id) || []}
        invoice={invoiceByTicket.get(ticket.id)}
        invoiceItems={invoiceByTicket.get(ticket.id) ? itemsByInvoice.get(invoiceByTicket.get(ticket.id)!.id) || [] : []}
        property={property}
        token={token}
        paidInvoiceNumber={paidTicketTags.get(ticket.id) ?? null}
      />
    )
  }

  const SectionHeader = ({ label, count }: { label: string; count: number }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: '8px 2px 4px' }}>
      <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</span>
      <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', background: 'var(--purple-soft)', borderRadius: '999px', padding: '2px 9px' }}>{count}</span>
      <span style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
    </div>
  )

  return (
    <main style={{ padding: '24px 20px 64px', background: 'var(--bg)', minHeight: '100vh' }}>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          main { background: #fff !important; padding: 0 !important; }
        }
      `}</style>
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>

        {/* ── Hero header ── */}
        <div
          style={{
            background: 'linear-gradient(135deg, #4a2080 0%, #6b35b8 100%)',
            borderRadius: '20px',
            padding: '28px',
            marginBottom: '16px',
            color: '#fff',
            boxShadow: '0 8px 30px rgba(74,32,128,0.25)',
          }}
        >
          <div style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', opacity: 0.8, marginBottom: '14px' }}>
            Rose Legacy Home Solutions · Property Report
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
            {property.photo_url && (
              <img
                src={`${property.photo_url}?width=400`}
                alt={property.name}
                style={{ width: '110px', height: '110px', borderRadius: '16px', objectFit: 'cover', border: '3px solid rgba(255,255,255,0.25)' }}
              />
            )}
            <div style={{ flex: 1, minWidth: '220px' }}>
              <h1 style={{ margin: '0 0 8px 0', fontSize: '36px', lineHeight: 1.05, color: '#fff', fontWeight: 800, letterSpacing: '-0.01em' }}>
                {property.name}
              </h1>
              <p style={{ margin: 0, color: 'rgba(255,255,255,0.9)', fontSize: '15px' }}>
                {[property.address, property.city, property.state].filter(Boolean).join(', ')}
              </p>
            </div>
          </div>

          <div style={{ marginTop: '20px' }}>
            <LandlordActions portalUrl={portalUrl} propertyName={property.name} />
          </div>
        </div>

        {/* ── Stats strip ── */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
            gap: '12px',
            marginBottom: '22px',
          }}
        >
          {stats.map((s) => (
            <div key={s.label} style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: '14px', padding: '16px 18px', boxShadow: 'var(--shadow)' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{s.label}</div>
              <div style={{ fontSize: '26px', fontWeight: 800, color: s.tone, marginTop: '4px', lineHeight: 1.1 }}>{s.value}</div>
            </div>
          ))}
        </div>

        <p style={{ color: 'var(--text-muted)', marginBottom: '16px', fontSize: '14px' }}>
          A summary of work orders for your property. Click any work order to see photos and details.
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

        {activeTickets.length > 0 && (
          <>
            <SectionHeader label="Active" count={activeTickets.length} />
            <div style={{ display: 'grid', gap: '16px', marginBottom: '8px' }}>
              {activeTickets.map(renderTicket)}
            </div>
          </>
        )}

        {completedTickets.length > 0 && (
          <>
            <SectionHeader label="Completed" count={completedTickets.length} />
            <div style={{ display: 'grid', gap: '16px' }}>
              {completedTickets.map(renderTicket)}
            </div>
          </>
        )}

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
