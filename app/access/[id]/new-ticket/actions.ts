'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!
)

export async function createTicket(formData: FormData) {
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

  if (!propertyId || !title) {
    throw new Error('Property ID and title are required.')
  }

  const { error } = await supabase.from('tickets').insert({
    property_id: propertyId,
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
  })

  if (error) {
    throw new Error(error.message)
  }

  redirect(`/access/${propertyId}`)
}