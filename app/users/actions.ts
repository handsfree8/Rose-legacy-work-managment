'use server'

import { revalidatePath } from 'next/cache'
import { supabaseAdmin as supabase } from '@/lib/supabase/admin'

export type CreateUserResult = { ok: true } | { ok: false; error: string }

export async function createAppUser(formData: FormData): Promise<CreateUserResult> {
  const email = formData.get('email')?.toString().trim().toLowerCase() || ''
  const password = formData.get('password')?.toString() || ''
  const role = formData.get('role')?.toString() || ''
  const accessGroupId = formData.get('access_group_id')?.toString() || ''

  if (!email || !password) return { ok: false, error: 'Email and password are required.' }
  if (password.length < 6) return { ok: false, error: 'Password must be at least 6 characters.' }
  if (role !== 'technician' && role !== 'landlord') return { ok: false, error: 'Pick a role.' }
  if (role === 'landlord' && !accessGroupId) {
    return { ok: false, error: 'Pick an access group for the landlord.' }
  }

  // 1. Create the auth user, pre-confirmed so they can log into the mobile app
  //    immediately without an email round-trip.
  const { data: created, error: authErr } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })
  if (authErr || !created?.user) {
    return { ok: false, error: authErr?.message ?? 'Could not create the account.' }
  }

  // 2. Map the new auth user to a role in app_users.
  const { error: mapErr } = await supabase.from('app_users').insert({
    user_id: created.user.id,
    role,
    access_group_id: role === 'landlord' ? accessGroupId : null,
  })
  if (mapErr) {
    // Roll back the auth user so we never leave an unmapped orphan account.
    await supabase.auth.admin.deleteUser(created.user.id)
    return { ok: false, error: mapErr.message }
  }

  revalidatePath('/users')
  return { ok: true }
}

export async function deleteAppUser(formData: FormData): Promise<void> {
  const userId = formData.get('user_id')?.toString() || ''
  if (!userId) return
  // Deleting the auth user cascades to the app_users row (FK on delete cascade).
  await supabase.auth.admin.deleteUser(userId)
  revalidatePath('/users')
}
