'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createBrowserSupabase } from '@/lib/supabase/browser'

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  )
}

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const nextPath = searchParams.get('next') || '/'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const supabase = createBrowserSupabase()
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })

    if (signInError) {
      setError(signInError.message)
      setLoading(false)
      return
    }

    // Cookies are now set; navigate to the originally requested page.
    router.replace(nextPath)
    router.refresh()
  }

  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg, #f7f6fb)',
        padding: '24px',
      }}
    >
      <form
        onSubmit={handleSubmit}
        style={{
          width: '100%',
          maxWidth: '360px',
          background: '#fff',
          borderRadius: '16px',
          padding: '32px 28px',
          boxShadow: '0 20px 60px rgba(45,25,80,0.15)',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '4px' }}>
          <img
            src="/logo.png"
            alt="Rose Legacy"
            style={{ width: '56px', height: '56px', borderRadius: '12px', objectFit: 'cover' }}
          />
          <h1 style={{ margin: '12px 0 2px', fontSize: '22px', color: '#4a2080' }}>
            Rose Legacy Management
          </h1>
          <p style={{ margin: 0, color: '#74708a', fontSize: '13px' }}>
            Internal access — please sign in
          </p>
        </div>

        <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '13px', color: '#4a2080', fontWeight: 600 }}>
          Email
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
            style={inputStyle}
          />
        </label>

        <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '13px', color: '#4a2080', fontWeight: 600 }}>
          Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
            style={inputStyle}
          />
        </label>

        {error && (
          <p style={{ color: '#c0392b', fontSize: '13px', margin: 0 }}>{error}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          style={{
            marginTop: '6px',
            padding: '11px',
            borderRadius: '10px',
            border: 'none',
            background: '#4a2080',
            color: '#fff',
            fontSize: '15px',
            fontWeight: 600,
            cursor: loading ? 'wait' : 'pointer',
          }}
        >
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </main>
  )
}

const inputStyle: React.CSSProperties = {
  border: '1.5px solid #e4e1ee',
  borderRadius: '10px',
  padding: '10px 12px',
  fontSize: '15px',
  fontWeight: 400,
  color: '#1a1625',
}
