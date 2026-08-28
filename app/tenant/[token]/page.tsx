import { supabaseAdmin as supabase } from '@/lib/supabase/admin'
import TenantPortalClient from './TenantPortalClient'

type Props = { params: Promise<{ token: string }> }

export default async function TenantPortalPage({ params }: Props) {
  const { token } = await params

  // Validate token and load tenant with property
  const { data: tenant } = await supabase
    .from('tenants')
    .select('id, name, unit, rent_amount, rent_due_day, lease_end, active, properties(name, address, city, state)')
    .eq('tenant_token', token)
    .eq('active', true)
    .maybeSingle()

  if (!tenant) {
    return (
      <main style={{ padding: '60px 20px', background: 'var(--bg)', minHeight: '100vh', textAlign: 'center' }}>
        <div style={{ maxWidth: 400, margin: '0 auto' }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>🏠</div>
          <h1 style={{ fontSize: 20, fontWeight: 800, marginBottom: 8 }}>Link not found</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 14, lineHeight: 1.6 }}>
            This portal link is invalid or has expired. Please contact your property manager for a new link.
          </p>
        </div>
      </main>
    )
  }

  // Load tickets submitted by this tenant
  const { data: tickets } = await supabase
    .from('tickets')
    .select('id, title, status, category, priority, emergency, created_at')
    .eq('tenant_id', tenant.id)
    .order('created_at', { ascending: false })

  // Load all messages for this tenant
  const { data: messages } = await supabase
    .from('tenant_messages')
    .select('id, sender, body, read_at, created_at, ticket_id')
    .eq('tenant_id', tenant.id)
    .order('created_at', { ascending: true })

  // Mark manager messages as read (fire-and-forget)
  const unreadIds = (messages || [])
    .filter(m => m.sender === 'manager' && !m.read_at)
    .map(m => m.id)
  if (unreadIds.length) {
    supabase
      .from('tenant_messages')
      .update({ read_at: new Date().toISOString() })
      .in('id', unreadIds)
      .then(() => {}) // intentional fire-and-forget
  }

  // Manager name from access_groups or fallback
  const managerName = 'Christopher'

  const prop = Array.isArray(tenant.properties) ? tenant.properties[0] : tenant.properties

  return (
    <TenantPortalClient
      tenant={{ ...tenant, properties: prop ?? null }}
      token={token}
      tickets={tickets || []}
      messages={messages || []}
      managerName={managerName}
    />
  )
}
