import { supabaseAdmin as supabase } from '@/lib/supabase/admin'
import {
  statusBreakdown,
  ticketsByMonth,
  topProperties,
  recentTickets,
  profitByMonth,
  type TicketRow,
  type InvoiceRow,
} from '@/lib/kpis'
import { StatusDonut, TicketBars, TopProperties, RecentTickets, ProfitSection } from './charts'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const [ticketsResult, invoicesResult] = await Promise.all([
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
  ])

  const tickets = (ticketsResult.data || []) as TicketRow[]
  const invoices = (invoicesResult.data || []) as InvoiceRow[]

  const slices = statusBreakdown(tickets)
  const months = ticketsByMonth(tickets)
  const props = topProperties(tickets)
  const recent = recentTickets(tickets)
  const profitSummary = profitByMonth(invoices)

  const fmtUsd = (n: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)

  return (
    <main style={{ minHeight: '100vh', background: 'var(--bg)', padding: '40px 24px 80px' }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
        <div style={{ marginBottom: '28px' }}>
          <p style={{ margin: 0, color: 'var(--purple-mid)', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', fontSize: '12px' }}>
            Rose Legacy Management
          </p>
          <h1 style={{ margin: '8px 0 6px', fontSize: '40px', lineHeight: 1.05, color: 'var(--text)', fontWeight: 700 }}>
            Dashboard
          </h1>
          <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '16px' }}>
            {tickets.length} tickets · {fmtUsd(profitSummary.totalCollected)} collected all time
          </p>
        </div>

        {ticketsResult.error ? (
          <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '16px', padding: '20px', color: 'var(--text-muted)' }}>
            Couldn&apos;t load analytics right now. Please refresh.
          </div>
        ) : (
          <>
            {/* ── Revenue / Profit section ── */}
            <div style={{ marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Revenue</span>
                <span style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
              </div>
              <ProfitSection summary={profitSummary} />
            </div>

            {/* ── Ticket analytics section ── */}
            <div style={{ marginTop: '32px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Work Orders</span>
                <span style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '16px' }} className="dashboard-grid">
                <TicketBars months={months} title="Tickets — last 6 months" />
                <StatusDonut slices={slices} />
                <TopProperties rows={props} />
                <RecentTickets rows={recent} />
              </div>
            </div>
          </>
        )}
      </div>
    </main>
  )
}
