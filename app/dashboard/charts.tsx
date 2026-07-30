'use client'

import { useState } from 'react'
import {
  TICKET_STATUS_COLORS,
  TICKET_STATUS_LABELS,
  type StatusSlice,
  type MonthBar,
  type PropertyRank,
  type RecentTicket,
  type ProfitSummary,
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

// ── Profit Dashboard ─────────────────────────────────────────────────────────

const fmtUsd = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)

function ProfitKpiCard({
  label, value, sub, tone, delay,
}: { label: string; value: string; sub?: string; tone: string; delay: string }) {
  return (
    <div
      className="kpi-fade kpi-card-lift"
      style={{ animationDelay: delay, background: 'var(--card)', border: '1px solid var(--border)', borderTop: `3px solid ${tone}`, borderRadius: '16px', padding: '18px 20px', boxShadow: 'var(--shadow)', display: 'flex', flexDirection: 'column', gap: '4px' }}
    >
      <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>{label}</span>
      <span style={{ fontSize: '28px', fontWeight: 800, color: tone, lineHeight: 1.15 }}>{value}</span>
      {sub && <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{sub}</span>}
    </div>
  )
}

export function ProfitSection({ summary }: { summary: ProfitSummary }) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null)
  const [showAll, setShowAll] = useState(false)

  const { months, ytdRevenue, bestMonth, avgMonthly, pendingReceivable, totalCollected } = summary
  const max = Math.max(...months.map((m) => m.revenue), 1)

  const svgW = 580
  const svgH = 160
  const barCount = months.length
  const gap = 6
  const barW = (svgW - gap * (barCount - 1)) / barCount

  const displayMonths = showAll ? [...months].reverse() : months.filter(m => m.revenue > 0 || m.pending > 0).slice(-6).reverse()

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

      {/* KPI strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(155px, 1fr))', gap: '12px' }}>
        <ProfitKpiCard label="Total Collected" value={fmtUsd(totalCollected)} sub="all time" tone="#2f9e44" delay="0s" />
        <ProfitKpiCard label="YTD Revenue" value={fmtUsd(ytdRevenue)} sub={new Date().getFullYear().toString()} tone="#6b35b8" delay="0.07s" />
        <ProfitKpiCard label="Avg / Active Month" value={fmtUsd(avgMonthly)} sub="paid months only" tone="#c9622a" delay="0.14s" />
        <ProfitKpiCard
          label="Best Month"
          value={bestMonth ? fmtUsd(bestMonth.revenue) : '—'}
          sub={bestMonth?.fullLabel}
          tone="#1d9e75"
          delay="0.21s"
        />
        <ProfitKpiCard label="Pending Receivable" value={fmtUsd(pendingReceivable)} sub="unpaid invoices" tone="#b0851f" delay="0.28s" />
      </div>

      {/* Bar chart */}
      <div style={{ ...cardStyle, gridColumn: '1 / -1' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '4px' }}>
          <span style={labelStyle}>Monthly revenue — last 12 months</span>
          {bestMonth && (
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Peak: <strong style={{ color: '#2f9e44' }}>{fmtUsd(bestMonth.revenue)}</strong> in {bestMonth.fullLabel}
            </span>
          )}
        </div>

        <div style={{ position: 'relative', overflowX: 'auto' }}>
          <svg
            viewBox={`0 0 ${svgW} ${svgH + 24}`}
            style={{ width: '100%', minWidth: '400px', height: `${svgH + 40}px` }}
            onMouseLeave={() => setHoveredIdx(null)}
          >
            {/* Grid lines */}
            {[0.25, 0.5, 0.75, 1].map((frac) => {
              const y = svgH - frac * (svgH - 10)
              return (
                <g key={frac}>
                  <line x1={0} y1={y} x2={svgW} y2={y} stroke="var(--border)" strokeWidth={0.5} strokeDasharray="4 4" />
                  <text x={svgW - 2} y={y - 3} textAnchor="end" fontSize="9" fill="var(--text-muted)">
                    {fmtUsd(max * frac)}
                  </text>
                </g>
              )
            })}

            {/* Bars */}
            {months.map((m, i) => {
              const h = m.revenue > 0 ? Math.max((m.revenue / max) * (svgH - 10), 4) : 0
              const ph = m.pending > 0 ? Math.max((m.pending / max) * (svgH - 10), 3) : 0
              const x = i * (barW + gap)
              const isHovered = hoveredIdx === i
              const isCurrent = i === months.length - 1
              return (
                <g key={m.key} onMouseEnter={() => setHoveredIdx(i)}>
                  {/* Hit area */}
                  <rect x={x} y={0} width={barW} height={svgH} fill="transparent" />
                  {/* Pending bar (faded amber) */}
                  {ph > 0 && (
                    <rect
                      x={x + barW * 0.25}
                      y={svgH - ph}
                      width={barW * 0.5}
                      height={ph}
                      rx={3}
                      fill="#f59f00"
                      opacity={0.3}
                    />
                  )}
                  {/* Revenue bar */}
                  {h > 0 && (
                    <rect
                      className="kpi-bar"
                      style={{ animationDelay: `${(i * 0.055).toFixed(2)}s` }}
                      x={x}
                      y={svgH - h}
                      width={barW}
                      height={h}
                      rx={4}
                      fill={isCurrent ? '#2f9e44' : isHovered ? '#6b35b8' : 'var(--purple-mid)'}
                      opacity={h > 0 ? 1 : 0}
                    />
                  )}
                  {/* Empty state bar */}
                  {h === 0 && (
                    <rect x={x} y={svgH - 3} width={barW} height={3} rx={2} fill="var(--border)" />
                  )}
                  {/* Hover amount label */}
                  {isHovered && m.revenue > 0 && (
                    <text x={x + barW / 2} y={svgH - h - 6} textAnchor="middle" fontSize="10" fontWeight="700" fill="var(--purple)">
                      {fmtUsd(m.revenue)}
                    </text>
                  )}
                  {/* Month label */}
                  <text x={x + barW / 2} y={svgH + 14} textAnchor="middle" fontSize="10" fill={isCurrent ? '#2f9e44' : 'var(--text-muted)'} fontWeight={isCurrent ? '700' : '400'}>
                    {m.label}
                  </text>
                </g>
              )
            })}
            <line x1={0} y1={svgH} x2={svgW} y2={svgH} stroke="var(--border)" strokeWidth={1} />
          </svg>

          {/* Tooltip */}
          {hoveredIdx !== null && (() => {
            const m = months[hoveredIdx]
            return (
              <div style={{
                position: 'absolute',
                top: '8px',
                left: '50%',
                transform: 'translateX(-50%)',
                background: '#1a1a2e',
                color: '#fff',
                borderRadius: '10px',
                padding: '10px 16px',
                fontSize: '13px',
                pointerEvents: 'none',
                zIndex: 10,
                whiteSpace: 'nowrap',
                boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
              }}>
                <div style={{ fontWeight: 800, fontSize: '15px', marginBottom: '4px' }}>{m.fullLabel}</div>
                <div>💰 Collected: <strong style={{ color: '#51cf66' }}>{fmtUsd(m.revenue)}</strong></div>
                {m.pending > 0 && <div>⏳ Pending: <strong style={{ color: '#fcc419' }}>{fmtUsd(m.pending)}</strong></div>}
                <div style={{ color: 'rgba(255,255,255,0.6)', marginTop: '2px' }}>{m.invoiceCount} invoice{m.invoiceCount !== 1 ? 's' : ''} paid</div>
              </div>
            )
          })()}
        </div>

        {/* Legend */}
        <div style={{ display: 'flex', gap: '16px', marginTop: '4px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-muted)' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: 'var(--purple-mid)', display: 'inline-block' }} />
            Collected
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-muted)' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: '#f59f00', opacity: 0.5, display: 'inline-block' }} />
            Pending receivable
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#2f9e44', fontWeight: 700 }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: '#2f9e44', display: 'inline-block' }} />
            Current month
          </div>
        </div>
      </div>

      {/* Monthly breakdown table */}
      <div style={{ ...cardStyle, gridColumn: '1 / -1' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <span style={labelStyle}>Monthly breakdown</span>
          <button
            onClick={() => setShowAll(!showAll)}
            style={{ fontSize: '12px', color: 'var(--purple)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700 }}
          >
            {showAll ? 'Show recent ↑' : 'Show all 12 months ↓'}
          </button>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border)' }}>
                <th style={{ textAlign: 'left', padding: '6px 10px 10px 0', color: 'var(--text-muted)', fontWeight: 700, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Month</th>
                <th style={{ textAlign: 'right', padding: '6px 10px 10px', color: 'var(--text-muted)', fontWeight: 700, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Invoices Paid</th>
                <th style={{ textAlign: 'right', padding: '6px 10px 10px', color: 'var(--text-muted)', fontWeight: 700, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Revenue</th>
                <th style={{ textAlign: 'right', padding: '6px 10px 10px', color: 'var(--text-muted)', fontWeight: 700, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Pending</th>
                <th style={{ textAlign: 'right', padding: '6px 10px 10px 0', color: 'var(--text-muted)', fontWeight: 700, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Bar</th>
              </tr>
            </thead>
            <tbody>
              {displayMonths.map((m, i) => {
                const isCurrent = m.key === months[months.length - 1].key
                const barPct = max > 0 ? (m.revenue / max) * 100 : 0
                return (
                  <tr
                    key={m.key}
                    className="kpi-fade"
                    style={{
                      animationDelay: `${(i * 0.05).toFixed(2)}s`,
                      borderBottom: '1px solid var(--border)',
                      background: isCurrent ? 'rgba(47,158,68,0.04)' : 'transparent',
                    }}
                  >
                    <td style={{ padding: '12px 10px 12px 0', fontWeight: isCurrent ? 800 : 600, color: isCurrent ? '#2f9e44' : 'var(--text)' }}>
                      {m.fullLabel}{isCurrent && <span style={{ marginLeft: '6px', fontSize: '10px', background: '#2f9e44', color: '#fff', borderRadius: '999px', padding: '1px 7px' }}>current</span>}
                    </td>
                    <td style={{ textAlign: 'right', padding: '12px 10px', color: m.invoiceCount > 0 ? 'var(--text)' : 'var(--text-muted)' }}>
                      {m.invoiceCount > 0 ? m.invoiceCount : '—'}
                    </td>
                    <td style={{ textAlign: 'right', padding: '12px 10px', fontWeight: 700, color: m.revenue > 0 ? '#2f9e44' : 'var(--text-muted)' }}>
                      {m.revenue > 0 ? fmtUsd(m.revenue) : '—'}
                    </td>
                    <td style={{ textAlign: 'right', padding: '12px 10px', color: m.pending > 0 ? '#b0851f' : 'var(--text-muted)' }}>
                      {m.pending > 0 ? fmtUsd(m.pending) : '—'}
                    </td>
                    <td style={{ textAlign: 'right', padding: '12px 0 12px 10px', minWidth: '80px' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', width: '100%', justifyContent: 'flex-end' }}>
                        <div style={{ width: '64px', height: '6px', background: 'var(--purple-light)', borderRadius: '999px', overflow: 'hidden' }}>
                          <div
                            className="kpi-fill"
                            style={{ height: '100%', width: `${barPct}%`, background: isCurrent ? '#2f9e44' : 'var(--purple-mid)', borderRadius: '999px', animationDelay: `${(i * 0.05).toFixed(2)}s` }}
                          />
                        </div>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
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
