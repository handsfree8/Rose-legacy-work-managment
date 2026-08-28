'use server'

import { revalidatePath } from 'next/cache'
import { supabaseAdmin as supabase } from '@/lib/supabase/admin'

// ── helpers ──────────────────────────────────────────────────────────────────

async function getTenantByToken(token: string) {
  const { data } = await supabase
    .from('tenants')
    .select('id, property_id, name, unit, active, properties(name, address, city, state, tenant_token)')
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

  revalidatePath(`/tenant/${token}`)
}
