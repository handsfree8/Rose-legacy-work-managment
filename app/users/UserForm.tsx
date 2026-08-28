'use client'

import { useActionState, useState } from 'react'
import { createAppUser, type CreateUserResult } from './actions'

type PropertyOption = { id: string; label: string; assignedTo: string | null }

export default function UserForm({ properties }: { properties: PropertyOption[] }) {
  const [role, setRole] = useState<'technician' | 'landlord' | 'tenant'>('technician')
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const [state, formAction, pending] = useActionState<CreateUserResult | null, FormData>(
    async (_prev, formData) => createAppUser(formData),
    null
  )

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const noProperties = properties.length === 0
  const landlordBlocked = role === 'landlord' && (noProperties || selected.size === 0)
  const tenantBlocked   = role === 'tenant'   && (noProperties || selected.size === 0)

  const label: React.CSSProperties = {
    display: 'block',
    fontSize: '13px',
    fontWeight: 700,
    color: 'var(--text-muted)',
    marginBottom: '6px',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
  }
  const input: React.CSSProperties = {
    width: '100%',
    border: '1px solid var(--border)',
    borderRadius: '10px',
    padding: '11px 12px',
    fontSize: '15px',
    background: '#fff',
    marginBottom: '18px',
  }

  return (
    <form action={formAction}>
      {/* Email + password — only for non-tenant roles */}
      {role !== 'tenant' && (
        <>
          <label style={label}>Email</label>
          <input style={input} type="email" name="email" placeholder="person@example.com" required autoComplete="off" />

          <label style={label}>Temporary password</label>
          <input style={input} type="text" name="password" placeholder="At least 6 characters" required minLength={6} autoComplete="off" />
        </>
      )}

      <label style={label}>Role</label>
      <div style={{ display: 'flex', gap: '10px', marginBottom: '18px' }}>
        {(['technician', 'landlord', 'tenant'] as const).map((r) => {
          const active = role === r
          return (
            <label
              key={r}
              style={{
                flex: 1,
                cursor: 'pointer',
                border: `1.5px solid ${active ? 'var(--purple)' : 'var(--border)'}`,
                background: active ? 'var(--purple-soft)' : '#fff',
                borderRadius: '10px',
                padding: '12px',
                textAlign: 'center',
                fontWeight: 700,
                color: active ? 'var(--purple)' : 'var(--text)',
              }}
            >
              <input
                type="radio"
                name="role"
                value={r}
                checked={active}
                onChange={() => setRole(r)}
                style={{ display: 'none' }}
              />
              {r === 'technician' ? 'Technician / Manager' : r === 'landlord' ? 'Landlord' : 'Tenant'}
            </label>
          )
        })}
      </div>

      {/* Tenant-specific fields */}
      {role === 'tenant' && (
        <div style={{ marginBottom: '18px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#15803d', fontWeight: 600 }}>
            Tenants access their portal via a private link — no password needed.
          </div>
          <div>
            <label style={label}>Full name</label>
            <input style={{ ...input, marginBottom: 0 }} type="text" name="tenant_name" placeholder="Maria Garcia" required />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={label}>Unit</label>
              <input style={{ ...input, marginBottom: 0 }} type="text" name="tenant_unit" placeholder="Unit B" />
            </div>
            <div>
              <label style={label}>Monthly rent ($)</label>
              <input style={{ ...input, marginBottom: 0 }} type="number" name="tenant_rent" placeholder="1650" min="0" step="0.01" required />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={label}>Lease start</label>
              <input style={{ ...input, marginBottom: 0 }} type="date" name="tenant_lease_start" />
            </div>
            <div>
              <label style={label}>Lease end</label>
              <input style={{ ...input, marginBottom: 0 }} type="date" name="tenant_lease_end" />
            </div>
          </div>
          <div>
            <label style={label}>Assign to property</label>
            {noProperties ? (
              <p style={{ color: '#b0851f', fontWeight: 600, margin: 0, background: '#fdf3e3', borderRadius: 10, padding: 12 }}>
                No properties exist yet. Create one first.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {properties.map((p) => {
                  const checked = selected.has(p.id)
                  return (
                    <label key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', border: `1.5px solid ${checked ? 'var(--purple)' : 'var(--border)'}`, background: checked ? 'var(--purple-soft)' : '#fff', borderRadius: 10, padding: '11px 12px' }}>
                      <input type="radio" name="property_ids" value={p.id} checked={checked} onChange={() => setSelected(new Set([p.id]))} />
                      <span style={{ fontWeight: 700, color: 'var(--text)' }}>{p.label}</span>
                    </label>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {role === 'landlord' && (
        <div style={{ marginBottom: '18px' }}>
          <label style={label}>Assign properties</label>
          {noProperties ? (
            <p style={{ color: '#b0851f', fontWeight: 600, margin: 0, background: '#fdf3e3', borderRadius: '10px', padding: '12px' }}>
              No properties exist yet. Create a property first, then you can assign a landlord to it.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {properties.map((p) => {
                const checked = selected.has(p.id)
                return (
                  <label
                    key={p.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      cursor: 'pointer',
                      border: `1.5px solid ${checked ? 'var(--purple)' : 'var(--border)'}`,
                      background: checked ? 'var(--purple-soft)' : '#fff',
                      borderRadius: '10px',
                      padding: '11px 12px',
                    }}
                  >
                    <input
                      type="checkbox"
                      name="property_ids"
                      value={p.id}
                      checked={checked}
                      onChange={() => toggle(p.id)}
                    />
                    <span style={{ flex: 1 }}>
                      <span style={{ fontWeight: 700, color: 'var(--text)' }}>{p.label}</span>
                      {p.assignedTo ? (
                        <span style={{ color: '#b0851f', fontSize: '12px', marginLeft: '8px' }}>
                          (currently: {p.assignedTo})
                        </span>
                      ) : null}
                    </span>
                  </label>
                )
              })}
            </div>
          )}
        </div>
      )}

      {state && !state.ok && (
        <p style={{ color: '#e5484d', fontWeight: 600, marginTop: 0, marginBottom: '16px' }}>{state.error}</p>
      )}
      {state && state.ok && 'portalUrl' in state && (
        <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: '12px 14px', marginBottom: 16 }}>
          <div style={{ fontWeight: 700, color: '#15803d', marginBottom: 6 }}>✓ Tenant created!</div>
          <div style={{ fontSize: 12, color: '#166534', marginBottom: 8 }}>Share this private link with the tenant:</div>
          <div style={{ background: '#fff', border: '1px solid #bbf7d0', borderRadius: 8, padding: '8px 12px', fontFamily: 'monospace', fontSize: 12, wordBreak: 'break-all', color: '#1a1330' }}>
            {state.portalUrl}
          </div>
        </div>
      )}
      {state && state.ok && !('portalUrl' in state) && (
        <p style={{ color: '#2f9e44', fontWeight: 600, marginTop: 0, marginBottom: '16px' }}>
          ✓ Account created. They can now sign in to the mobile app.
        </p>
      )}

      <button
        type="submit"
        disabled={pending || landlordBlocked || tenantBlocked}
        style={{
          width: '100%',
          background: 'var(--purple)',
          color: '#fff',
          fontWeight: 800,
          fontSize: '15px',
          padding: '13px',
          border: 'none',
          borderRadius: '10px',
          cursor: pending || landlordBlocked ? 'default' : 'pointer',
          opacity: pending || landlordBlocked || tenantBlocked ? 0.55 : 1,
        }}
      >
        {pending ? 'Creating…' : 'Create account'}
      </button>
    </form>
  )
}
