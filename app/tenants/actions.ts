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

export async function markMessagesRead(tenantId: string) {
  await supabase
    .from('tenant_messages')
    .update({ read_at: new Date().toISOString() })
    .eq('tenant_id', tenantId)
    .eq('sender', 'tenant')
    .is('read_at', null)
  revalidatePath('/tenants')
}

export type MessageRow = {
  id: string
  sender: 'tenant' | 'manager'
  body: string
  read_at: string | null
  created_at: string
}

export async function fetchTenantMessages(tenantId: string): Promise<MessageRow[]> {
  const { data } = await supabase
    .from('tenant_messages')
    .select('id, sender, body, read_at, created_at')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: true })
  return (data ?? []) as MessageRow[]
}

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
  if (month < 1 || month > 12) return { ok: false, error: 'Invalid month.' }
  if (year < 2020 || year > 2100) return { ok: false, error: 'Invalid year.' }
  if (isNaN(amount) || amount <= 0) return { ok: false, error: 'Enter a valid amount.' }

  const validMethods = ['check', 'cash', 'transfer']
  if (!validMethods.includes(method)) return { ok: false, error: 'Invalid payment method.' }

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

export async function resolveTicket(ticketId: string): Promise<void> {
  await supabase
    .from('tickets')
    .update({ status: 'completed' })
    .eq('id', ticketId)
  revalidatePath('/tenants')
}

export async function sendWelcomeEmail(
  formData: FormData
): Promise<{ ok: true } | { ok: false; error: string }> {
  const tenantId = formData.get('tenant_id')?.toString() || ''
  if (!tenantId) return { ok: false, error: 'Missing tenant.' }

  const { data: tenant } = await supabase
    .from('tenants')
    .select('name, email, unit, rent_amount, rent_due_day, tenant_token, properties(address, city, state)')
    .eq('id', tenantId)
    .eq('active', true)
    .maybeSingle()

  if (!tenant) return { ok: false, error: 'Tenant not found.' }
  if (!tenant.email) return { ok: false, error: 'Tenant has no email on file.' }

  const prop = Array.isArray(tenant.properties) ? tenant.properties[0] : tenant.properties
  const portalUrl = `${process.env.NEXT_PUBLIC_APP_URL}/tenant/${tenant.tenant_token}`
  const formatted = Number(tenant.rent_amount).toLocaleString('en-US', { style: 'currency', currency: 'USD' })

  const { Resend } = await import('resend')
  const resend = new Resend(process.env.RESEND_API_KEY)

  const { error } = await resend.emails.send({
    from: 'Rose Legacy Home Solutions <no-reply@roselegacyhs.com>',
    to: tenant.email,
    subject: `Welcome to your tenant portal, ${tenant.name.split(' ')[0]}!`,
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f8f7fb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:560px;margin:32px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08);">
    <div style="background:#2d0e6e;padding:32px 28px 28px;">
      <div style="font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#a78bfa;margin-bottom:10px;">Rose Legacy Home Solutions</div>
      <div style="font-size:24px;font-weight:800;color:#ffffff;line-height:1.25;">Welcome to your<br>tenant portal &#127968;</div>
    </div>
    <div style="padding:28px;">
      <p style="font-size:15px;color:#111827;margin:0 0 18px;">Hi <strong>${tenant.name.split(' ')[0]}</strong>,</p>
      <p style="font-size:14px;color:#374151;line-height:1.6;margin:0 0 20px;">
        Your tenant portal is now active. Use it to submit maintenance requests, send messages to your property manager, and check your payment status — anytime, from any device.
      </p>
      <div style="background:#f3eeff;border:1px solid #ddd6fe;border-radius:12px;padding:18px 20px;margin-bottom:24px;">
        <div style="font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#6b21a8;margin-bottom:12px;">Your details</div>
        ${prop ? `<div style="font-size:13px;color:#374151;margin-bottom:6px;">📍 ${prop.address}${prop.city ? `, ${prop.city}` : ''}${prop.state ? `, ${prop.state}` : ''}${tenant.unit ? ` · ${tenant.unit}` : ''}</div>` : ''}
        <div style="font-size:13px;color:#374151;margin-bottom:6px;">💰 Monthly rent: <strong>${formatted}</strong></div>
        <div style="font-size:13px;color:#374151;">📅 Due on the <strong>${tenant.rent_due_day}${tenant.rent_due_day === 1 ? 'st' : tenant.rent_due_day === 2 ? 'nd' : tenant.rent_due_day === 3 ? 'rd' : 'th'}</strong> of each month</div>
      </div>
      <p style="font-size:13px;color:#6b7280;margin:0 0 20px;line-height:1.5;">
        Keep this link bookmarked — it's your personal portal link. Do not share it with others.
      </p>
      <a href="${portalUrl}" style="display:inline-block;background:#6b21a8;color:#ffffff;text-decoration:none;border-radius:10px;padding:14px 28px;font-size:15px;font-weight:700;">
        Open My Portal →
      </a>
      <p style="font-size:11px;color:#9ca3af;margin:24px 0 0;line-height:1.5;">
        Rose Legacy Home Solutions · Questions? Reply to this email or use the portal to send a message.
      </p>
    </div>
  </div>
</body>
</html>`,
  })

  if (error) return { ok: false, error: (error as { message?: string }).message ?? 'Failed to send.' }
  return { ok: true }
}
