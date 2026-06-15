'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!
)

async function decideEstimate(formData: FormData, status: 'approved' | 'rejected') {
  const estimateId = String(formData.get('estimate_id') || '')
  const token = String(formData.get('token') || '')

  if (!estimateId || !token) {
    throw new Error('Missing estimate ID or token.')
  }

  const { data: estimate } = await supabase
    .from('estimates')
    .select('id, ticket_id, property_id, properties(landlord_token)')
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
    await supabase
      .from('tickets')
      .update({ status: 'in_progress' })
      .eq('id', estimate.ticket_id)
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
