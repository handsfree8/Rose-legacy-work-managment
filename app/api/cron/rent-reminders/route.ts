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
  const year = now.getFullYear()
  const month = now.getMonth() + 1
  const today = now.getDate()

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

  const { data: paid } = await supabaseAdmin
    .from('rent_payments')
    .select('tenant_id')
    .in('tenant_id', tenantIds)
    .eq('period_year', year)
    .eq('period_month', month)

  const paidIds = new Set((paid ?? []).map((p) => p.tenant_id))

  const toRemind = (tenants ?? []).filter(
    (t) => !paidIds.has(t.id) && today >= t.rent_due_day - 3
  )

  let sent = 0
  let skipped = 0

  for (const t of toRemind) {
    try {
      const portalUrl = `${process.env.NEXT_PUBLIC_APP_URL}/tenant/${t.tenant_token}`
      const property = Array.isArray(t.properties) ? t.properties[0] : t.properties

      await sendRentReminder({
        tenantName: t.name,
        tenantEmail: t.email,
        amount: t.rent_amount,
        dueDay: t.rent_due_day,
        month,
        year,
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
