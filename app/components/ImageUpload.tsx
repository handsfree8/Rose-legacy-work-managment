'use client'

import { useState } from 'react'
import { uploadPropertyImage } from './photo-actions'

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

    const fd = new FormData()
    fd.append('file', file)

    const { url, error } = await uploadPropertyImage(fd)

    if (error || !url) {
      console.error('Upload error:', error)
      setErrorMessage(error || 'Upload failed')
      setUploading(false)
      return
    }

    setImageUrl(url)
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