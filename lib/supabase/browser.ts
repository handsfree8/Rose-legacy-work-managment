import { createBrowserClient } from '@supabase/ssr'

// Browser-side Supabase client. The session is persisted in cookies (not
// localStorage) so that Server Components, Server Actions, and the proxy can
// read it on the server.
export function createBrowserSupabase() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!
  )
}
