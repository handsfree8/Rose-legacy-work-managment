'use server'

import { redirect } from 'next/navigation'
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