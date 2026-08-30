'use client'

import { useRef, useState, useTransition } from 'react'
import { submitTenantTicket, uploadTenantTicketPhoto } from './actions'

const CATEGORIES = ['HVAC / Cooling', 'Plumbing', 'Electrical', 'Appliances', 'Pest Control', 'Other']
const URGENCIES  = [
  { value: 'routine',   label: 'Routine',   sub: 'Within a week',  color: '#16a34a' },
  { value: 'urgent',    label: 'Urgent',    sub: '1–2 days',       color: '#d97706' },
  { value: 'emergency', label: 'Emergency', sub: 'Right now',      color: '#dc2626' },
]

export default function NewTicketForm({ token, onClose }: { token: string; onClose: () => void }) {
  const [category, setCategory] = useState('HVAC / Cooling')
  const [urgency,  setUrgency]  = useState('routine')
  const [error,    setError]    = useState('')
  const [pending,  startTransition] = useTransition()
  const formRef = useRef<HTMLFormElement>(null)

  // Photo upload step
  const [ticketId,    setTicketId]    = useState<string | null>(null)
  const [photos,      setPhotos]      = useState<File[]>([])
  const [uploading,   setUploading]   = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [uploadDone,  setUploadDone]  = useState(false)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    const fd = new FormData(formRef.current!)
    fd.set('token', token)
    fd.set('category', category)
    fd.set('urgency', urgency)
    startTransition(async () => {
      try {
        const { ticketId: id } = await submitTenantTicket(fd)
        setTicketId(id)
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Something went wrong.')
      }
    })
  }

  async function handlePhotoUpload() {
    if (!ticketId || photos.length === 0) { onClose(); return }
    setUploading(true)
    setUploadError('')
    for (const file of photos) {
      const fd = new FormData()
      fd.set('token', token)
      fd.set('ticket_id', ticketId)
      fd.set('file', file)
      const res = await uploadTenantTicketPhoto(fd)
      if (!res.ok) { setUploadError(res.error); setUploading(false); return }
    }
    setUploading(false)
    setUploadDone(true)
    setTimeout(() => onClose(), 1200)
  }

  // Photo upload step
  if (ticketId) {
    return (
      <div style={{ position:'fixed',inset:0,zIndex:50,background:'rgba(26,22,37,.55)',backdropFilter:'blur(4px)',display:'flex',alignItems:'center',justifyContent:'center',padding:16 }}>
        <div style={{ background:'var(--bg)',borderRadius:20,width:'100%',maxWidth:560,padding:'28px 32px 36px',boxShadow:'0 24px 64px rgba(0,0,0,.35)' }}>
          {uploadDone ? (
            <div style={{ textAlign:'center',padding:'24px 0' }}>
              <div style={{ fontSize:40,marginBottom:12 }}>✅</div>
              <div style={{ fontSize:17,fontWeight:800 }}>Request submitted!</div>
              <div style={{ fontSize:13,color:'var(--text-muted)',marginTop:8 }}>Your photos were attached.</div>
            </div>
          ) : (
            <>
              <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20 }}>
                <div>
                  <div style={{ fontSize:17,fontWeight:800,color:'var(--text)' }}>Request submitted ✓</div>
                  <div style={{ fontSize:13,color:'var(--text-muted)',marginTop:4 }}>Add photos to help us understand the issue (optional)</div>
                </div>
                <button onClick={onClose} style={{ background:'var(--purple-soft)',border:'none',borderRadius:8,padding:'6px 10px',color:'var(--purple)',fontWeight:700,fontSize:13,cursor:'pointer' }}>Skip</button>
              </div>

              <label style={{ display:'block',border:'2px dashed var(--border)',borderRadius:14,padding:'28px',textAlign:'center',cursor:'pointer',marginBottom:16,background:'var(--bg)' }}>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/heic"
                  multiple
                  style={{ display:'none' }}
                  onChange={e => setPhotos(Array.from(e.target.files ?? []).slice(0, 5))}
                />
                <div style={{ fontSize:28,marginBottom:8 }}>📷</div>
                <div style={{ fontSize:14,fontWeight:700,color:'var(--text)',marginBottom:4 }}>
                  {photos.length > 0 ? `${photos.length} photo${photos.length > 1 ? 's' : ''} selected` : 'Tap to add photos'}
                </div>
                <div style={{ fontSize:11,color:'var(--text-muted)' }}>JPEG, PNG, WEBP or HEIC · up to 5 photos · max 10 MB each</div>
              </label>

              {photos.length > 0 && (
                <div style={{ display:'flex',gap:8,flexWrap:'wrap',marginBottom:16 }}>
                  {photos.map((f,i) => (
                    <div key={i} style={{ position:'relative',width:72,height:72,borderRadius:10,overflow:'hidden',border:'1.5px solid var(--border)' }}>
                      <img src={URL.createObjectURL(f)} alt="" style={{ width:'100%',height:'100%',objectFit:'cover' }} />
                    </div>
                  ))}
                </div>
              )}

              {uploadError && <div style={{ fontSize:12,color:'#b91c1c',marginBottom:12 }}>{uploadError}</div>}

              <button
                onClick={handlePhotoUpload}
                disabled={uploading}
                style={{ width:'100%',background:'linear-gradient(135deg,var(--purple),var(--purple-mid))',color:'#fff',border:'none',borderRadius:12,padding:'14px',fontSize:15,fontWeight:700,cursor:'pointer',opacity:uploading ? .6 : 1 }}
              >
                {uploading ? 'Uploading…' : photos.length > 0 ? `Upload ${photos.length} photo${photos.length > 1 ? 's' : ''} →` : 'Done — no photos'}
              </button>
            </>
          )}
        </div>
      </div>
    )
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 50,
      background: 'rgba(26,22,37,.55)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '16px',
    }}>
      <div style={{
        background: 'var(--bg)', borderRadius: 20,
        width: '100%', maxWidth: 640, maxHeight: '92dvh',
        overflow: 'auto', padding: '28px 32px 36px',
        boxShadow: '0 24px 64px rgba(0,0,0,.35)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div style={{ fontSize: 17, fontWeight: 800, color: 'var(--text)' }}>New Maintenance Request</div>
          <button onClick={onClose} style={{ background: 'var(--purple-soft)', border: 'none', borderRadius: 8, padding: '6px 10px', color: 'var(--purple)', fontWeight: 700, fontSize: 13 }}>
            Cancel
          </button>
        </div>

        <form ref={formRef} onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 10 }}>Category</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
              {CATEGORIES.map(c => (
                <button key={c} type="button" onClick={() => setCategory(c)} style={{
                  background: category === c ? 'var(--purple)' : 'var(--card)',
                  color: category === c ? '#fff' : 'var(--text-muted)',
                  border: category === c ? 'none' : '1px solid var(--border)',
                  borderRadius: 20, padding: '6px 13px', fontSize: 12, fontWeight: 600,
                }}>{c}</button>
              ))}
            </div>
          </div>

          <div>
            <label style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', marginBottom: 7 }}>
              What&apos;s the issue?
            </label>
            <input name="title" required maxLength={120} placeholder="e.g. A/C not blowing cold air"
              style={{ width: '100%', padding: '11px 13px', borderRadius: 'var(--radius-sm)', fontSize: 14 }} />
          </div>

          <div>
            <label style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', marginBottom: 7 }}>
              Describe the problem
            </label>
            <textarea name="body" required rows={4} maxLength={2000}
              placeholder="When did it start? How bad is it? Any other details…"
              style={{ width: '100%', padding: '11px 13px', borderRadius: 'var(--radius-sm)', fontSize: 13, resize: 'vertical' }} />
          </div>

          <div>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 10 }}>Urgency</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
              {URGENCIES.map(u => (
                <button key={u.value} type="button" onClick={() => setUrgency(u.value)} style={{
                  background: urgency === u.value ? '#fef9f0' : 'var(--card)',
                  border: urgency === u.value ? `1.5px solid ${u.color}` : '1.5px solid var(--border)',
                  borderRadius: 10, padding: '10px 6px', textAlign: 'center',
                }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: u.color }}>{u.label}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>{u.sub}</div>
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 10, padding: '10px 13px', fontSize: 13, color: '#b91c1c' }}>
              {error}
            </div>
          )}

          <button type="submit" disabled={pending} style={{
            background: 'linear-gradient(135deg, var(--purple), var(--purple-mid))',
            color: '#fff', border: 'none', borderRadius: 'var(--radius-sm)',
            padding: '14px', fontSize: 15, fontWeight: 700,
            opacity: pending ? .7 : 1,
          }}>
            {pending ? 'Sending…' : 'Submit Request'}
          </button>
        </form>
      </div>
    </div>
  )
}
