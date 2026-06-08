'use server'

import { createClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!
)

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