'use client'

type Props = {
  portalUrl: string
  propertyName: string
}

export default function LandlordActions({ portalUrl, propertyName }: Props) {
  const btn: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 16px',
    borderRadius: '10px',
    fontWeight: 700,
    fontSize: '14px',
    cursor: 'pointer',
    textDecoration: 'none',
    border: '1px solid var(--border)',
    background: '#fff',
    color: 'var(--text)',
    whiteSpace: 'nowrap',
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(portalUrl)
      alert('Portal link copied to clipboard.')
    } catch {
      window.prompt('Copy this portal link:', portalUrl)
    }
  }

  return (
    <div className="no-print" style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
      <button type="button" onClick={() => window.print()} style={{ ...btn, background: '#fff', color: 'var(--purple)', border: '1px solid #fff', fontWeight: 700 }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
        Print / Save PDF
      </button>
      <button type="button" onClick={copyLink} style={{ ...btn, background: 'rgba(255,255,255,0.15)', color: '#fff', border: '1px solid rgba(255,255,255,0.4)' }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
        Copy link
      </button>
    </div>
  )
}
