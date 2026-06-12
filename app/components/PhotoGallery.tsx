'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!
)

type PhotoGalleryProps = {
  photos: { id: string; url: string }[]
  emptyLabel?: string
  editable?: boolean
}

export default function PhotoGallery({ photos, emptyLabel = 'No photos yet.', editable = false }: PhotoGalleryProps) {
  const router = useRouter()
  const [active, setActive] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  if (photos.length === 0) {
    return <p style={{ color: 'var(--text-muted)', margin: 0 }}>{emptyLabel}</p>
  }

  const handleDelete = async (photoId: string) => {
    if (!confirm('Delete this photo?')) return
    setDeletingId(photoId)
    const { error } = await supabase.from('ticket_photos').delete().eq('id', photoId)
    if (error) {
      console.error('Delete photo failed:', error)
      alert('Could not delete photo.')
      setDeletingId(null)
      return
    }
    router.refresh()
  }

  return (
    <>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))',
          gap: '8px',
        }}
      >
        {photos.map((photo) => (
          <div key={photo.id} style={{ position: 'relative' }}>
            <img
              src={`${photo.url}?width=240`}
              loading="lazy"
              alt="Job photo"
              onClick={() => setActive(photo.url)}
              style={{
                width: '100%',
                height: '90px',
                objectFit: 'cover',
                borderRadius: '8px',
                border: '1px solid var(--border)',
                cursor: 'pointer',
                opacity: deletingId === photo.id ? 0.4 : 1,
              }}
            />
            {editable && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  handleDelete(photo.id)
                }}
                disabled={deletingId === photo.id}
                title="Delete photo"
                style={{
                  position: 'absolute',
                  top: '4px',
                  right: '4px',
                  width: '22px',
                  height: '22px',
                  borderRadius: '50%',
                  border: 'none',
                  background: 'rgba(0,0,0,0.6)',
                  color: '#fff',
                  fontSize: '12px',
                  lineHeight: '22px',
                  textAlign: 'center',
                  padding: 0,
                  cursor: 'pointer',
                }}
              >
                ✕
              </button>
            )}
          </div>
        ))}
      </div>

      {active && (
        <div
          onClick={() => setActive(null)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            cursor: 'zoom-out',
            padding: '20px',
          }}
        >
          <img
            src={active}
            alt="Job photo full size"
            style={{ maxWidth: '100%', maxHeight: '100%', borderRadius: '8px' }}
          />
        </div>
      )}
    </>
  )
}
