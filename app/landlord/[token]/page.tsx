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

  const hasAnyPending = standaloneUnpaid.length > 0 || pendingConsolidated.length > 0 ||
    (standaloneInvoices || []).some(i => i.payment_status === 'pending' || i.payment_status === 'overdue')

  // Compact paid rows for history (title + inv number + date — no amounts)
  const paidHistoryItems: { id: string; title: string; invoiceNumber: string | null; date: string | null }[] = [
    ...standalonePaid.map(inv => ({
      id: inv.id,
      title: (inv.ticket_id && ticketTitleById.get(inv.ticket_id)) || 'Work order',
      invoiceNumber: inv.invoice_number,
      date: inv.invoice_date,
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
    <main style={{ background: 'var(--bg)', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .lp-shell { flex-direction: column !important; }
          .lp-sidebar, .lp-action { display: none !important; }
        }

        /* ── Layout shell ── */
        .lp-shell {
          display: flex;
          flex: 1;
          align-items: stretch;
          min-height: 0;
        }

        /* ── Sidebar ── */
        .lp-sidebar {
          width: 210px;
          flex-shrink: 0;
          background: #4a2080;
          display: flex;
          flex-direction: column;
          position: sticky;
          top: 0;
          height: 100vh;
          overflow-y: auto;
        }

        /* ── Feed (center) ── */
        .lp-feed {
          flex: 1;
          min-width: 0;
          padding: 24px 20px;
          display: flex;
          flex-direction: column;
          gap: 8px;
          overflow-y: auto;
        }

        /* ── Action panel (right) ── */
        .lp-action {
          width: 360px;
          flex-shrink: 0;
          border-left: 1px solid var(--border);
          background: var(--card, #fff);
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 10px;
          position: sticky;
          top: 0;
          height: 100vh;
          overflow-y: auto;
        }

        /* ── Section headers ── */
        .lp-sec {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 11px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: var(--text-muted, #7a756c);
          margin: 4px 0 8px;
        }
        .lp-sec::after {
          content: '';
          flex: 1;
          height: 1px;
          background: var(--border, #e3e0da);
        }
        .lp-badge {
          display: inline-flex;
          align-items: center;
          font-size: 10px;
          font-weight: 700;
          padding: 2px 8px;
          border-radius: 99px;
          white-space: nowrap;
        }

        /* ── History rows ── */
        .lp-hist {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 0;
          border-bottom: 1px solid var(--border, #e3e0da);
        }
        .lp-hist:last-child { border-bottom: none; }

        /* ── All-clear ── */
        .lp-ok {
          display: flex;
          align-items: center;
          gap: 8px;
          background: #ebf7ef;
          border: 1px solid rgba(30,142,62,.18);
          border-radius: 10px;
          padding: 12px 14px;
          font-size: 13px;
          color: #1e8e3e;
          font-weight: 600;
        }

        /* ── Tablet: sidebar becomes top strip, action panel full-width below feed ── */
        @media (max-width: 960px) {
          .lp-shell { flex-direction: column; }
          .lp-sidebar {
            width: 100%;
            height: auto;
            position: static;
            flex-direction: row;
            padding: 12px 16px;
            gap: 0;
            overflow-x: auto;
          }
          .lp-sidebar-items { flex-direction: row !important; }
          .lp-sidebar-item {
            border-bottom: none !important;
            border-right: 1px solid rgba(255,255,255,.12) !important;
            padding: 6px 20px !important;
            flex: 1;
          }
          .lp-sidebar-item:last-child { border-right: none !important; }
          .lp-sidebar-val { font-size: 22px !important; }
          .lp-sidebar-btns {
            flex-direction: row !important;
            border-top: none !important;
            padding-top: 0 !important;
            border-left: 1px solid rgba(255,255,255,.12);
            padding-left: 16px !important;
            padding: 6px 0 6px 16px !important;
            flex-shrink: 0;
          }
          .lp-action {
            width: 100%;
            height: auto;
            position: static;
            border-left: none;
            border-top: 1px solid var(--border, #e3e0da);
          }
          .lp-feed { overflow-y: visible; }
        }

        /* ── Mobile ── */
        @media (max-width: 600px) {
          .lp-header-right { display: none !important; }
          .lp-header-name { font-size: 22px !important; }
          .lp-sidebar-item { padding: 6px 12px !important; }
        }
      `}</style>

      {/* ══ HEADER ══ */}
      <div style={{
        background: 'linear-gradient(145deg, #3a1870 0%, #5828a8 55%, #6e3ec0 100%)',
        color: '#fff',
        display: 'grid',
        gridTemplateColumns: '1fr auto',
      }}>
        {/* Left */}
        <div style={{ padding: '28px 32px' }}>
          <div style={{
            fontSize: '10px', fontWeight: 700, letterSpacing: '0.12em',
            textTransform: 'uppercase', opacity: 0.6, marginBottom: '10px',
          }}>
            Rose Legacy Home Solutions · Property Report
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '18px', flexWrap: 'wrap' }}>
            {property.photo_url && (
              <img
                src={`${property.photo_url}?width=300`}
                alt={property.name}
                style={{
                  width: '72px', height: '72px', borderRadius: '14px',
                  objectFit: 'cover', border: '2.5px solid rgba(255,255,255,.3)',
                  flexShrink: 0,
                }}
              />
            )}
            <div>
              <h1 className="lp-header-name" style={{
                margin: '0 0 6px', fontSize: '32px', fontWeight: 800,
                color: '#fff', lineHeight: 1.1, letterSpacing: '-0.3px',
              }}>
                {property.name}
              </h1>
              <p style={{ margin: 0, color: 'rgba(255,255,255,.75)', fontSize: '14px' }}>
                {[property.address, property.city, property.state].filter(Boolean).join(', ')}
              </p>
            </div>
          </div>
        </div>

        {/* Right: stats in header */}
        <div className="lp-header-right" style={{
          background: 'rgba(0,0,0,.18)',
          borderLeft: '1px solid rgba(255,255,255,.12)',
          padding: '28px 32px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-end',
          gap: '6px',
        }}>
          <div style={{ display: 'flex', gap: '28px' }}>
            {[
              { val: allTickets.length, lbl: 'Work Orders', color: '#fff' },
              { val: activeCount, lbl: 'In Progress', color: '#ffb87a' },
              { val: completedCount, lbl: 'Completed', color: '#7ee8a2' },
            ].map(s => (
              <div key={s.lbl} style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '28px', fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.val}</div>
                <div style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase', opacity: 0.6, marginTop: '4px' }}>{s.lbl}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ══ 3-COLUMN SHELL ══ */}
      <div className="lp-shell">

        {/* ── LEFT SIDEBAR ── */}
        <div className="lp-sidebar no-print">
          <div className="lp-sidebar-items" style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
            {[
              { dot: 'rgba(255,255,255,.35)', val: allTickets.length, color: '#fff', lbl: 'Work Orders', note: 'This property' },
              { dot: '#ffb87a', val: activeCount, color: '#ffb87a', lbl: 'In Progress', note: activeCount === 1 ? '1 active order' : `${activeCount} active` },
              { dot: '#7ee8a2', val: completedCount, color: '#7ee8a2', lbl: 'Completed', note: 'Invoiced' },
            ].map(s => (
              <div
                key={s.lbl}
                className="lp-sidebar-item"
                style={{
                  padding: '20px',
                  borderBottom: '1px solid rgba(255,255,255,.10)',
                  color: '#fff',
                  flexShrink: 0,
                }}
              >
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: s.dot, marginBottom: '10px' }} />
                <div className="lp-sidebar-val" style={{ fontSize: '30px', fontWeight: 800, lineHeight: 1, color: s.color }}>{s.val}</div>
                <div style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', opacity: 0.6, marginTop: '5px' }}>{s.lbl}</div>
                <div style={{ fontSize: '11px', opacity: 0.45, marginTop: '3px' }}>{s.note}</div>
              </div>
            ))}
          </div>
          <div
            className="lp-sidebar-btns"
            style={{ display: 'flex', flexDirection: 'column', gap: '6px', padding: '16px', borderTop: '1px solid rgba(255,255,255,.12)' }}
          >
            <LandlordActions portalUrl={portalUrl} propertyName={property.name} />
          </div>
        </div>

        {/* ── CENTER FEED ── */}
        <div className="lp-feed">

          {standaloneEstimates && standaloneEstimates.length > 0 && (
            <div style={{ marginBottom: '4px' }}>
              <div className="lp-sec">
                Pending Estimates
                <span className="lp-badge" style={{ background: '#efe9f8', color: '#4a2080' }}>
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
            <div style={{
              background: 'var(--card, #fff)', border: '1px solid var(--border)', borderRadius: '12px',
              padding: '32px', textAlign: 'center', color: 'var(--text-muted)',
            }}>
              No work orders yet for this property.
            </div>
          )}

          {activeTickets.length > 0 && (
            <>
              <div className="lp-sec">
                In Progress
                <span className="lp-badge" style={{ background: '#fdf1ea', color: '#c9622a' }}>
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
              <div className="lp-sec">
                Completed
                <span className="lp-badge" style={{ background: '#ebf7ef', color: '#1e8e3e' }}>
                  {completedTickets.length}
                </span>
              </div>
              <div style={{ display: 'grid', gap: '12px' }}>
                {completedTickets.map(renderTicket)}
              </div>
            </>
          )}
        </div>

        {/* ── RIGHT ACTION PANEL ── */}
        <div className="lp-action no-print">

          {/* Pending payments */}
          {hasAnyPending ? (
            <>
              <div className="lp-sec" style={{ marginTop: 0 }}>Action Required</div>

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
            <div className="lp-ok">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              All invoices are up to date
            </div>
          )}

          {/* Divider */}
          {(paidHistoryItems.length > 0 || paidConsolidated.length > 0) && (
            <div style={{ height: '1px', background: 'var(--border, #e3e0da)', margin: '2px 0' }} />
          )}

          {/* Payment history — compact rows, no amounts */}
          {paidHistoryItems.length > 0 && (
            <>
              <div className="lp-sec" style={{ marginTop: 0 }}>Payment History</div>
              <div>
                {paidHistoryItems.map((item) => (
                  <div key={item.id} className="lp-hist">
                    <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#1e8e3e', flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '13px', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {item.title}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                        {item.invoiceNumber ? `Inv ${item.invoiceNumber}` : '—'}
                        {item.date ? ` · ${fmtDate(item.date)}` : ''}
                      </div>
                    </div>
                    <span style={{
                      fontSize: '10px', fontWeight: 700, padding: '3px 9px',
                      borderRadius: '99px', background: '#ebf7ef', color: '#1e8e3e',
                      flexShrink: 0, whiteSpace: 'nowrap',
                    }}>
                      ✓ Paid
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}

          {paidConsolidated.map(c => (
            <div key={c.id} className="lp-hist">
              <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#1e8e3e', flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '13px', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  Consolidated · {c.invoice_number || ''}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                  {c.invoice_number ? `Inv ${c.invoice_number}` : '—'}
                  {c.invoice_date ? ` · ${fmtDate(c.invoice_date)}` : ''}
                </div>
              </div>
              <span style={{ fontSize: '10px', fontWeight: 700, padding: '3px 9px', borderRadius: '99px', background: '#ebf7ef', color: '#1e8e3e', flexShrink: 0, whiteSpace: 'nowrap' }}>
                ✓ Paid
              </span>
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}
