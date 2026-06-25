'use client'

import { useActionState, useState } from 'react'
import { createAppUser, type CreateUserResult } from './actions'

type PropertyOption = { id: string; label: string; assignedTo: string | null }

export default function UserForm({ properties }: { properties: PropertyOption[] }) {
  const [role, setRole] = useState<'technician' | 'landlord'>('technician')
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
      <label style={label}>Email</label>
      <input style={input} type="email" name="email" placeholder="person@example.com" required autoComplete="off" />

      <label style={label}>Temporary password</label>
      <input style={input} type="text" name="password" placeholder="At least 6 characters" required minLength={6} autoComplete="off" />

      <label style={label}>Role</label>
      <div style={{ display: 'flex', gap: '10px', marginBottom: '18px' }}>
        {(['technician', 'landlord'] as const).map((r) => {
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
              {r === 'technician' ? 'Technician / Manager' : 'Landlord'}
            </label>
          )
        })}
      </div>

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
      {state && state.ok && (
        <p style={{ color: '#2f9e44', fontWeight: 600, marginTop: 0, marginBottom: '16px' }}>
          ✓ Account created. They can now sign in to the mobile app.
        </p>
      )}

      <button
        type="submit"
        disabled={pending || landlordBlocked}
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
          opacity: pending || landlordBlocked ? 0.55 : 1,
        }}
      >
        {pending ? 'Creating…' : 'Create account'}
      </button>
    </form>
  )
}
