import { headers } from 'next/headers'
import LandlordTicketCard from './LandlordTicketCard'
import ConsolidatedPaymentBanner from './ConsolidatedPaymentBanner'
import SingleInvoicePaymentBanner from './SingleInvoicePaymentBanner'
import LandlordActions from './LandlordActions'
import StandaloneEstimateCard from './StandaloneEstimateCard'

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

  const { data: standaloneEstimates } = await supabase
    .from('estimates')
    .select('*')
    .eq('property_id', property.id)
    .is('ticket_id', null)
    .order('created_at', { ascending: false })

  const [invoicesResult, standaloneInvoicesResult] = await Promise.all([
    ticketIds.length
      ? supabase.from('invoices').select('*').in('ticket_id', ticketIds)
      : Promise.resolve({ data: [] }),
    supabase
      .from('invoices')
      .select('*')
      .eq('property_id', property.id)
      .is('ticket_id', null)
      .order('invoice_date', { ascending: false }),
  ])
  const invoices = invoicesResult.data
  const standaloneInvoices = (standaloneInvoicesResult.data || []) as typeof invoices

  const consolidatedIds = [...new Set(
    (invoices || []).map(inv => inv.consolidated_into).filter(Boolean)
  )]
  const { data: consolidatedInvoices } = consolidatedIds.length
    ? await supabase.from('invoices').select('id, invoice_number, total, payment_status, payment_link, notes, invoice_date, payment_method, terms').in('id', consolidatedIds)
    : { data: [] }

  const invoiceIds = [...(invoices || []), ...(standaloneInvoices || [])].map(inv => inv.id)
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

  const pendingConsolidated = (consolidatedInvoices || []).filter(c => c.payment_status !== 'paid')
  const paidConsolidated = (consolidatedInvoices || []).filter(c => c.payment_status === 'paid')
  const consolidatedById = new Map((consolidatedInvoices || []).map(c => [c.id, c]))

  const ticketTitleById = new Map((tickets || []).map(t => [t.id, t.title as string]))
  const standaloneUnpaid = (invoices || []).filter(
    (i) => !i.consolidated_into && i.ticket_id && (i.payment_status === 'pending' || i.payment_status === 'overdue')
  )
  const standalonePaid = (invoices || []).filter(
    (i) => !i.consolidated_into && i.ticket_id && i.payment_status === 'paid'
  )

  const paidTicketTags = new Map<string, string>()
  for (const inv of invoices || []) {
    if (!inv.consolidated_into || !inv.ticket_id) continue
    const parent = consolidatedById.get(inv.consolidated_into)
    if (parent && parent.payment_status === 'paid') {
      paidTicketTags.set(inv.ticket_id, parent.invoice_number || '')
    }
  }

  const DONE = new Set(['completed', 'closed', 'resolved'])
  const allTickets = tickets || []
  const completedCount = allTickets.filter(t => DONE.has((t.status || '').toLowerCase())).length
  const activeCount = allTickets.length - completedCount

  const sortedTickets = [...allTickets].sort((a, b) => {
    const ad = DONE.has((a.status || '').toLowerCase()) ? 1 : 0
    const bd = DONE.has((b.status || '').toLowerCase()) ? 1 : 0
    return ad - bd
  })

  const h = await headers()
  const host = h.get('x-forwarded-host') || h.get('host') || 'rose-legacy-work-management.vercel.app'
  const proto = h.get('x-forwarded-proto') || 'https'
  const portalUrl = `${proto}://${host}/landlord/${token}`

  // All invoices that need payment (shown in right panel)
  const hasAnyPending = standaloneUnpaid.length > 0 || pendingConsolidated.length > 0 ||
    (standaloneInvoices || []).some(i => i.payment_status === 'pending' || i.payment_status === 'overdue')

  // Compact paid invoice rows for history panel (no amounts shown)
  const paidHistoryItems: { id: string; title: string; invoiceNumber: string | null; date: string | null }[] = [
    ...standalonePaid.map(inv => ({
      id: inv.id,
      title: (inv.ticket_id && ticketTitleById.get(inv.ticket_id)) || 'Work order',
      invoiceNumber: inv.invoice_number,
      date: inv.invoice_date,
    })),
    ...paidConsolidated.map(c => ({
      id: c.id,
      title: `Consolidated · ${c.invoice_number || ''}`,
      invoiceNumber: c.invoice_number,
      date: c.invoice_date,
    })),
    ...(standaloneInvoices || []).filter(i => i.payment_status === 'paid').map(inv => ({
      id: inv.id,
      title: inv.client_name || 'Service Invoice',
      invoiceNumber: inv.invoice_number,
      date: inv.invoice_date,
    })),
  ]

  const fmtDate = (d: string | null) =>
    d ? new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : ''

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

  const activeTickets = sortedTickets.filter(t => !DONE.has((t.status || '').toLowerCase()))
  const completedTickets = sortedTickets.filter(t => DONE.has((t.status || '').toLowerCase()))

  return (
    <main style={{ background: 'var(--bg)', minHeight: '100vh' }}>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .lp-body { display: block !important; }
          .lp-sidebar, .lp-action { display: none !important; }
        }
        /* 3-column layout */
        .lp-body {
          display: grid;
          grid-template-columns: 200px 1fr 300px;
          min-height: calc(100vh - 140px);
          align-items: start;
        }
        /* Tablet */
        @media (max-width: 960px) {
          .lp-body {
            grid-template-columns: 1fr 280px;
            grid-template-rows: auto auto;
          }
          .lp-sidebar {
            grid-column: 1 / -1;
            flex-direction: row !important;
            padding: 12px 16px !important;
          }
          .lp-sidebar-items {
            flex-direction: row !important;
            gap: 0 !important;
            flex: 1;
          }
          .lp-sidebar-item {
            border-bottom: none !important;
            border-right: 1px solid rgba(255,255,255,0.12) !important;
            padding: 8px 20px !important;
            flex: 1;
          }
          .lp-sidebar-item:last-child { border-right: none !important; }
          .lp-sidebar-val { font-size: 22px !important; }
          .lp-sidebar-btns { flex-direction: row !important; border-top: none !important; padding-top: 0 !important; }
        }
        /* Mobile */
        @media (max-width: 640px) {
          .lp-body {
            grid-template-columns: 1fr;
          }
          .lp-sidebar {
            flex-direction: column !important;
            padding: 16px !important;
          }
          .lp-sidebar-items {
            flex-direction: row !important;
            gap: 0 !important;
          }
          .lp-sidebar-item {
            border-right: 1px solid rgba(255,255,255,0.12) !important;
            border-bottom: none !important;
            padding: 8px 12px !important;
            flex: 1;
          }
          .lp-sidebar-item:last-child { border-right: none !important; }
          .lp-sidebar-btns {
            flex-direction: row !important;
            border-top: 1px solid rgba(255,255,255,0.12) !important;
            padding-top: 12px !important;
            margin-top: 12px !important;
            gap: 8px;
          }
          .lp-action {
            border-left: none !important;
            border-top: 1px solid var(--border) !important;
          }
          .lp-header-split {
            grid-template-columns: 1fr !important;
          }
          .lp-header-right {
            display: none !important;
          }
          .lp-header-name { font-size: 20px !important; }
        }
        /* Feed section headers */
        .lp-section-hd {
          display: flex; align-items: center; gap: 10px;
          margin: 4px 0 8px;
          font-size: 11px; font-weight: 800; text-transform: uppercase;
          letter-spacing: 0.07em; color: var(--text-muted);
        }
        .lp-section-hd::after {
          content: ''; flex: 1; height: 1px; background: var(--border);
        }
        /* Pay card */
        .lp-pay-card {
          background: linear-gradient(135deg, #4a2080, #6b35b8);
          border-radius: 14px; padding: 18px; color: #fff; margin-bottom: 12px;
        }
        /* History row */
        .lp-hist-row {
          display: flex; align-items: center; gap: 10px;
          padding: 9px 0; border-bottom: 1px solid var(--border);
        }
        .lp-hist-row:last-child { border-bottom: none; }
        /* All-clear */
        .lp-all-clear {
          display: flex; align-items: center; gap: 8px;
          background: #ebf7ef; border: 1px solid rgba(30,142,62,.18);
          border-radius: 10px; padding: 10px 14px;
          font-size: 13px; color: #1e8e3e; font-weight: 600;
          margin-bottom: 12px;
        }
        /* Warranty badge */
        .lp-warranty {
          display: inline-flex; align-items: center; gap: 5px;
          font-size: 10px; font-weight: 700; color: #1e8e3e;
          background: #ebf7ef; border-radius: 6px; padding: 3px 8px;
        }
      `}</style>

      {/* ── Split header ── */}
      <div
        className="lp-header-split"
        style={{
          background: 'linear-gradient(145deg, #3b1870 0%, #5828a8 55%, #7040c8 100%)',
          color: '#fff',
          display: 'grid',
          gridTemplateColumns: '1fr auto',
        }}
      >
        {/* Left: property info */}
        <div style={{ padding: '22px 28px' }}>
          <div style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.11em', textTransform: 'uppercase', opacity: 0.62, marginBottom: '6px' }}>
            Rose Legacy Home Solutions · Property Report
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
            {property.photo_url && (
              <img
                src={`${property.photo_url}?width=300`}
                alt={property.name}
                style={{ width: '64px', height: '64px', borderRadius: '12px', objectFit: 'cover', border: '2px solid rgba(255,255,255,0.25)', flexShrink: 0 }}
              />
            )}
            <div>
              <h1 className="lp-header-name" style={{ margin: '0 0 4px', fontSize: '24px', fontWeight: 800, color: '#fff', lineHeight: 1.1 }}>
                {property.name}
              </h1>
              <p style={{ margin: 0, color: 'rgba(255,255,255,0.75)', fontSize: '13px' }}>
                {[property.address, property.city, property.state].filter(Boolean).join(', ')}
              </p>
            </div>
          </div>
        </div>

        {/* Right: quick stats in header */}
        <div
          className="lp-header-right"
          style={{
            background: 'rgba(0,0,0,0.15)',
            borderLeft: '1px solid rgba(255,255,255,0.12)',
            padding: '22px 24px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', gap: '24px' }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '24px', fontWeight: 800, lineHeight: 1 }}>{allTickets.length}</div>
              <div style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase', opacity: 0.6, marginTop: '3px' }}>Órdenes</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '24px', fontWeight: 800, lineHeight: 1, color: '#ffb87a' }}>{activeCount}</div>
              <div style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase', opacity: 0.6, marginTop: '3px' }}>En curso</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '24px', fontWeight: 800, lineHeight: 1, color: '#7ee8a2' }}>{completedCount}</div>
              <div style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase', opacity: 0.6, marginTop: '3px' }}>Completas</div>
            </div>
          </div>
        </div>
      </div>

      {/* ── 3-column body ── */}
      <div className="lp-body">

        {/* ── LEFT: Purple status sidebar ── */}
        <div
          className="lp-sidebar no-print"
          style={{
            background: 'var(--purple)',
            display: 'flex',
            flexDirection: 'column',
            minHeight: '100%',
            position: 'sticky',
            top: 0,
          }}
        >
          <div className="lp-sidebar-items" style={{ display: 'flex', flexDirection: 'column', gap: 0, flex: 1 }}>
            <div className="lp-sidebar-item" style={{ padding: '18px 20px', borderBottom: '1px solid rgba(255,255,255,0.10)', color: '#fff' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'rgba(255,255,255,0.4)', marginBottom: '8px' }} />
              <div className="lp-sidebar-val" style={{ fontSize: '28px', fontWeight: 800, lineHeight: 1, color: '#fff' }}>{allTickets.length}</div>
              <div style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', opacity: 0.6, marginTop: '4px' }}>Órdenes totales</div>
              <div style={{ fontSize: '11px', opacity: 0.5, marginTop: '2px' }}>Esta propiedad</div>
            </div>
            <div className="lp-sidebar-item" style={{ padding: '18px 20px', borderBottom: '1px solid rgba(255,255,255,0.10)', color: '#fff' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ffb87a', marginBottom: '8px' }} />
              <div className="lp-sidebar-val" style={{ fontSize: '28px', fontWeight: 800, lineHeight: 1, color: '#ffb87a' }}>{activeCount}</div>
              <div style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', opacity: 0.6, marginTop: '4px' }}>En progreso</div>
              {activeCount > 0 && (
                <div style={{ fontSize: '11px', opacity: 0.5, marginTop: '2px' }}>{activeCount === 1 ? '1 activa' : `${activeCount} activas`}</div>
              )}
            </div>
            <div className="lp-sidebar-item" style={{ padding: '18px 20px', color: '#fff' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#7ee8a2', marginBottom: '8px' }} />
              <div className="lp-sidebar-val" style={{ fontSize: '28px', fontWeight: 800, lineHeight: 1, color: '#7ee8a2' }}>{completedCount}</div>
              <div style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', opacity: 0.6, marginTop: '4px' }}>Completadas</div>
              <div style={{ fontSize: '11px', opacity: 0.5, marginTop: '2px' }}>Con factura emitida</div>
            </div>
          </div>

          {/* PDF / Link buttons */}
          <div
            className="lp-sidebar-btns"
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
              padding: '16px',
              borderTop: '1px solid rgba(255,255,255,0.12)',
            }}
          >
            <LandlordActions portalUrl={portalUrl} propertyName={property.name} />
          </div>
        </div>

        {/* ── CENTER: Activity feed ── */}
        <div style={{ padding: '20px', background: 'var(--bg)', display: 'flex', flexDirection: 'column', gap: '8px', minWidth: 0 }}>

          {/* Standalone estimates */}
          {standaloneEstimates && standaloneEstimates.length > 0 && (
            <div style={{ marginBottom: '8px' }}>
              <div className="lp-section-hd">
                Estimates pendientes
                <span style={{ background: 'var(--purple-soft)', color: 'var(--purple)', borderRadius: '999px', padding: '1px 8px', fontSize: '10px', fontWeight: 700 }}>
                  {standaloneEstimates.filter(e => e.status === 'pending').length || standaloneEstimates.length}
                </span>
              </div>
              <div style={{ display: 'grid', gap: '12px' }}>
                {standaloneEstimates.map((est) => (
                  <StandaloneEstimateCard key={est.id} estimate={est} token={token} />
                ))}
              </div>
            </div>
          )}

          {(!tickets || tickets.length === 0) && (
            <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
              No work orders yet.
            </div>
          )}

          {activeTickets.length > 0 && (
            <>
              <div className="lp-section-hd">
                En progreso
                <span style={{ background: '#fdf1ea', color: '#c9622a', borderRadius: '999px', padding: '1px 8px', fontSize: '10px', fontWeight: 700 }}>
                  {activeTickets.length}
                </span>
              </div>
              <div style={{ display: 'grid', gap: '12px', marginBottom: '8px' }}>
                {activeTickets.map(renderTicket)}
              </div>
            </>
          )}

          {completedTickets.length > 0 && (
            <>
              <div className="lp-section-hd">
                Completadas
                <span style={{ background: '#ebf7ef', color: '#1e8e3e', borderRadius: '999px', padding: '1px 8px', fontSize: '10px', fontWeight: 700 }}>
                  {completedTickets.length}
                </span>
              </div>
              <div style={{ display: 'grid', gap: '12px' }}>
                {completedTickets.map((ticket) => {
                  const inv = invoiceByTicket.get(ticket.id)
                  const hasWarranty = inv?.warranty_disclaimer
                  return (
                    <div key={ticket.id} style={{ position: 'relative' }}>
                      {hasWarranty && (
                        <div style={{ position: 'absolute', top: '12px', right: '56px', zIndex: 1 }}>
                          <span className="lp-warranty">
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                            </svg>
                            Garantía 30d
                          </span>
                        </div>
                      )}
                      {renderTicket(ticket)}
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </div>

        {/* ── RIGHT: Payment action panel ── */}
        <div
          className="lp-action"
          style={{
            borderLeft: '1px solid var(--border)',
            background: 'var(--card)',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          {/* Pending payments */}
          {hasAnyPending ? (
            <>
              <div style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '0.09em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '4px' }}>
                Acción requerida
              </div>

              {/* Standalone unpaid invoices direct from standalone (no ticket) */}
              {(standaloneInvoices || []).filter(i => i.payment_status === 'pending' || i.payment_status === 'overdue').map(inv => (
                <SingleInvoicePaymentBanner
                  key={inv.id}
                  invoiceId={inv.id}
                  invoiceNumber={inv.invoice_number}
                  invoiceDate={inv.invoice_date}
                  total={Number(inv.total)}
                  paymentStatus={inv.payment_status}
                  paymentLink={inv.payment_link}
                  workOrderTitle={inv.client_name || 'Service Invoice'}
                  items={(itemsByInvoice.get(inv.id) || []).map(it => ({ id: it.id, description: it.description, line_total: it.line_total }))}
                  token={token}
                />
              ))}

              <ConsolidatedPaymentBanner
                consolidatedInvoices={pendingConsolidated}
                originalInvoices={(invoices || []).filter(inv => inv.consolidated_into)}
                tickets={(tickets || []).map(t => ({ id: t.id, title: t.title, unit_number: t.unit_number }))}
                propertyName={property.name}
                token={token}
              />

              {standaloneUnpaid.map((inv) => (
                <SingleInvoicePaymentBanner
                  key={inv.id}
                  invoiceId={inv.id}
                  invoiceNumber={inv.invoice_number}
                  invoiceDate={inv.invoice_date}
                  total={Number(inv.total)}
                  paymentStatus={inv.payment_status}
                  paymentLink={inv.payment_link}
                  workOrderTitle={(inv.ticket_id && ticketTitleById.get(inv.ticket_id)) || 'Work order'}
                  items={(itemsByInvoice.get(inv.id) || []).map((it) => ({ id: it.id, description: it.description, line_total: it.line_total }))}
                  token={token}
                />
              ))}
            </>
          ) : (
            <div className="lp-all-clear">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              Todo está al corriente
            </div>
          )}

          {/* Invoice history — compact, no amounts */}
          {paidHistoryItems.length > 0 && (
            <>
              <div style={{ height: '1px', background: 'var(--border)', margin: '4px 0' }} />
              <div style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '0.09em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '2px' }}>
                Historial de pagos
              </div>
              <div>
                {paidHistoryItems.map((item) => (
                  <div key={item.id} className="lp-hist-row">
                    <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#1e8e3e', flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '12px', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.title}</div>
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '1px' }}>
                        {item.invoiceNumber ? `Inv ${item.invoiceNumber}` : '—'}
                        {item.date ? ` · ${fmtDate(item.date)}` : ''}
                      </div>
                    </div>
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', fontSize: '10px', fontWeight: 700,
                      padding: '3px 9px', borderRadius: '999px', whiteSpace: 'nowrap',
                      background: '#ebf7ef', color: '#1e8e3e',
                    }}>
                      ✓ Pagado
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Paid consolidated history via existing component */}
          {paidConsolidated.length > 0 && (
            <ConsolidatedPaymentBanner
              consolidatedInvoices={paidConsolidated}
              originalInvoices={(invoices || []).filter(inv => inv.consolidated_into)}
              tickets={(tickets || []).map(t => ({ id: t.id, title: t.title, unit_number: t.unit_number }))}
              propertyName={property.name}
              token={token}
              variant="history"
            />
          )}
        </div>
      </div>
    </main>
  )
}
