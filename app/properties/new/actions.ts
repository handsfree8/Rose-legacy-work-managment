'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import { supabaseAdmin as supabase } from '@/lib/supabase/admin'

async function generateUniqueCallCode(): Promise<string> {
  for (let i = 0; i < 10; i++) {
    const code = String(Math.floor(1000 + Math.random() * 9000))
    const { data } = await supabase
      .from('properties')
      .select('id')
      .eq('call_code', code)
      .maybeSingle()

    if (!data) return code
  }

  throw new Error('Could not generate a unique call code')
}

export async function createProperty(formData: FormData) {
  const name = formData.get('name')?.toString().trim() || ''
  const address = formData.get('address')?.toString().trim() || ''
  const city = formData.get('city')?.toString().trim() || ''
  const state = formData.get('state')?.toString().trim() || ''
  const photo_url = formData.get('photo_url')?.toString().trim() || ''
  const tenant_phone = formData.get('tenant_phone')?.toString().trim() || null

  const call_code = await generateUniqueCallCode()

  const { error } = await supabase.from('properties').insert({
    name,
    address,
    city,
    state,
    photo_url,
    call_code,
    tenant_phone,
  })

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath('/')
  redirect('/')
}