'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!
)

export async function updateTicket(formData: FormData) {
  const ticketId = String(formData.get('ticket_id') || '')
  const propertyId = String(formData.get('property_id') || '')
  const title = String(formData.get('title') || '')
  const unitNumber = String(formData.get('unit_number') || '')
  const category = String(formData.get('category') || '')
  const subcategory = String(formData.get('subcategory') || '')
  const priority = String(formData.get('priority') || 'low')
  const status = String(formData.get('status') || 'new')
  const summaryEs = String(formData.get('summary_es') || '')
  const summaryEn = String(formData.get('summary_en') || '')
  const recommendedAction = String(formData.get('recommended_action') || '')
  const emergency = formData.get('emergency') === 'on'
  const workPerformed = String(formData.get('work_performed') || '')
  const tenantName = String(formData.get('tenant_name') || '')
  const tenantPhone = String(formData.get('tenant_phone') || '')
  const tenantEmail = String(formData.get('tenant_email') || '')

  if (!ticketId || !propertyId || !title) {
    throw new Error('Ticket ID, property ID, and title are required.')
  }

  const { error } = await supabase
    .from('tickets')
    .update({
      title,
      unit_number: unitNumber || null,
      category: category || null,
      subcategory: subcategory || null,
      priority,
      status,
      summary_es: summaryEs || null,
      summary_en: summaryEn || null,
      recommended_action: recommendedAction || null,
      emergency,
      work_performed: workPerformed || null,
      tenant_name: tenantName || null,
      tenant_phone: tenantPhone || null,
      tenant_email: tenantEmail || null,
    })
    .eq('id', ticketId)

  if (error) {
    throw new Error(error.message)
  }

  redirect(`/tickets/${ticketId}`)
}

export async function deleteTicket(formData: FormData) {
  const ticketId = String(formData.get('ticket_id') || '')
  const propertyId = String(formData.get('property_id') || '')

  if (!ticketId || !propertyId) {
    throw new Error('Missing ticket ID or property ID.')
  }

  await supabase.from('invoices').update({ ticket_id: null }).eq('ticket_id', ticketId)

  const { error } = await supabase.from('tickets').delete().eq('id', ticketId)

  if (error) {
    throw new Error(error.message)
  }

  redirect(`/access/${propertyId}`)
}