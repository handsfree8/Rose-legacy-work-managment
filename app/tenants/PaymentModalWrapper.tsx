'use client'

import { useState } from 'react'
import PaymentModal from './PaymentModal'
import type { TenantSummaryRow, PaymentRow } from './actions'

const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const METHOD_LABEL: Record<string,string> = { check:'Check', cash:'Cash', transfer:'Transfer' }

function statusChip(payment: PaymentRow | null, _rentAmount: number, duDay: number) {
  if (payment) {
    return (
      <span style={{ background:'#f0fdf4',color:'#16a34a',border:'1px solid #bbf7d0',borderRadius:20,padding:'4px 10px',fontSize:10,fontWeight:700,whiteSpace:'nowrap' }}>
        ✓ ${Number(payment.amount).toLocaleString('en-US',{minimumFractionDigits:2})} · {METHOD_LABEL[payment.method]??payment.method}
      </span>
    )
  }
  return (
    <span style={{ background:'#fffbeb',color:'#d97706',border:'1px solid #fde68a',borderRadius:20,padding:'4px 10px',fontSize:10,fontWeight:700,whiteSpace:'nowrap' }}>
      ⏳ Due the {duDay}{duDay===1?'st':duDay===2?'nd':duDay===3?'rd':'th'}
    </span>
  )
}


export default function PaymentModalWrapper({
  tenants,
  histories,
}: {
  tenants: TenantSummaryRow[]
  histories: Record<string, PaymentRow[]>
}) {
  const [modalTenant, setModalTenant] = useState<TenantSummaryRow | null>(null)
  const [expandedId,  setExpandedId]  = useState<string | null>(null)

  const now = new Date()
  const monthLabel = `${MONTHS_SHORT[now.getMonth()]} ${now.getFullYear()}`

  return (
    <>
      {/* Summary stats */}
      <div style={{ display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:14,marginBottom:28 }}>
        {[
          { label:'Monthly rent total',   value:`$${tenants.reduce((s,t)=>s+t.rent_amount,0).toLocaleString('en-US',{minimumFractionDigits:2})}`,     note:`${tenants.length} active tenant${tenants.length!==1?'s':''}` },
          { label:`Collected — ${monthLabel}`, value:`$${tenants.filter(t=>t.payment).reduce((s,t)=>s+Number(t.payment!.amount),0).toLocaleString('en-US',{minimumFractionDigits:2})}`, note:`${tenants.filter(t=>t.payment).length} of ${tenants.length} paid` },
          { label:'Outstanding',          value:`$${tenants.filter(t=>!t.payment).reduce((s,t)=>s+t.rent_amount,0).toLocaleString('en-US',{minimumFractionDigits:2})}`,               note:`${tenants.filter(t=>!t.payment).length} pending` },
        ].map(s => (
          <div key={s.label} style={{ background:'var(--card)',border:'1px solid var(--border)',borderRadius:'var(--radius)',padding:'18px 20px',boxShadow:'var(--shadow)' }}>
            <div style={{ fontSize:10,fontWeight:700,letterSpacing:'.13em',textTransform:'uppercase',color:'var(--text-muted)',marginBottom:8 }}>{s.label}</div>
            <div style={{ fontSize:24,fontWeight:800 }}>{s.value}</div>
            <div style={{ fontSize:11,color:'var(--text-muted)',marginTop:4 }}>{s.note}</div>
          </div>
        ))}
      </div>

      {/* Tenant cards */}
      <div style={{ display:'flex',flexDirection:'column',gap:10 }}>
        {tenants.map(t => (
          <div key={t.id} style={{ background:'var(--card)',border:'1px solid var(--border)',borderRadius:'var(--radius)',boxShadow:'var(--shadow)' }}>
            <div style={{ display:'grid',gridTemplateColumns:'44px 1fr auto',gap:14,alignItems:'center',padding:'18px 20px' }}>
              <div style={{ width:44,height:44,borderRadius:'50%',background:'var(--purple-soft)',border:'1.5px solid var(--purple-border)',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:800,fontSize:17,color:'var(--purple)',flexShrink:0 }}>
                {t.name.charAt(0)}
              </div>
              <div>
                <div style={{ fontWeight:700,fontSize:15 }}>{t.name}</div>
                <div style={{ fontSize:11,color:'var(--text-muted)',marginTop:3,display:'flex',gap:8,flexWrap:'wrap' }}>
                  {t.unit && <span>{t.unit}</span>}
                  {t.property_address && <><span>·</span><span>{t.property_address}</span></>}
                  <span>·</span>
                  <span style={{ fontWeight:700,color:'var(--text)' }}>${t.rent_amount.toLocaleString('en-US',{minimumFractionDigits:2})}/mo</span>
                </div>
              </div>
              <div style={{ display:'flex',gap:8,alignItems:'center',flexWrap:'wrap',justifyContent:'flex-end' }}>
                {statusChip(t.payment, t.rent_amount, t.rent_due_day)}
                <button onClick={() => setModalTenant(t)} style={{ background:'linear-gradient(135deg,var(--purple),var(--purple-mid))',color:'#fff',border:'none',borderRadius:10,padding:'9px 15px',fontSize:12,fontWeight:700,cursor:'pointer',whiteSpace:'nowrap' }}>
                  + Record Payment
                </button>
                <button onClick={() => setExpandedId(expandedId===t.id?null:t.id)} style={{ background:'var(--card)',border:'1px solid var(--border)',borderRadius:10,padding:'9px 13px',fontSize:12,fontWeight:600,color:'var(--text-muted)',cursor:'pointer' }}>
                  History
                </button>
              </div>
            </div>

            {/* History accordion */}
            {expandedId === t.id && (
              <div style={{ borderTop:'1px solid var(--border)',padding:'16px 20px' }}>
                <div style={{ fontSize:10,fontWeight:700,letterSpacing:'.13em',textTransform:'uppercase',color:'var(--text-muted)',marginBottom:12 }}>Payment History</div>
                {(histories[t.id]??[]).length === 0 ? (
                  <div style={{ fontSize:13,color:'var(--text-muted)',padding:'12px 0' }}>No payments recorded yet.</div>
                ) : (
                  <div>
                    {(histories[t.id]??[]).map(p => (
                      <div key={p.id} style={{ display:'flex',justifyContent:'space-between',alignItems:'center',padding:'11px 0',borderBottom:'1px solid var(--border)' }}>
                        <div>
                          <div style={{ fontSize:13,fontWeight:700 }}>{MONTHS_SHORT[p.period_month-1]} {p.period_year}</div>
                          <div style={{ fontSize:11,color:'var(--text-muted)',marginTop:2 }}>
                            {METHOD_LABEL[p.method]??p.method} · {new Date(p.paid_at).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})}
                          </div>
                        </div>
                        <div style={{ fontSize:15,fontWeight:800,color:'#16a34a' }}>${Number(p.amount).toLocaleString('en-US',{minimumFractionDigits:2})}</div>
                      </div>
                    ))}
                  </div>
                )}
                {/* Reminder status */}
                <div style={{ marginTop:14,background:'#fffbeb',border:'1px solid #fde68a',borderRadius:10,padding:'12px 14px',display:'flex',justifyContent:'space-between',alignItems:'center' }}>
                  <div>
                    <div style={{ fontSize:12,fontWeight:700,color:'#d97706' }}>📧 Automatic reminder</div>
                    <div style={{ fontSize:11,color:'var(--text-muted)',marginTop:2 }}>
                      Sent 3 days before the {t.rent_due_day}{t.rent_due_day===1?'st':t.rent_due_day===2?'nd':t.rent_due_day===3?'rd':'th'} of each month
                      {t.email ? '' : ' — no email on file'}
                    </div>
                  </div>
                  <span style={{ background:'#fffbeb',color:'#d97706',border:'1px solid #fde68a',borderRadius:20,padding:'4px 10px',fontSize:10,fontWeight:700 }}>
                    {t.email ? 'Scheduled' : 'No email'}
                  </span>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {modalTenant && (
        <PaymentModal tenant={modalTenant} onClose={() => setModalTenant(null)} />
      )}
    </>
  )
}
