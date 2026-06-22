// Pure aggregation helpers for the analytics dashboard.
// Kept free of Supabase/React so they can be reasoned about and tested in isolation.

export type TicketRow = {
  id: string
  title: string | null
  status: string | null
  created_at: string | null
  unit_number: string | null
  property_id: string | null
  properties: { name: string | null } | { name: string | null }[] | null
}

export type StatusSlice = { status: string; count: number; pct: number }
export type MonthBar = { key: string; label: string; count: number }
export type PropertyRank = { name: string; count: number }
export type RecentTicket = {
  id: string
  title: string
  property: string
  status: string
  dateLabel: string
}

// Display order + palette for ticket statuses (brand-aligned).
export const TICKET_STATUS_ORDER = ['new', 'in_progress', 'completed', 'resolved', 'closed', 'pending'] as const
export const TICKET_STATUS_COLORS: Record<string, string> = {
  new: '#6b35b8',
  in_progress: '#c9622a',
  completed: '#2f9e44',
  resolved: '#1d9e75',
  closed: '#7a6e8a',
  pending: '#b0851f',
}
export const TICKET_STATUS_LABELS: Record<string, string> = {
  new: 'New',
  in_progress: 'In progress',
  completed: 'Completed',
  resolved: 'Resolved',
  closed: 'Closed',
  pending: 'Pending',
}

function propertyName(t: TicketRow): string {
  const p = t.properties
  const rec = Array.isArray(p) ? p[0] : p
  return (rec?.name || 'Unassigned').trim() || 'Unassigned'
}

function monthKey(dateStr: string | null): string | null {
  if (!dateStr) return null
  const d = new Date(dateStr)
  if (Number.isNaN(d.getTime())) return null
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export function statusBreakdown(tickets: TicketRow[]): StatusSlice[] {
  const counts = new Map<string, number>()
  for (const t of tickets) {
    const s = t.status || 'new'
    counts.set(s, (counts.get(s) || 0) + 1)
  }
  const total = tickets.length || 1
  const present = [...counts.keys()].sort(
    (a, b) => TICKET_STATUS_ORDER.indexOf(a as never) - TICKET_STATUS_ORDER.indexOf(b as never),
  )
  return present.map((status) => {
    const count = counts.get(status) || 0
    return { status, count, pct: Math.round((count / total) * 100) }
  })
}

export function ticketsByMonth(tickets: TicketRow[], months = 6, now = new Date()): MonthBar[] {
  const totals = new Map<string, number>()
  for (const t of tickets) {
    const k = monthKey(t.created_at)
    if (k) totals.set(k, (totals.get(k) || 0) + 1)
  }
  const out: MonthBar[] = []
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    out.push({ key, label: d.toLocaleDateString('en-US', { month: 'short' }), count: totals.get(key) || 0 })
  }
  return out
}

export function topProperties(tickets: TicketRow[], limit = 5): PropertyRank[] {
  const counts = new Map<string, number>()
  for (const t of tickets) {
    const name = propertyName(t)
    counts.set(name, (counts.get(name) || 0) + 1)
  }
  return [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit)
}

export function recentTickets(tickets: TicketRow[], limit = 6): RecentTicket[] {
  return [...tickets]
    .sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''))
    .slice(0, limit)
    .map((t) => ({
      id: t.id,
      title: (t.title || 'Untitled ticket').trim() || 'Untitled ticket',
      property: propertyName(t),
      status: t.status || 'new',
      dateLabel: t.created_at
        ? new Date(t.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        : '—',
    }))
}
