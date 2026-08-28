'use server'

import { revalidatePath } from 'next/cache'
import { supabaseAdmin as supabase } from '@/lib/supabase/admin'

export async function replyToTenant(formData: FormData) {
  const tenant_id = String(formData.get('tenant_id') || '').trim()
  const body      = String(formData.get('body') || '').trim()

  if (!tenant_id || !body) throw new Error('Missing fields.')
  if (body.length > 4000) throw new Error('Message too long.')

  // Verify tenant exists and is active
  const { data: tenant } = await supabase
    .from('tenants')
    .select('id')
    .eq('id', tenant_id)
    .eq('active', true)
    .maybeSingle()

  if (!tenant) throw new Error('Tenant not found.')

  const { error } = await supabase.from('tenant_messages').insert({
    tenant_id,
    sender: 'manager',
    body,
  })

  if (error) throw new Error(error.message)

  revalidatePath('/tenants')
}

// Placeholder — link copying is handled client-side
export async function copyTenantLink() {}
