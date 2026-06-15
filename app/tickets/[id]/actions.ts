'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!
)

export async function markTicketCompleted(formData: FormData) {
  const ticketId = String(formData.get('ticket_id') || '')
  const propertyId = String(formData.get('property_id') || '')

  if (!ticketId || !propertyId) {
    throw new Error('Missing ticket ID or property ID.')
  }

  const { error } = await supabase
    .from('tickets')
    .update({
      status: 'completed',
    })
    .eq('id', ticketId)

  if (error) {
    throw new Error(error.message)
  }

  redirect(`/access/${propertyId}`)
}

export async function toggleInvoicePaymentStatus(formData: FormData) {
  const invoiceId = String(formData.get('invoice_id') || '')
  const ticketId = String(formData.get('ticket_id') || '')
  const currentStatus = String(formData.get('current_status') || '')

  if (!invoiceId || !ticketId) {
    throw new Error('Missing invoice ID or ticket ID.')
  }

  const newStatus = currentStatus === 'paid' ? 'pending' : 'paid'

  const { error } = await supabase
    .from('invoices')
    .update({ payment_status: newStatus })
    .eq('id', invoiceId)

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath(`/tickets/${ticketId}`)
}

export async function createEstimate(formData: FormData) {
  const ticketId = String(formData.get('ticket_id') || '')
  const propertyId = String(formData.get('property_id') || '')
  const description = String(formData.get('description') || '').trim()
  const amount = Number(formData.get('amount') || 0)

  if (!ticketId || !propertyId || !description) {
    throw new Error('Ticket ID, property ID, and description are required.')
  }

  const { error } = await supabase.from('estimates').insert({
    ticket_id: ticketId,
    property_id: propertyId,
    description,
    amount,
  })

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath(`/tickets/${ticketId}`)
}

export async function deleteEstimate(formData: FormData) {
  const estimateId = String(formData.get('estimate_id') || '')
  const ticketId = String(formData.get('ticket_id') || '')

  if (!estimateId || !ticketId) {
    throw new Error('Missing estimate ID or ticket ID.')
  }

  const { error } = await supabase.from('estimates').delete().eq('id', estimateId)

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath(`/tickets/${ticketId}`)
}