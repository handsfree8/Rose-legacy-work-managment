import Link from 'next/link'
import { updateProperty, deleteProperty } from './actions'
import ImageUpload from '@/app/components/ImageUpload'
import DeletePropertyButton from './DeletePropertyButton'

import { supabaseAdmin as supabase } from '@/lib/supabase/admin'

type EditPropertyPageProps = {
  params: Promise<{ id: string }>
}

export default async function EditPropertyPage({ params }: EditPropertyPageProps) {
  const { id } = await params

  const { data: property, error } = await supabase
    .from('properties')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !property) {
    return (
      <main
        style={{
          padding: '24px',
          
          minHeight: '100vh',
          background: 'var(--bg)',
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
          <h1>Property not found</h1>
        </div>
      </main>
    )
  }

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
          <h1 style={{ marginTop: 0, marginBottom: '8px' }}>Edit Property</h1>
          <p style={{ color: 'var(--text-muted)', marginBottom: '24px' }}>
            Update property information or delete it.
          </p>

          <form action={updateProperty} style={{ display: 'grid', gap: '16px' }}>
            <input type="hidden" name="id" value={property.id} />

            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: 600 }}>
                Name
              </label>
              <input
                name="name"
                defaultValue={property.name}
                required
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
                defaultValue={property.address}
                required
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
                  defaultValue={property.city}
                  required
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
                  defaultValue={property.state}
                  required
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '10px',
                    border: '1px solid var(--border)',
                  }}
                />
              </div>
            </div>

            <ImageUpload defaultValue={property.photo_url || ''} />

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
              Update Property
            </button>
          </form>

          <form action={deleteProperty} style={{ marginTop: '16px' }}>
            <input type="hidden" name="id" value={property.id} />

            <DeletePropertyButton />
          </form>

          {property.landlord_token && (
            <div
              style={{
                marginTop: '24px',
                padding: '16px',
                borderRadius: '12px',
                border: '1px solid var(--border)',
                background: 'var(--purple-light)',
              }}
            >
              <h3 style={{ marginTop: 0 }}>Landlord Portal Link</h3>
              <p style={{ color: 'var(--text-muted)', marginBottom: '10px' }}>
                Share this read-only link with the landlord or real estate agent to view tickets,
                before/after photos, invoices, and approve estimates.
              </p>
              <code
                style={{
                  display: 'block',
                  padding: '10px',
                  borderRadius: '8px',
                  background: '#fff',
                  border: '1px solid var(--border)',
                  wordBreak: 'break-all',
                  fontSize: '13px',
                }}
              >
                {`${process.env.NEXT_PUBLIC_SITE_URL || ''}/landlord/${property.landlord_token}`}
              </code>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}