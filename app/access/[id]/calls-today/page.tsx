import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!
)

type PageProps = {
  params: Promise<{ id: string }>
}

export default async function CallsTodayPage({ params }: PageProps) {
  const { id } = await params

  const { data: property } = await supabase
    .from('properties')
    .select('*')
    .eq('id', id)
    .single()

  const { data: calls } = await supabase
    .from('calls')
    .select('*')
    .eq('property_id', id)
    .gte('created_at', new Date(new Date().setHours(0, 0, 0, 0)).toISOString())
    .order('created_at', { ascending: false })

  return (
    <main style={{ padding: '20px', fontFamily: 'Arial, sans-serif', background: '#f7f7f7', minHeight: '100vh' }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
        <Link href={`/access/${id}`} style={{ textDecoration: 'none', color: '#111', fontWeight: 600 }}>
          ← Back to property
        </Link>

        <h1 style={{ marginTop: '20px' }}>Calls Today</h1>
        <p style={{ color: '#666' }}>{property?.name}</p>

        {!calls || calls.length === 0 ? (
          <div style={{ marginTop: '20px', background: '#fff', padding: '20px', borderRadius: '12px', border: '1px solid #ddd' }}>
            No calls today.
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '14px', marginTop: '20px' }}>
            {calls.map((call) => (
              <div
                key={call.id}
                style={{ background: '#fff', border: '1px solid #ddd', borderRadius: '12px', padding: '18px' }}
              >
                <h3 style={{ margin: '0 0 8px 0' }}>Call from {call.caller_phone || 'Unknown caller'}</h3>
                <p style={{ margin: '0 0 8px 0', color: '#666' }}>
                  Language: {call.language_detected || 'Unknown'}
                </p>
                <p style={{ margin: '0 0 8px 0' }}>
                  {call.cleaned_transcript || call.raw_transcript || 'No transcript available.'}
                </p>
                <p style={{ margin: 0, fontSize: '12px', color: '#999' }}>
                  Created: {call.created_at ? new Date(call.created_at).toLocaleString() : 'N/A'}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}