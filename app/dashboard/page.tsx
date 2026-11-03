import { supabaseAdmin as supabase } from '@/lib/supabase/admin'
import {
  statusBreakdown,
  ticketsByMonth,
  topProperties,
  recentTickets,
  profitByMonth,
  type TicketRow,
  type InvoiceRow,
  type JobCostRow,
  type OverheadRow,
} from '@/lib/kpis'
import { TicketBars, TopProperties, RecentTickets, ProfitSection, FulfillmentHealth } from './charts'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const [ticketsResult, invoicesResult, costsResult, overheadResult] = await Promise.all([
    supabase
      .from('tickets')
      .select('id, title, status, created_at, unit_number, property_id, properties(name)')
      .order('created_at', { ascending: false })
      .limit(2000),
    supabase
      .from('invoices')
      .select('id, total, payment_status, invoice_date, created_at, ticket_id, payment_method')
      .order('invoice_date', { ascending: false })
      .limit(2000),
    supabase
      .from('job_costs')
      .select('invoice_id, materials, my_hours, my_rate, helpers')
      .limit(2000),
    supabase
      .from('overhead_settings')
      .select('items, own_labor_as_cost')
      .order('effective_from', { ascending: false })
      .limit(1),
  ])

  const tickets = (ticketsResult.data || []) as TicketRow[]
  const invoices = (invoicesResult.data || []) as InvoiceRow[]
  const costs = (costsResult.data || []) as JobCostRow[]
  const overhead = (overheadResult.data?.[0] || null) as OverheadRow | null

  const slices = statusBreakdown(tickets)
  const months = ticketsByMonth(tickets)
  const props = topProperties(tickets)
  const recent = recentTickets(tickets)
  const profitSummary = profitByMonth(invoices, costs, overhead)

  // Build invoice lookup for RecentTickets amounts (plain object — must be serializable for Client Components)
  const invoiceByTicket: Record<string, { total: number | string | null; payment_status: string | null }> = {}
  for (const inv of invoices) {
    if (inv.ticket_id) invoiceByTicket[inv.ticket_id] = { total: inv.total, payment_status: inv.payment_status }
  }

  const fmtUsd = (n: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)

  const currentYear = new Date().getFullYear()

  return (
    <main style={{ minHeight: '100vh', background: 'var(--bg)', padding: '32px 24px 80px' }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto' }}>

        {/* ── Executive header ── */}
        <div style={{ marginBottom: '28px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '8px' }}>
            <span style={{ color: 'var(--purple-mid)', fontWeight: 700 }}>Rose Legacy Management</span>
            <span>›</span>
            <span>Financial &amp; Work Overview</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h1 style={{ margin: '0 0 6px', fontSize: '32px', lineHeight: 1.05, color: 'var(--text)', fontWeight: 800 }}>
                Revenue &amp; Operational Dashboard
              </h1>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'var(--purple-soft)', color: 'var(--purple)', border: '1px solid var(--purple-border)', borderRadius: '20px', padding: '3px 10px', fontSize: '12px', fontWeight: 700 }}>
                  📅 Fiscal Year {currentYear}
                </span>
                <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                  {tickets.filter(t => t.status === 'completed' || t.status === 'resolved').length} tickets resolved ·{' '}
                  <strong style={{ color: '#2f9e44' }}>{fmtUsd(profitSummary.totalCollected)}</strong> collected all‑time
                  {profitSummary.pendingReceivable > 0 && (
                    <> · <strong style={{ color: '#b0851f' }}>{fmtUsd(profitSummary.pendingReceivable)}</strong> pending receivables</>
                  )}
                </span>
              </div>
            </div>
            {process.env.NEXT_PUBLIC_INVOICE_APP_URL && (
              <a
                href={process.env.NEXT_PUBLIC_INVOICE_APP_URL}
                target="_blank"
                rel="noopener noreferrer"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '10px', padding: '9px 16px', fontSize: '13px', fontWeight: 700, color: 'var(--text)', textDecoration: 'none', boxShadow: 'var(--shadow)', whiteSpace: 'nowrap' }}
              >
                ↗ Invoices
              </a>
            )}
          </div>
        </div>

        {ticketsResult.error ? (
          <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '16px', padding: '20px', color: 'var(--text-muted)' }}>
            Couldn&apos;t load analytics right now. Please refresh.
          </div>
        ) : (
          <>
            {/* ── Revenue / Profit section ── */}
            <ProfitSection summary={profitSummary} />

            {/* ── Work Orders + Fulfillment ── */}
            <div style={{ marginTop: '32px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Work Orders</span>
                <span style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '16px' }} className="dashboard-grid">
                <TicketBars months={months} title="Tickets — last 6 months" />
                <FulfillmentHealth slices={slices} months={months} />
                <TopProperties rows={props} />
                <RecentTickets rows={recent} invoiceByTicket={invoiceByTicket} invoiceAppUrl={process.env.NEXT_PUBLIC_INVOICE_APP_URL} />
              </div>
            </div>
          </>
        )}
      </div>
    </main>
  )
}
