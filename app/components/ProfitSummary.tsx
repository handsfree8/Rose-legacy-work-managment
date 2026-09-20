import { createClient } from '@supabase/supabase-js'

// Reads the shared Rose Legacy database (same one the invoice app writes to)
// and shows the REAL business profit: collected − materials/helpers (and your
// own labor only if you've switched it to a personal salary) − monthly fixed
// costs. This is read-only; costs are captured in the invoice app.
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!
)

type Invoice = {
  id: string
  total: number | null
  payment_status: string | null
  invoice_date: string | null
}
type Material = { desc?: string; amount?: number }
type Helper = { name?: string; mode?: string; hours?: number; rate?: number; flat?: number }
type JobCost = {
  invoice_id: string | null
  materials: Material[] | null
  my_hours: number | null
  my_rate: number | null
  helpers: Helper[] | null
}
type OverheadItem = { label?: string; amount?: number }
type OverheadRow = { items: OverheadItem[] | null; own_labor_as_cost: boolean | null }

const usd = (n: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(n)

const monthKey = (dateStr: string | null): string | null => {
  if (!dateStr) return null
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return null
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

const helperCost = (h: Helper): number =>
  h.mode === 'flat' ? Number(h.flat || 0) : Number(h.hours || 0) * Number(h.rate || 0)

export default async function ProfitSummary() {
  const [invRes, costRes, ohRes] = await Promise.all([
    supabase.from('invoices').select('id, total, payment_status, invoice_date'),
    supabase.from('job_costs').select('invoice_id, materials, my_hours, my_rate, helpers'),
    supabase
      .from('overhead_settings')
      .select('items, own_labor_as_cost')
      .order('effective_from', { ascending: false })
      .limit(1),
  ])

  const invoices = (invRes.data || []) as Invoice[]
  const costs = (costRes.data || []) as JobCost[]
  const overheadRow = (ohRes.data && ohRes.data[0]) as OverheadRow | undefined
  const overheadMonthly = (overheadRow?.items || []).reduce(
    (s, i) => s + Number(i.amount || 0),
    0
  )
  const ownLaborAsCost = !!overheadRow?.own_labor_as_cost

  const costByInvoice = new Map<string, JobCost>()
  costs.forEach((c) => {
    if (c.invoice_id) costByInvoice.set(c.invoice_id, c)
  })

  const cashOutOf = (c: JobCost): number => {
    const mat = (c.materials || []).reduce((s, m) => s + Number(m.amount || 0), 0)
    const help = (c.helpers || []).reduce((s, h) => s + helperCost(h), 0)
    return mat + help
  }
  const laborOf = (c: JobCost): number => Number(c.my_hours || 0) * Number(c.my_rate || 0)
  const costOf = (c: JobCost | undefined): number | null => {
    if (!c) return null
    return cashOutOf(c) + (ownLaborAsCost ? laborOf(c) : 0)
  }

  const now = new Date()
  const thisMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const year = String(now.getFullYear())

  let monthRevenue = 0
  let monthCost = 0
  let paidTotal = 0
  let paidWithCost = 0
  const yearByMonth = new Map<string, { rev: number; cost: number }>()

  invoices.forEach((inv) => {
    if ((inv.payment_status || 'pending') !== 'paid') return
    const mKey = monthKey(inv.invoice_date)
    if (!mKey) return
    const rev = Number(inv.total || 0)
    const cost = costOf(costByInvoice.get(inv.id))
    paidTotal += 1
    if (cost != null) paidWithCost += 1
    if (mKey === thisMonthKey) {
      monthRevenue += rev
      monthCost += cost || 0
    }
    if (mKey.startsWith(year)) {
      const cur = yearByMonth.get(mKey) || { rev: 0, cost: 0 }
      cur.rev += rev
      cur.cost += cost || 0
      yearByMonth.set(mKey, cur)
    }
  })

  const monthNet = monthRevenue > 0 ? monthRevenue - monthCost - overheadMonthly : 0
  let yearNet = 0
  yearByMonth.forEach((m) => {
    if (m.rev > 0) yearNet += m.rev - m.cost - overheadMonthly
  })

  const good = '#2f9e44'
  const bad = '#c0392b'
  const netColor = monthNet >= 0 ? good : bad
  const headlineLabel = ownLaborAsCost
    ? 'Net profit — this month'
    : 'Stays in the business — this month'
  const detail =
    monthRevenue > 0
      ? `${usd(monthRevenue)} collected − ${usd(monthCost)} ${
          ownLaborAsCost ? 'costs (incl. your salary)' : 'materials + helpers'
        } − ${usd(overheadMonthly)} fixed`
      : 'No paid jobs this month'
  const coverage =
    paidTotal > 0
      ? paidWithCost >= paidTotal
        ? `Cost captured on all ${paidTotal} paid invoices ✓`
        : `Cost captured on ${paidWithCost} of ${paidTotal} paid invoices — capture the rest in the invoice app for an exact net`
      : 'Mark invoices as paid and capture their cost in the invoice app to see net profit.'

  return (
    <div
      style={{
        border: '1px solid var(--border)',
        borderRadius: '24px',
        background: 'linear-gradient(135deg, rgba(47,158,68,0.06), rgba(74,32,128,0.05))',
        boxShadow: '0 10px 30px rgba(15, 23, 42, 0.06)',
        padding: '22px 24px',
        marginBottom: '36px',
      }}
    >
      <p
        style={{
          margin: 0,
          color: 'var(--purple-mid)',
          fontWeight: 700,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          fontSize: '12px',
        }}
      >
        Business Profit
      </p>

      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '20px 40px',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          marginTop: '10px',
        }}
      >
        <div style={{ minWidth: '240px' }}>
          <p
            style={{
              margin: 0,
              fontSize: '12px',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              color: 'var(--text-muted)',
            }}
          >
            {headlineLabel}
          </p>
          <p
            style={{
              margin: '4px 0 2px',
              fontSize: '40px',
              lineHeight: 1,
              fontWeight: 800,
              color: netColor,
            }}
          >
            {usd(monthNet)}
          </p>
          <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)' }}>{detail}</p>
        </div>

        <div style={{ display: 'flex', gap: '28px', flexWrap: 'wrap' }}>
          <div>
            <p
              style={{
                margin: 0,
                fontSize: '11px',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                color: 'var(--text-muted)',
              }}
            >
              Net (year)
            </p>
            <p style={{ margin: '3px 0 0', fontSize: '20px', fontWeight: 700, color: 'var(--text)' }}>
              {usd(yearNet)}
            </p>
          </div>
          <div>
            <p
              style={{
                margin: 0,
                fontSize: '11px',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                color: 'var(--text-muted)',
              }}
            >
              Fixed costs / mo
            </p>
            <p style={{ margin: '3px 0 0', fontSize: '20px', fontWeight: 700, color: 'var(--text)' }}>
              {usd(overheadMonthly)}
            </p>
          </div>
        </div>
      </div>

      <p
        style={{
          margin: '14px 0 0',
          paddingTop: '12px',
          borderTop: '1px dashed var(--purple-soft)',
          fontSize: '12px',
          color: 'var(--text-muted)',
        }}
      >
        {coverage}
      </p>
    </div>
  )
}
