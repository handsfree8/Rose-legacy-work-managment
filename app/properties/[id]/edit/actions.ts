'use server'

import { createClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!
)

export async function updateProperty(formData: FormData) {
  const id = formData.get('id')?.toString() || ''
  const name = formData.get('name')?.toString().trim() || ''
  const address = formData.get('address')?.toString().trim() || ''
  const city = formData.get('city')?.toString().trim() || ''
  const state = formData.get('state')?.toString().trim() || ''
  const photo_url = formData.get('photo_url')?.toString().trim() || ''

  const { error } = await supabase
    .from('properties')
    .update({
      name,
      address,
      city,
      state,
      photo_url,
    })
    .eq('id', id)

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath('/')
  revalidatePath(`/properties/${id}/edit`)
  redirect('/')
}

export async function deleteProperty(formData: FormData) {
  const id = formData.get('id')?.toString() || ''

  // Detach invoices (kept for accounting), then remove dependents that
  // block the property's foreign keys: tickets and calls.
  await supabase.from('invoices').update({ property_id: null }).eq('property_id', id)
  const { data: tickets } = await supabase.from('tickets').select('id').eq('property_id', id)
  const ticketIds = (tickets || []).map((t) => t.id)
  if (ticketIds.length) {
    await supabase.from('invoices').update({ ticket_id: null }).in('ticket_id', ticketIds)
  }
  await supabase.from('tickets').delete().eq('property_id', id)
  await supabase.from('calls').delete().eq('property_id', id)

  const { error } = await supabase
    .from('properties')
    .delete()
    .eq('id', id)

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath('/')
  redirect('/')
}