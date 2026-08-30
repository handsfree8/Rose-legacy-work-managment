'use server'

import { revalidatePath } from 'next/cache'
import { supabaseAdmin as supabase } from '@/lib/supabase/admin'

export type PaymentRow = {
  id: string
  period_year: number
  period_month: number
  amount: number
  method: string
  paid_at: string
  status: string
}

export type TenantSummaryRow = {
  id: string
  name: string
  unit: string | null
  rent_amount: number
  rent_due_day: number
  email: string | null
  property_address: string | null
  payment: PaymentRow | null
}

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

export async function replyToTenant(formData: FormData) {
  const tenant_id = String(formData.get('tenant_id') || '').trim()
  const body = String(formData.get('body') || '').trim()

  if (!tenant_id || !body) throw new Error('Missing fields.')
  if (body.length > 4000) throw new Error('Message too long.')

  // Verify tenant exists and is active
  const { data: tenant } = await supabase
    .from('tenants')
    .select('id')
    .eq('id', tenant_id)
    .eq('active', true)
    .maybeSingle()

  if (!tenant) throw new Error('Tenant not found.')

  const { error } = await supabase.from('tenant_messages').insert({
    tenant_id,
    sender: 'manager',
    body,
  })

  if (error) throw new Error(error.message)

  revalidatePath('/tenants')
}

// Placeholder — link copying is handled client-side
export async function copyTenantLink() {}

export async function recordPayment(
  formData: FormData
): Promise<{ ok: true } | { ok: false; error: string }> {
  const tenantId = formData.get('tenant_id')?.toString() || ''
  const year = parseInt(formData.get('period_year')?.toString() || '0')
  const month = parseInt(formData.get('period_month')?.toString() || '0')
  const amount = parseFloat(formData.get('amount')?.toString() || '0')
  const method = formData.get('method')?.toString() || 'check'
  const paidAt = formData.get('paid_at')?.toString() || new Date().toISOString()
  const notes = formData.get('notes')?.toString().trim() || null

  if (!tenantId) return { ok: false, error: 'Tenant is required.' }
  if (!year || !month) return { ok: false, error: 'Period is required.' }
  if (isNaN(amount) || amount <= 0) return { ok: false, error: 'Enter a valid amount.' }

  // Upsert so re-recording the same month replaces the existing row
  const { error } = await supabase
    .from('rent_payments')
    .upsert(
      {
        tenant_id: tenantId,
        period_year: year,
        period_month: month,
        amount,
        method,
        status: 'paid',
        paid_at: paidAt,
        ...(notes ? { stripe_payment_intent_id: null } : {}),
      },
      { onConflict: 'tenant_id,period_year,period_month' }
    )

  if (error) return { ok: false, error: error.message }
  revalidatePath('/tenants')
  return { ok: true }
}

export async function getPaymentHistory(tenantId: string): Promise<PaymentRow[]> {
  const { data } = await supabase
    .from('rent_payments')
    .select('id,period_year,period_month,amount,method,paid_at,status')
    .eq('tenant_id', tenantId)
    .order('period_year', { ascending: false })
    .order('period_month', { ascending: false })
    .limit(24)
  return (data ?? []) as PaymentRow[]
}

export async function getCurrentMonthSummary(): Promise<TenantSummaryRow[]> {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1

  const { data: tenants } = await supabase
    .from('tenants')
    .select('id,name,unit,rent_amount,rent_due_day,email,properties(address)')
    .eq('active', true)
    .order('name')

  if (!tenants) return []

  const tenantIds = tenants.map((t) => t.id)
  const { data: payments } = await supabase
    .from('rent_payments')
    .select('id,tenant_id,period_year,period_month,amount,method,paid_at,status')
    .in('tenant_id', tenantIds)
    .eq('period_year', year)
    .eq('period_month', month)

  return tenants.map((t) => {
    const p = payments?.find((pay) => pay.tenant_id === t.id) ?? null
    const prop = Array.isArray(t.properties) ? t.properties[0] : t.properties
    return {
      id: t.id,
      name: t.name,
      unit: t.unit,
      rent_amount: Number(t.rent_amount),
      rent_due_day: t.rent_due_day,
      email: t.email,
      property_address: prop?.address ?? null,
      payment: p ? { ...p, amount: Number(p.amount) } : null,
    }
  })
}

export { MONTHS }
