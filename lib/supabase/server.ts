import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

// Server-side Supabase client bound to the request cookies. Use this in Server
// Components and Server Actions to read the authenticated admin session.
export async function createServerSupabase() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Called from a Server Component where cookies are read-only.
            // The proxy refreshes the session, so this can be safely ignored.
          }
        },
      },
    }
  )
}
