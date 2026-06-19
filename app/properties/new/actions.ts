'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import { supabaseAdmin as supabase } from '@/lib/supabase/admin'

export async function createProperty(formData: FormData) {
  const name = formData.get('name')?.toString().trim() || ''
  const address = formData.get('address')?.toString().trim() || ''
  const city = formData.get('city')?.toString().trim() || ''
  const state = formData.get('state')?.toString().trim() || ''
  const photo_url = formData.get('photo_url')?.toString().trim() || ''

  const { error } = await supabase.from('properties').insert({
    name,
    address,
    city,
    state,
    photo_url,
  })

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath('/')
  redirect('/')
}