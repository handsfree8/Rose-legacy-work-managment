import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { sendRentReminder } from '@/lib/resend'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization') ?? ''
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : ''

  if (!token || token !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now = new Date()
  const today = now.getDate()

  // Determine which billing month we're reminding for:
  // If today is within 3 days BEFORE the due day of next month, remind for next month.
  // Otherwise remind for current month.
  const currentMonth = now.getMonth() + 1
  const currentYear = now.getFullYear()

  // We'll decide the target period per-tenant based on their due_day.
  // Build both current and next month references upfront.
  const nextMonthDate = new Date(currentYear, now.getMonth() + 1, 1)
  const nextMonth = nextMonthDate.getMonth() + 1
  const nextYear = nextMonthDate.getFullYear()

  const { data: tenants, error: tenantsError } = await supabaseAdmin
    .from('tenants')
    .select('id,name,email,rent_amount,rent_due_day,tenant_token,properties(address)')
    .eq('active', true)
    .not('email', 'is', null)

  if (tenantsError) {
    console.error('[rent-reminders] Error fetching tenants:', tenantsError)
    return NextResponse.json({ error: 'Failed to fetch tenants' }, { status: 500 })
  }

  const tenantIds = (tenants ?? []).map((t) => t.id)

  // Fetch paid records for both current and next month to avoid double-reminders
  const { data: paidRecords } = await supabaseAdmin
    .from('rent_payments')
    .select('tenant_id,period_year,period_month')
    .in('tenant_id', tenantIds)
    .or(
      `and(period_year.eq.${currentYear},period_month.eq.${currentMonth}),` +
      `and(period_year.eq.${nextYear},period_month.eq.${nextMonth})`
    )

  const paidSet = new Set(
    (paidRecords ?? []).map((p) => `${p.tenant_id}-${p.period_year}-${p.period_month}`)
  )

  // For each tenant, determine whether to remind for current or next month.
  // Send if: today is within 3 days before the due date (including due date itself)
  // and the target period is not yet paid.
  type ReminderTarget = { tenant: typeof tenants[0]; year: number; month: number }
  const toRemind: ReminderTarget[] = []

  for (const t of tenants ?? []) {
    const dueDay = t.rent_due_day
    // Days remaining in current month + dueDay = days until next billing cycle's due date
    const daysInCurrentMonth = new Date(currentYear, now.getMonth() + 1, 0).getDate()
    const daysUntilNextDue = (daysInCurrentMonth - today) + dueDay

    if (daysUntilNextDue <= 3 && !paidSet.has(`${t.id}-${nextYear}-${nextMonth}`)) {
      // Due date falls in next month and we're within 3 days of it
      toRemind.push({ tenant: t, year: nextYear, month: nextMonth })
    } else if (today >= dueDay - 3 && today <= dueDay && !paidSet.has(`${t.id}-${currentYear}-${currentMonth}`)) {
      // Due date is within current month and we're within 3 days of it
      toRemind.push({ tenant: t, year: currentYear, month: currentMonth })
    }
  }

  let sent = 0
  let skipped = 0

  for (const { tenant: t, year: remindYear, month: remindMonth } of toRemind) {
    try {
      const portalUrl = `${process.env.NEXT_PUBLIC_APP_URL}/tenant/${t.tenant_token}`

      await sendRentReminder({
        tenantName: t.name,
        tenantEmail: t.email,
        amount: t.rent_amount,
        dueDay: t.rent_due_day,
        month: remindMonth,
        year: remindYear,
        portalUrl,
      })

      sent++
    } catch (err) {
      console.error(`[rent-reminders] Failed to send reminder to tenant ${t.id}:`, err)
      skipped++
    }
  }

  return NextResponse.json({ sent, skipped }, { status: 200 })
}
