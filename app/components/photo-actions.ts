'use server'

import { supabaseAdmin } from '@/lib/supabase/admin'

// Uploads to Supabase Storage and writes rows server-side with the service-role
// key, so these keep working once RLS locks out anonymous browser access.
// These run on admin (logged-in) pages, already gated by the proxy.

const BUCKET = 'property_images'

export async function uploadPropertyImage(
  formData: FormData
): Promise<{ url?: string; error?: string }> {
  const file = formData.get('file')
  if (!(file instanceof File) || file.size === 0) {
    return { error: 'No file provided.' }
  }

  const ext = file.name.split('.').pop() || 'jpg'
  const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

  const { error } = await supabaseAdmin.storage
    .from(BUCKET)
    .upload(fileName, file, { contentType: file.type || 'image/jpeg' })

  if (error) return { error: error.message }

  const { data } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(fileName)
  return { url: data.publicUrl }
}

export async function uploadTicketPhoto(
  formData: FormData
): Promise<{ error?: string }> {
  const file = formData.get('file')
  const ticketId = String(formData.get('ticket_id') || '')
  const photoType = String(formData.get('photo_type') || '')

  if (!(file instanceof File) || file.size === 0) return { error: 'No file provided.' }
  if (!ticketId || !['before', 'after'].includes(photoType)) {
    return { error: 'Missing ticket or photo type.' }
  }

  const fileName = `${ticketId}/${photoType}-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2)}.jpg`

  const { error: uploadError } = await supabaseAdmin.storage
    .from(BUCKET)
    .upload(fileName, file, { contentType: 'image/jpeg' })

  if (uploadError) return { error: uploadError.message }

  const { data } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(fileName)

  const { error: insertError } = await supabaseAdmin.from('ticket_photos').insert({
    ticket_id: ticketId,
    url: data.publicUrl,
    photo_type: photoType,
  })

  if (insertError) return { error: insertError.message }
  return {}
}

export async function deleteTicketPhoto(
  photoId: string
): Promise<{ error?: string }> {
  if (!photoId) return { error: 'Missing photo id.' }
  const { error } = await supabaseAdmin.from('ticket_photos').delete().eq('id', photoId)
  if (error) return { error: error.message }
  return {}
}
