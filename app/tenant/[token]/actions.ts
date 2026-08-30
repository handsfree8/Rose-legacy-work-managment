'use server'

import { revalidatePath } from 'next/cache'
import { supabaseAdmin as supabase } from '@/lib/supabase/admin'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)
const MANAGER_EMAIL = 'cristofer_marquez_lopez@hotmail.com'

// ── helpers ──────────────────────────────────────────────────────────────────

async function getTenantByToken(token: string) {
  const { data } = await supabase
    .from('tenants')
    .select('id, property_id, name, unit, active, properties(name, address, city, state)')
    .eq('tenant_token', token)
    .eq('active', true)
    .maybeSingle()
  return data
}

// ── submit a new maintenance ticket ──────────────────────────────────────────

export async function submitTenantTicket(formData: FormData) {
  const token    = String(formData.get('token') || '').trim()
  const title    = String(formData.get('title') || '').trim()
  const body     = String(formData.get('body') || '').trim()
  const category = String(formData.get('category') || 'Other').trim()
  const urgency  = String(formData.get('urgency') || 'routine').trim()

  if (!token || !title || !body) throw new Error('Missing required fields.')

  const tenant = await getTenantByToken(token)
  if (!tenant) throw new Error('Invalid portal link.')

  const emergency = urgency === 'emergency'
  const priority  = urgency === 'emergency' ? 'high' : urgency === 'urgent' ? 'medium' : 'low'

  const { error } = await supabase.from('tickets').insert({
    property_id:  tenant.property_id,
    tenant_id:    tenant.id,
    title,
    summary_en:   body,
    category,
    priority,
    emergency,
    status:       'new',
    unit_number:  tenant.unit ?? null,
    tenant_name:  tenant.name,
  })

  if (error) throw new Error(error.message)

  revalidatePath(`/tenant/${token}`)
}

// ── send a message ────────────────────────────────────────────────────────────

export async function sendTenantMessage(formData: FormData) {
  const token     = String(formData.get('token') || '').trim()
  const body      = String(formData.get('body') || '').trim()
  const ticket_id = String(formData.get('ticket_id') || '').trim() || null

  if (!token || !body) throw new Error('Missing required fields.')
  if (body.length > 4000) throw new Error('Message too long.')

  const tenant = await getTenantByToken(token)
  if (!tenant) throw new Error('Invalid portal link.')

  const { error } = await supabase.from('tenant_messages').insert({
    tenant_id: tenant.id,
    ticket_id: ticket_id || null,
    sender:    'tenant',
    body,
  })

  if (error) throw new Error(error.message)

  // Notify manager by email (fire-and-forget — don't block the tenant's send)
  resend.emails.send({
    from: 'Rose Legacy Home Solutions <onboarding@resend.dev>',
    to: MANAGER_EMAIL,
    subject: `New message from ${tenant.name}`,
    html: `
<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:480px;margin:0 auto;padding:32px 0;">
  <div style="background:linear-gradient(135deg,#1a0838,#4a2080);border-radius:12px 12px 0 0;padding:20px 24px;">
    <div style="font-size:10px;font-weight:700;letter-spacing:.15em;text-transform:uppercase;color:rgba(255,255,255,.4);margin-bottom:6px;">Rose Legacy Home Solutions</div>
    <div style="font-size:18px;font-weight:800;color:#fff;">New message from ${tenant.name}</div>
  </div>
  <div style="background:#fff;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px;padding:24px;">
    ${tenant.unit ? `<p style="margin:0 0 6px;font-size:12px;color:#6b7280;">Unit: ${tenant.unit}</p>` : ''}
    <div style="background:#f3eeff;border:1px solid #ddd6fe;border-radius:10px;padding:14px 16px;font-size:14px;color:#111827;line-height:1.6;margin-bottom:20px;">${body}</div>
    <a href="https://rose-legacy-work-management.vercel.app/tenants" style="display:inline-block;background:linear-gradient(135deg,#6b21a8,#7c3aed);color:#fff;text-decoration:none;border-radius:8px;padding:11px 20px;font-size:13px;font-weight:700;">
      View in Manager Portal →
    </a>
  </div>
</div>`,
  }).catch(() => {}) // silent fail — don't affect tenant UX

  revalidatePath(`/tenant/${token}`)
}
