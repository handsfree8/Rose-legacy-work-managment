'use server'

import { revalidatePath } from 'next/cache'
import { supabaseAdmin as supabase } from '@/lib/supabase/admin'

export type CreateUserResult = { ok: true } | { ok: false; error: string }

async function generateUniqueAccessCode(): Promise<string> {
  for (let i = 0; i < 10; i++) {
    const code = String(Math.floor(100000 + Math.random() * 900000))
    const { data } = await supabase.from('access_groups').select('id').eq('access_code', code).maybeSingle()
    if (!data) return code
  }
  throw new Error('Could not generate a unique access code')
}

// Undo a landlord's group: detach its properties, then delete the group.
async function rollbackGroup(accessGroupId: string) {
  await supabase.from('properties').update({ access_group_id: null }).eq('access_group_id', accessGroupId)
  await supabase.from('access_groups').delete().eq('id', accessGroupId)
}

export async function createAppUser(formData: FormData): Promise<CreateUserResult> {
  const email = formData.get('email')?.toString().trim().toLowerCase() || ''
  const password = formData.get('password')?.toString() || ''
  const role = formData.get('role')?.toString() || ''
  const propertyIds = formData.getAll('property_ids').map((v) => v.toString()).filter(Boolean)

  if (!email || !password) return { ok: false, error: 'Email and password are required.' }
  if (password.length < 6) return { ok: false, error: 'Password must be at least 6 characters.' }
  if (role !== 'technician' && role !== 'landlord') return { ok: false, error: 'Pick a role.' }
  if (role === 'landlord' && propertyIds.length === 0) {
    return { ok: false, error: 'Select at least one existing property for the landlord.' }
  }

  let accessGroupId: string | null = null

  // For a landlord, create a private access group and attach the chosen
  // properties to it. The mobile app scopes the landlord to this group.
  if (role === 'landlord') {
    let accessCode: string
    try {
      accessCode = await generateUniqueAccessCode()
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : 'Could not generate access code.' }
    }

    const { data: group, error: groupErr } = await supabase
      .from('access_groups')
      .insert({ name: email, landlord_name: email, email, access_code: accessCode })
      .select('id')
      .single()
    if (groupErr || !group) return { ok: false, error: groupErr?.message ?? 'Could not create access group.' }
    accessGroupId = group.id

    const { error: assignErr } = await supabase
      .from('properties')
      .update({ access_group_id: group.id })
      .in('id', propertyIds)
    if (assignErr) {
      await rollbackGroup(group.id)
      return { ok: false, error: assignErr.message }
    }
  }

  // Create the auth user, pre-confirmed so they can sign into the mobile app now.
  const { data: created, error: authErr } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })
  if (authErr || !created?.user) {
    if (accessGroupId) await rollbackGroup(accessGroupId)
    return { ok: false, error: authErr?.message ?? 'Could not create the account.' }
  }

  const { error: mapErr } = await supabase.from('app_users').insert({
    user_id: created.user.id,
    role,
    access_group_id: accessGroupId,
  })
  if (mapErr) {
    await supabase.auth.admin.deleteUser(created.user.id)
    if (accessGroupId) await rollbackGroup(accessGroupId)
    return { ok: false, error: mapErr.message }
  }

  revalidatePath('/users')
  return { ok: true }
}

export async function deleteAppUser(formData: FormData): Promise<void> {
  const userId = formData.get('user_id')?.toString() || ''
  if (!userId) return

  // If the user is a landlord, detach + delete their private access group so
  // its properties become free to reassign.
  const { data: row } = await supabase
    .from('app_users')
    .select('access_group_id')
    .eq('user_id', userId)
    .maybeSingle()
  if (row?.access_group_id) await rollbackGroup(row.access_group_id)

  // Deleting the auth user cascades to the app_users row (FK on delete cascade).
  await supabase.auth.admin.deleteUser(userId)
  revalidatePath('/users')
}
