import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Tenant Portal · Rose Legacy',
  description: 'Manage your requests, messages, and rent — Rose Legacy Home Solutions',
}

// This layout intentionally has NO SiteHeader — the tenant portal is a
// standalone mobile-first experience with its own navigation.
export default function TenantLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
