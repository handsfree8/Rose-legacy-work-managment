'use client'

import { useRef, useState, useTransition } from 'react'
import { submitTenantTicket } from './actions'

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

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    const fd = new FormData(formRef.current!)
    fd.set('token', token)
    fd.set('category', category)
    fd.set('urgency', urgency)
    startTransition(async () => {
      try {
        await submitTenantTicket(fd)
        onClose()
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Something went wrong.')
      }
    })
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 50,
      background: 'rgba(26,22,37,.55)', backdropFilter: 'blur(3px)',
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
    }}>
      <div style={{
        background: 'var(--bg)', borderRadius: '20px 20px 0 0',
        width: '100%', maxWidth: 480, maxHeight: '92dvh',
        overflow: 'auto', padding: '24px 20px 32px',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div style={{ fontSize: 17, fontWeight: 800, color: 'var(--text)' }}>New Maintenance Request</div>
          <button onClick={onClose} style={{ background: 'var(--purple-soft)', border: 'none', borderRadius: 8, padding: '6px 10px', color: 'var(--purple)', fontWeight: 700, fontSize: 13 }}>
            Cancel
          </button>
        </div>

        <form ref={formRef} onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {/* Category */}
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

          {/* Title */}
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', marginBottom: 7 }}>
              What's the issue?
            </label>
            <input name="title" required maxLength={120} placeholder="e.g. A/C not blowing cold air"
              style={{ width: '100%', padding: '11px 13px', borderRadius: 'var(--radius-sm)', fontSize: 14 }} />
          </div>

          {/* Description */}
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', marginBottom: 7 }}>
              Describe the problem
            </label>
            <textarea name="body" required rows={4} maxLength={2000}
              placeholder="When did it start? How bad is it? Any other details…"
              style={{ width: '100%', padding: '11px 13px', borderRadius: 'var(--radius-sm)', fontSize: 13, resize: 'vertical' }} />
          </div>

          {/* Urgency */}
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
