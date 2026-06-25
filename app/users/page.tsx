import Link from 'next/link'
import { supabaseAdmin } from '@/lib/supabase/admin'
import UserForm from './UserForm'
import { deleteAppUser } from './actions'

export const dynamic = 'force-dynamic'

type AppUserRow = {
  user_id: string
  role: string
  access_group_id: string | null
  created_at: string
}

type PropertyRow = { id: string; name: string | null; city: string | null; access_group_id: string | null }
type AccessGroupRow = { id: string; name: string | null; landlord_name: string | null }

export default async function UsersPage() {
  const [appUsersRes, propsRes, groupsRes, authRes] = await Promise.all([
    supabaseAdmin
      .from('app_users')
      .select('user_id, role, access_group_id, created_at')
      .order('created_at', { ascending: false }),
    supabaseAdmin.from('properties').select('id, name, city, access_group_id').order('name', { ascending: true }),
    supabaseAdmin.from('access_groups').select('id, name, landlord_name'),
    supabaseAdmin.auth.admin.listUsers(),
  ])

  const appUsers = (appUsersRes.data ?? []) as AppUserRow[]
  const properties = (propsRes.data ?? []) as PropertyRow[]
  const groups = (groupsRes.data ?? []) as AccessGroupRow[]

  const emailById = new Map((authRes.data?.users ?? []).map((u) => [u.id, u.email ?? '(no email)']))
  const groupEmailById = new Map(groups.map((g) => [g.id, g.landlord_name || g.name || 'Landlord']))

  // Count how many properties each access group holds (for the existing-users list).
  const propsByGroup = new Map<string, number>()
  for (const p of properties) {
    if (p.access_group_id) propsByGroup.set(p.access_group_id, (propsByGroup.get(p.access_group_id) ?? 0) + 1)
  }

  // Property options for the form: label + which landlord (if any) currently holds it.
  const propertyOptions = properties.map((p) => ({
    id: p.id,
    label: [p.name, p.city].filter(Boolean).join(', ') || 'Property',
    assignedTo: p.access_group_id ? groupEmailById.get(p.access_group_id) ?? 'another landlord' : null,
  }))

  return (
    <main style={{ padding: '24px', background: 'var(--bg)', minHeight: '100vh' }}>
      <div style={{ maxWidth: '760px', margin: '0 auto' }}>
        <Link
          href="/"
          style={{ display: 'inline-block', marginBottom: '20px', textDecoration: 'none', color: 'var(--purple)', fontWeight: 600 }}
        >
          ← Back
        </Link>

        <div
          style={{
            background: '#fff',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius)',
            padding: '24px',
            boxShadow: 'var(--shadow)',
            marginBottom: '24px',
          }}
        >
          <h1 style={{ marginTop: 0, marginBottom: '8px' }}>Create app user</h1>
          <p style={{ color: 'var(--text-muted)', marginBottom: '24px' }}>
            Create a login for the Rose Legacy mobile app. Technicians/managers see everything; a landlord
            sees only the properties you assign them (plus their tickets and invoices).
          </p>
          <UserForm properties={propertyOptions} />
        </div>

        <div
          style={{
            background: '#fff',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius)',
            padding: '24px',
            boxShadow: 'var(--shadow)',
          }}
        >
          <h2 style={{ marginTop: 0, marginBottom: '16px', fontSize: '18px' }}>Existing users ({appUsers.length})</h2>
          {appUsers.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', margin: 0 }}>No app users yet.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {appUsers.map((u) => {
                const propCount = u.access_group_id ? propsByGroup.get(u.access_group_id) ?? 0 : 0
                return (
                  <div
                    key={u.user_id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '12px',
                      border: '1px solid var(--border)',
                      borderRadius: '12px',
                      padding: '12px 14px',
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 700, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {emailById.get(u.user_id) ?? u.user_id}
                      </div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '2px' }}>
                        <span
                          style={{
                            display: 'inline-block',
                            background: 'var(--purple-soft)',
                            color: 'var(--purple)',
                            fontWeight: 700,
                            fontSize: '11px',
                            padding: '2px 8px',
                            borderRadius: '999px',
                            marginRight: '8px',
                            textTransform: 'capitalize',
                          }}
                        >
                          {u.role === 'technician' ? 'Manager' : u.role}
                        </span>
                        {u.role === 'landlord'
                          ? `${propCount} ${propCount === 1 ? 'property' : 'properties'}`
                          : 'Full access'}
                      </div>
                    </div>
                    <form action={deleteAppUser}>
                      <input type="hidden" name="user_id" value={u.user_id} />
                      <button
                        type="submit"
                        style={{
                          border: '1px solid var(--border)',
                          background: '#fff',
                          color: '#e5484d',
                          fontWeight: 700,
                          fontSize: '13px',
                          padding: '7px 12px',
                          borderRadius: '999px',
                          cursor: 'pointer',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        Remove
                      </button>
                    </form>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
