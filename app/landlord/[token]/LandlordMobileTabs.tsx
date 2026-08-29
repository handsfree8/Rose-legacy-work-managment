'use client'

import { useState } from 'react'

type Tab = 'overview' | 'work-orders' | 'payments'

export default function LandlordMobileTabs({
  overview,
  workOrders,
  payments,
  activeCount,
  hasAnyPending,
}: {
  overview: React.ReactNode
  workOrders: React.ReactNode
  payments: React.ReactNode
  activeCount: number
  hasAnyPending: boolean
}) {
  const [active, setActive] = useState<Tab>('overview')

  const tabs: { id: Tab; label: string; badge?: number | boolean }[] = [
    { id: 'overview',    label: 'Overview' },
    { id: 'work-orders', label: 'Work Orders', badge: activeCount > 0 ? activeCount : undefined },
    { id: 'payments',    label: 'Payments', badge: hasAnyPending },
  ]

  return (
    <>
      {/* Tab bar — only visible on mobile via CSS */}
      <div className="lp-tab-bar">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setActive(t.id)}
            className={`lp-tab-btn${active === t.id ? ' lp-tab-active' : ''}`}
          >
            {t.label}
            {t.badge && (
              <span className="lp-tab-badge">
                {typeof t.badge === 'number' ? t.badge : '!'}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Sections — hidden on mobile unless active; always visible on desktop via CSS in page.tsx */}
      <div className="lp-tab-section" data-tab="overview" data-active={active === 'overview' ? 'true' : 'false'}>
        {overview}
      </div>
      <div className="lp-tab-section" data-tab="work-orders" data-active={active === 'work-orders' ? 'true' : 'false'}>
        {workOrders}
      </div>
      <div className="lp-tab-section" data-tab="payments" data-active={active === 'payments' ? 'true' : 'false'}>
        {payments}
      </div>
    </>
  )
}
