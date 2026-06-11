import Link from 'next/link'
import { createProperty } from './actions'
import ImageUpload from '@/app/components/ImageUpload'

export default function NewPropertyPage() {
  return (
    <main
      style={{
        padding: '24px',
        
        background: 'var(--bg)',
        minHeight: '100vh',
      }}
    >
      <div style={{ maxWidth: '700px', margin: '0 auto' }}>
        <Link
          href="/"
          style={{
            display: 'inline-block',
            marginBottom: '20px',
            textDecoration: 'none',
            color: 'var(--purple)',
            fontWeight: 600,
          }}
        >
          ← Back
        </Link>

        <div
          style={{
            background: '#fff',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius)',
            padding: '24px',
            boxShadow: 'var(--shadow)',
          }}
        >
          <h1 style={{ marginTop: 0, marginBottom: '8px' }}>New Property</h1>
          <p style={{ color: 'var(--text-muted)', marginBottom: '24px' }}>
            Add a new property to your portfolio.
          </p>

          <form action={createProperty} style={{ display: 'grid', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: 600 }}>
                Name
              </label>
              <input
                name="name"
                required
                placeholder="Property name"
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '10px',
                  border: '1px solid var(--border)',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: 600 }}>
                Address
              </label>
              <input
                name="address"
                required
                placeholder="123 Main St"
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '10px',
                  border: '1px solid var(--border)',
                }}
              />
            </div>

            <div
              style={{
                display: 'grid',
                gap: '16px',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              }}
            >
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: 600 }}>
                  City
                </label>
                <input
                  name="city"
                  required
                  placeholder="Kansas City"
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '10px',
                    border: '1px solid var(--border)',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: 600 }}>
                  State
                </label>
                <input
                  name="state"
                  required
                  placeholder="MO"
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '10px',
                    border: '1px solid var(--border)',
                  }}
                />
              </div>
            </div>

            <ImageUpload />

            <button
              type="submit"
              style={{
                background: 'var(--purple)',
                color: '#fff',
                border: 'none',
                padding: '14px 18px',
                borderRadius: '10px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Save Property
            </button>
          </form>
        </div>
      </div>
    </main>
  )
}