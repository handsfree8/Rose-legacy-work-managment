import 'server-only'
import { createClient } from '@supabase/supabase-js'

// Service-role Supabase client. Bypasses Row Level Security, so it must ONLY be
// used in server-side code (Server Components, Server Actions, Route Handlers)
// that is already gated by the admin login (see proxy.ts) or by an explicit
// authorization check (e.g. the landlord token check). NEVER import this from a
// 'use client' component — `server-only` will make the build fail if you do.
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: { persistSession: false, autoRefreshToken: false },
  }
)
