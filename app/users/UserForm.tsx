'use client'

import { useActionState, useState } from 'react'
import { createAppUser, type CreateUserResult } from './actions'

type AccessGroupOption = { id: string; label: string }

export default function UserForm({ accessGroups }: { accessGroups: AccessGroupOption[] }) {
  const [role, setRole] = useState<'technician' | 'landlord'>('technician')

  const [state, formAction, pending] = useActionState<CreateUserResult | null, FormData>(
    async (_prev, formData) => createAppUser(formData),
    null
  )

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
        <>
          <label style={label}>Access group (landlord&apos;s properties)</label>
          <select style={input} name="access_group_id" defaultValue="" required>
            <option value="" disabled>
              Select an access group…
            </option>
            {accessGroups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.label}
              </option>
            ))}
          </select>
        </>
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
        disabled={pending}
        style={{
          width: '100%',
          background: 'var(--purple)',
          color: '#fff',
          fontWeight: 800,
          fontSize: '15px',
          padding: '13px',
          border: 'none',
          borderRadius: '10px',
          cursor: pending ? 'default' : 'pointer',
          opacity: pending ? 0.7 : 1,
        }}
      >
        {pending ? 'Creating…' : 'Create account'}
      </button>
    </form>
  )
}
