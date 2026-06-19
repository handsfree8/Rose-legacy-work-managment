'use server'

import { redirect } from 'next/navigation'

import { supabaseAdmin as supabase } from '@/lib/supabase/admin'

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

  // Guard against accidental double-submits (e.g. pressing Enter multiple times).
  const tenSecondsAgo = new Date(Date.now() - 10_000).toISOString()
  const { data: recentDuplicate } = await supabase
    .from('tickets')
    .select('id')
    .eq('property_id', propertyId)
    .eq('title', title)
    .gte('created_at', tenSecondsAgo)
    .limit(1)
    .maybeSingle()

  if (recentDuplicate) {
    redirect(`/access/${propertyId}`)
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