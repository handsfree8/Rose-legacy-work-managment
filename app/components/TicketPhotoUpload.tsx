'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!
)

const MAX_DIMENSION = 1600
const JPEG_QUALITY = 0.75

async function compressImage(file: File): Promise<Blob> {
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = reject
    image.src = URL.createObjectURL(file)
  })

  const scale = Math.min(1, MAX_DIMENSION / Math.max(img.width, img.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(img.width * scale)
  canvas.height = Math.round(img.height * scale)

  const ctx = canvas.getContext('2d')
  if (!ctx) return file
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
  URL.revokeObjectURL(img.src)

  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob || file), 'image/jpeg', JPEG_QUALITY)
  })
}

type TicketPhotoUploadProps = {
  ticketId: string
  photoType: 'before' | 'after'
}

export default function TicketPhotoUpload({ ticketId, photoType }: TicketPhotoUploadProps) {
  const router = useRouter()
  const [uploading, setUploading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return

    setUploading(true)
    setErrorMessage('')

    for (const file of files) {
      try {
        const compressed = await compressImage(file)
        const fileName = `${ticketId}/${photoType}-${Date.now()}-${Math.random()
          .toString(36)
          .slice(2)}.jpg`

        const { error: uploadError } = await supabase.storage
          .from('property_images')
          .upload(fileName, compressed, { contentType: 'image/jpeg' })

        if (uploadError) throw uploadError

        const { data } = supabase.storage.from('property_images').getPublicUrl(fileName)

        const { error: insertError } = await supabase.from('ticket_photos').insert({
          ticket_id: ticketId,
          url: data.publicUrl,
          photo_type: photoType,
        })

        if (insertError) throw insertError
      } catch (err) {
        console.error('Photo upload failed:', err)
        setErrorMessage(err instanceof Error ? err.message : 'Upload failed')
      }
    }

    setUploading(false)
    e.target.value = ''
    router.refresh()
  }

  return (
    <div>
      <input
        type="file"
        accept="image/*"
        multiple
        onChange={handleUpload}
        style={{
          width: '100%',
          padding: '10px',
          borderRadius: '10px',
          border: '1px solid var(--border)',
          background: '#fff',
        }}
      />
      {uploading && <p style={{ marginTop: '8px', color: '#555' }}>Uploading...</p>}
      {errorMessage && <p style={{ marginTop: '8px', color: 'red' }}>Error: {errorMessage}</p>}
    </div>
  )
}
