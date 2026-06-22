import {
  TICKET_STATUS_COLORS,
  TICKET_STATUS_LABELS,
  type StatusSlice,
  type MonthBar,
  type PropertyRank,
  type RecentTicket,
} from '@/lib/kpis'

const cardStyle: React.CSSProperties = {
  background: 'var(--card)',
  border: '1px solid var(--border)',
  borderRadius: '16px',
  padding: '18px 20px',
  boxShadow: 'var(--shadow)',
}

const labelStyle: React.CSSProperties = {
  fontSize: '12px',
  fontWeight: 700,
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  color: 'var(--text-muted)',
}

function colorFor(status: string): string {
  return TICKET_STATUS_COLORS[status] || 'var(--purple-mid)'
}
function labelFor(status: string): string {
  return TICKET_STATUS_LABELS[status] || status
}

export function StatusDonut({ slices }: { slices: StatusSlice[] }) {
  const r = 48
  const cx = 60
  const cy = 60
  const circ = 2 * Math.PI * r
  const total = slices.reduce((s, x) => s + x.count, 0)
  let offset = 0

  return (
    <div style={cardStyle} className="kpi-card-lift">
      <span style={labelStyle}>Ticket status</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: '18px', marginTop: '12px', flexWrap: 'wrap' }}>
        <svg viewBox="0 0 120 120" style={{ width: '120px', height: '120px', flexShrink: 0 }}>
          {total === 0 ? (
            <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--border)" strokeWidth={14} />
          ) : (
            slices.map((s, i) => {
              const dash = (s.count / total) * circ
              const el = (
                <circle
                  key={s.status}
                  className="kpi-seg"
                  style={{ ['--kpi-circ' as string]: `${circ}`, animationDelay: `${(i * 0.12).toFixed(2)}s` }}
                  cx={cx}
                  cy={cy}
                  r={r}
                  fill="none"
                  stroke={colorFor(s.status)}
                  strokeWidth={14}
                  strokeDasharray={`${dash} ${circ - dash}`}
                  strokeDashoffset={-offset}
                  transform={`rotate(-90 ${cx} ${cy})`}
                />
              )
              offset += dash
              return el
            })
          )}
          <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central" fontSize="22" fontWeight="700" fill="var(--purple)">
            {total}
          </text>
        </svg>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', minWidth: 0 }}>
          {slices.length === 0 ? (
            <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>No tickets yet.</span>
          ) : (
            slices.map((s, i) => (
              <div
                key={s.status}
                className="kpi-fade"
                style={{ display: 'flex', alignItems: 'center', gap: '8px', animationDelay: `${(0.3 + i * 0.1).toFixed(2)}s` }}
              >
                <span style={{ width: '10px', height: '10px', borderRadius: '3px', background: colorFor(s.status), flexShrink: 0 }} />
                <span style={{ fontSize: '13px', color: 'var(--text)' }}>{labelFor(s.status)}</span>
                <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)', marginLeft: 'auto' }}>
                  {s.count} · {s.pct}%
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

export function TicketBars({ months, title }: { months: MonthBar[]; title: string }) {
  const max = Math.max(...months.map((m) => m.count), 1)
  const total = months.reduce((s, m) => s + m.count, 0)
  const width = 280
  const gap = 10
  const barWidth = (width - gap * (months.length - 1)) / months.length

  return (
    <div style={cardStyle} className="kpi-card-lift">
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <span style={labelStyle}>{title}</span>
        <span style={{ fontSize: '16px', fontWeight: 700, color: 'var(--purple)' }}>{total}</span>
      </div>
      <svg viewBox="0 0 280 140" preserveAspectRatio="none" style={{ width: '100%', height: '120px', marginTop: '10px' }}>
        {months.map((m, i) => {
          const h = Math.max((m.count / max) * 110, m.count > 0 ? 4 : 0)
          return (
            <rect
              key={m.key}
              className="kpi-bar"
              style={{ animationDelay: `${(i * 0.07).toFixed(2)}s` }}
              x={i * (barWidth + gap)}
              y={124 - h}
              width={barWidth}
              height={h}
              rx={4}
              fill="var(--purple-mid)"
              opacity={i === months.length - 1 ? 1 : 0.55}
            />
          )
        })}
        <line x1={0} y1={124} x2={width} y2={124} stroke="var(--border)" strokeWidth={1} />
      </svg>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px' }}>
        {months.map((m) => (
          <span key={m.key} style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
            {m.label}
          </span>
        ))}
      </div>
    </div>
  )
}

export function TopProperties({ rows }: { rows: PropertyRank[] }) {
  const max = Math.max(...rows.map((r) => r.count), 1)
  return (
    <div style={cardStyle} className="kpi-card-lift">
      <span style={labelStyle}>Top properties</span>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '12px' }}>
        {rows.length === 0 ? (
          <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>No tickets yet.</span>
        ) : (
          rows.map((r, i) => (
            <div
              key={r.name}
              className="kpi-fade"
              style={{ display: 'flex', alignItems: 'center', gap: '10px', animationDelay: `${(i * 0.08).toFixed(2)}s` }}
            >
              <span style={{ fontSize: '13px', color: 'var(--text)', minWidth: '90px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {r.name}
              </span>
              <span style={{ flex: 1, height: '8px', background: 'var(--purple-light)', borderRadius: '999px', overflow: 'hidden' }}>
                <span
                  className="kpi-fill"
                  style={{ display: 'block', height: '100%', width: `${(r.count / max) * 100}%`, background: 'var(--purple-mid)', borderRadius: '999px', animationDelay: `${(0.1 + i * 0.08).toFixed(2)}s` }}
                />
              </span>
              <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--purple)', minWidth: '24px', textAlign: 'right' }}>{r.count}</span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export function RecentTickets({ rows }: { rows: RecentTicket[] }) {
  return (
    <div style={cardStyle} className="kpi-card-lift">
      <span style={labelStyle}>Recent activity</span>
      <div style={{ display: 'flex', flexDirection: 'column', marginTop: '8px' }}>
        {rows.length === 0 ? (
          <span style={{ fontSize: '13px', color: 'var(--text-muted)', paddingTop: '8px' }}>No tickets yet.</span>
        ) : (
          rows.map((t, i) => (
            <a
              key={t.id}
              href={`/tickets/${t.id}`}
              className="kpi-fade"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '10px 0',
                borderTop: i === 0 ? 'none' : '1px solid var(--border)',
                textDecoration: 'none',
                animationDelay: `${(i * 0.06).toFixed(2)}s`,
              }}
            >
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {t.title}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  {t.property} · {t.dateLabel}
                </div>
              </div>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  padding: '3px 9px',
                  borderRadius: '999px',
                  color: '#fff',
                  background: colorFor(t.status),
                  whiteSpace: 'nowrap',
                }}
              >
                {labelFor(t.status)}
              </span>
            </a>
          ))
        )}
      </div>
    </div>
  )
}
