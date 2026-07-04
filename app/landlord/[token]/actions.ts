'use server'

import { revalidatePath } from 'next/cache'

import { supabaseAdmin as supabase } from '@/lib/supabase/admin'

async function decideEstimate(formData: FormData, status: 'approved' | 'rejected') {
  const estimateId = String(formData.get('estimate_id') || '')
  const token = String(formData.get('token') || '')

  if (!estimateId || !token) {
    throw new Error('Missing estimate ID or token.')
  }

  const { data: estimate } = await supabase
    .from('estimates')
    .select('id, ticket_id, property_id, description, properties(landlord_token)')
    .eq('id', estimateId)
    .single()

  const property = estimate?.properties as unknown as { landlord_token: string } | null
  if (!estimate || property?.landlord_token !== token) {
    throw new Error('Not authorized.')
  }

  const { error } = await supabase
    .from('estimates')
    .update({ status, decided_at: new Date().toISOString() })
    .eq('id', estimateId)

  if (error) {
    throw new Error(error.message)
  }

  if (status === 'approved') {
    if (estimate.ticket_id) {
      await supabase
        .from('tickets')
        .update({ status: 'in_progress' })
        .eq('id', estimate.ticket_id)
    } else {
      // Standalone estimate — create a ticket from it
      const firstLine = (estimate.description || '').split('\n')[0].substring(0, 120)
      const { data: newTicket } = await supabase
        .from('tickets')
        .insert({
          property_id: estimate.property_id,
          title: firstLine || 'Approved estimate',
          summary_en: estimate.description,
          category: 'Other',
          priority: 'medium',
          status: 'in_progress',
          recommended_action: 'Work approved via estimate.',
        })
        .select('id')
        .single()

      if (newTicket) {
        await supabase
          .from('estimates')
          .update({ ticket_id: newTicket.id })
          .eq('id', estimateId)
      }
    }
  }

  revalidatePath(`/landlord/${token}`)
}

export async function approveEstimate(formData: FormData) {
  await decideEstimate(formData, 'approved')
}

export async function rejectEstimate(formData: FormData) {
  await decideEstimate(formData, 'rejected')
}

export async function askEstimateQuestion(formData: FormData) {
  const estimateId = String(formData.get('estimate_id') || '')
  const token = String(formData.get('token') || '')
  const comment = String(formData.get('comment') || '').trim()

  if (!estimateId || !token) {
    throw new Error('Missing estimate ID or token.')
  }
  if (!comment) {
    throw new Error('Please enter your question.')
  }

  const { data: estimate } = await supabase
    .from('estimates')
    .select('id, property_id, properties(landlord_token)')
    .eq('id', estimateId)
    .single()

  const property = estimate?.properties as unknown as { landlord_token: string } | null
  if (!estimate || property?.landlord_token !== token) {
    throw new Error('Not authorized.')
  }

  const { error } = await supabase
    .from('estimates')
    .update({ landlord_comment: comment })
    .eq('id', estimateId)

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath(`/landlord/${token}`)
}
