'use client'

import { useRef, useState, useTransition } from 'react'
import { recordPayment } from './actions'

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']

type Props = {
  tenant: { id: string; name: string; unit: string | null; rent_amount: number }
  onClose: () => void
}

const METHODS = [
  { value: 'check',    label: 'Check',    icon: '💳' },
  { value: 'cash',     label: 'Cash',     icon: '💵' },
  { value: 'transfer', label: 'Transfer', icon: '📱' },
]

function buildPeriodOptions() {
  const opts: { label: string; year: number; month: number }[] = []
  const now = new Date()
  for (let i = -1; i <= 3; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1)
    opts.push({ label: `${MONTHS[d.getMonth()]} ${d.getFullYear()}`, year: d.getFullYear(), month: d.getMonth() + 1 })
  }
  return opts
}

export default function PaymentModal({ tenant, onClose }: Props) {
  const now = new Date()
  const [method,  setMethod]  = useState('check')
  const [error,   setError]   = useState('')
  const [pending, start]      = useTransition()
  const formRef = useRef<HTMLFormElement>(null)
  const periods = buildPeriodOptions()
  const defaultPeriod = periods.findIndex(p => p.year === now.getFullYear() && p.month === now.getMonth() + 1)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    const fd = new FormData(formRef.current!)
    fd.set('tenant_id', tenant.id)
    fd.set('method', method)
    start(async () => {
      const res = await recordPayment(fd)
      if (res.ok) { onClose() }
      else { setError(res.error) }
    })
  }

  return (
    <div
      style={{ position:'fixed',inset:0,zIndex:50,background:'rgba(15,10,26,.6)',backdropFilter:'blur(4px)',display:'flex',alignItems:'center',justifyContent:'center',padding:16 }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{ background:'var(--card)',borderRadius:20,width:'100%',maxWidth:480,padding:'28px 28px 32px',boxShadow:'0 24px 64px rgba(0,0,0,.3)' }}>
        <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:22 }}>
          <div>
            <div style={{ fontSize:18,fontWeight:800,color:'var(--text)' }}>Record Payment</div>
            <div style={{ fontSize:12,color:'var(--text-muted)',marginTop:3 }}>{tenant.name}{tenant.unit ? ` · ${tenant.unit}` : ''}</div>
          </div>
          <button onClick={onClose} style={{ background:'var(--purple-soft)',border:'none',borderRadius:8,padding:'6px 11px',fontSize:12,fontWeight:700,color:'var(--purple)',cursor:'pointer' }}>Cancel</button>
        </div>

        <form ref={formRef} onSubmit={handleSubmit} style={{ display:'flex',flexDirection:'column',gap:16 }}>
          {/* Period + Amount */}
          <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:12 }}>
            <div>
              <label style={{ fontSize:10,fontWeight:700,letterSpacing:'.12em',textTransform:'uppercase',color:'var(--text-muted)',display:'block',marginBottom:6 }}>Period</label>
              <select name="period" required defaultValue={defaultPeriod}
                onChange={e => {
                  const p = periods[parseInt(e.target.value)]
                  const form = formRef.current!
                  ;(form.elements.namedItem('period_year') as HTMLInputElement).value = String(p.year)
                  ;(form.elements.namedItem('period_month') as HTMLInputElement).value = String(p.month)
                }}
                style={{ width:'100%',padding:'11px 12px',borderRadius:'var(--radius-sm)',border:'1.5px solid var(--border)',background:'var(--bg)',color:'var(--text)',fontSize:13 }}>
                {periods.map((p, i) => <option key={i} value={i}>{p.label}</option>)}
              </select>
              <input type="hidden" name="period_year"  defaultValue={periods[defaultPeriod]?.year} />
              <input type="hidden" name="period_month" defaultValue={periods[defaultPeriod]?.month} />
            </div>
            <div>
              <label style={{ fontSize:10,fontWeight:700,letterSpacing:'.12em',textTransform:'uppercase',color:'var(--text-muted)',display:'block',marginBottom:6 }}>Amount Received</label>
              <input name="amount" type="number" step="0.01" required defaultValue={tenant.rent_amount}
                style={{ width:'100%',padding:'11px 12px',borderRadius:'var(--radius-sm)',border:'1.5px solid var(--border)',background:'var(--bg)',color:'var(--text)',fontSize:13 }} />
            </div>
          </div>

          {/* Method */}
          <div>
            <div style={{ fontSize:10,fontWeight:700,letterSpacing:'.12em',textTransform:'uppercase',color:'var(--text-muted)',marginBottom:8 }}>Payment Method</div>
            <div style={{ display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8 }}>
              {METHODS.map(m => (
                <button key={m.value} type="button" onClick={() => setMethod(m.value)} style={{
                  border: method === m.value ? '2px solid var(--purple)' : '1.5px solid var(--border)',
                  borderRadius:10, padding:'11px 8px', textAlign:'center', cursor:'pointer',
                  background: method === m.value ? 'var(--purple-soft)' : 'var(--bg)',
                }}>
                  <div style={{ fontSize:20,marginBottom:3 }}>{m.icon}</div>
                  <div style={{ fontSize:11,fontWeight:700,color: method === m.value ? 'var(--purple)' : 'var(--text-muted)' }}>{m.label}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Date */}
          <div>
            <label style={{ fontSize:10,fontWeight:700,letterSpacing:'.12em',textTransform:'uppercase',color:'var(--text-muted)',display:'block',marginBottom:6 }}>Date Received</label>
            <input name="paid_at" type="date" required defaultValue={new Date().toISOString().split('T')[0]}
              style={{ width:'100%',padding:'11px 12px',borderRadius:'var(--radius-sm)',border:'1.5px solid var(--border)',background:'var(--bg)',color:'var(--text)',fontSize:13 }} />
          </div>

          {/* Notes */}
          <div>
            <label style={{ fontSize:10,fontWeight:700,letterSpacing:'.12em',textTransform:'uppercase',color:'var(--text-muted)',display:'block',marginBottom:6 }}>Notes <span style={{ opacity:.5 }}>(optional)</span></label>
            <input name="notes" type="text" placeholder="e.g. Check #1042"
              style={{ width:'100%',padding:'11px 12px',borderRadius:'var(--radius-sm)',border:'1.5px solid var(--border)',background:'var(--bg)',color:'var(--text)',fontSize:13 }} />
          </div>

          {error && (
            <div style={{ background:'#fef2f2',border:'1px solid #fca5a5',borderRadius:10,padding:'10px 13px',fontSize:13,color:'#b91c1c' }}>{error}</div>
          )}

          <button type="submit" disabled={pending} style={{
            background:'linear-gradient(135deg,var(--purple),var(--purple-mid))',
            color:'#fff',border:'none',borderRadius:'var(--radius-sm)',
            padding:'14px',fontSize:15,fontWeight:700,cursor:'pointer',
            opacity: pending ? .7 : 1,
          }}>
            {pending ? 'Saving…' : '✓ Save Payment'}
          </button>
        </form>
      </div>
    </div>
  )
}
