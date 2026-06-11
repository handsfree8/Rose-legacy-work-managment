'use client'

import { useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!
)

type ImageUploadProps = {
  defaultValue?: string
}

export default function ImageUpload({ defaultValue = '' }: ImageUploadProps) {
  const [imageUrl, setImageUrl] = useState(defaultValue)
  const [uploading, setUploading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    setErrorMessage('')

    const fileExt = file.name.split('.').pop()
    const fileName = `${Date.now()}-${Math.random()
      .toString(36)
      .slice(2)}.${fileExt}`

    const { error } = await supabase.storage
      .from('property_images')
      .upload(fileName, file)

    if (error) {
      console.error('Upload error:', error.message)
      setErrorMessage(error.message)
      setUploading(false)
      return
    }

    const { data } = supabase.storage
      .from('property_images')
      .getPublicUrl(fileName)

    setImageUrl(data.publicUrl)
    setUploading(false)
  }

  return (
    <div>
      <label style={{ display: 'block', marginBottom: '6px', fontWeight: 600 }}>
        Property Image
      </label>

      <input type="hidden" name="photo_url" value={imageUrl} />

      <input
        type="file"
        accept="image/*"
        onChange={handleUpload}
        style={{
          width: '100%',
          padding: '12px',
          borderRadius: '10px',
          border: '1px solid var(--border)',
          background: '#fff',
        }}
      />

      {uploading && (
        <p style={{ marginTop: '10px', color: '#555' }}>
          Uploading image...
        </p>
      )}

      {errorMessage && (
        <p style={{ marginTop: '10px', color: 'red' }}>
          Error: {errorMessage}
        </p>
      )}

      {imageUrl && (
        <div style={{ marginTop: '14px' }}>
          <img
            src={imageUrl}
            alt="Property preview"
            style={{
              width: '100%',
              maxHeight: '220px',
              objectFit: 'cover',
              borderRadius: '12px',
              border: '1px solid var(--border)',
              display: 'block',
            }}
          />
        </div>
      )}
    </div>
  )
}