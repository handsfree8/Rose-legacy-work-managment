'use client'

type Props = {
  portalUrl: string
  propertyName: string
}

export default function LandlordActions({ portalUrl, propertyName }: Props) {
  const subject = `Work Order Report — ${propertyName}`
  const body =
    `Hello,\n\nHere is the live work order report for ${propertyName} from Rose Legacy Home Solutions:\n\n${portalUrl}\n\n` +
    `You can review all work orders, photos, and payment history at the link above.\n\nThank you,\nRose Legacy Home Solutions`
  const mailto = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`

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
      <a href={mailto} style={{ ...btn, background: 'var(--purple)', color: '#fff', border: '1px solid var(--purple)' }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 5L2 7"/></svg>
        Email report
      </a>
      <button type="button" onClick={() => window.print()} style={btn}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
        Print / Save PDF
      </button>
      <button type="button" onClick={copyLink} style={btn}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
        Copy link
      </button>
    </div>
  )
}
