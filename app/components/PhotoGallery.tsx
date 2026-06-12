'use client'

import { useState } from 'react'

type PhotoGalleryProps = {
  photos: { id: string; url: string }[]
  emptyLabel?: string
}

export default function PhotoGallery({ photos, emptyLabel = 'No photos yet.' }: PhotoGalleryProps) {
  const [active, setActive] = useState<string | null>(null)

  if (photos.length === 0) {
    return <p style={{ color: 'var(--text-muted)', margin: 0 }}>{emptyLabel}</p>
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
          <img
            key={photo.id}
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
            }}
          />
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
