import { supabaseAdmin as supabase } from '@/lib/supabase/admin'
import {
  statusBreakdown,
  ticketsByMonth,
  topProperties,
  recentTickets,
  type TicketRow,
} from '@/lib/kpis'
import { StatusDonut, TicketBars, TopProperties, RecentTickets } from './charts'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const { data, error } = await supabase
    .from('tickets')
    .select('id, title, status, created_at, unit_number, property_id, properties(name)')
    .order('created_at', { ascending: false })
    .limit(2000)

  const tickets = (data || []) as TicketRow[]

  const slices = statusBreakdown(tickets)
  const months = ticketsByMonth(tickets)
  const props = topProperties(tickets)
  const recent = recentTickets(tickets)

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
            {tickets.length} tickets tracked
          </p>
        </div>

        {error ? (
          <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '16px', padding: '20px', color: 'var(--text-muted)' }}>
            Couldn&apos;t load analytics right now. Please refresh.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '16px' }} className="dashboard-grid">
            <TicketBars months={months} title="Tickets — last 6 months" />
            <StatusDonut slices={slices} />
            <TopProperties rows={props} />
            <RecentTickets rows={recent} />
          </div>
        )}
      </div>
    </main>
  )
}
