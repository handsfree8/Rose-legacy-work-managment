'use server'

export async function payByCard(
  invoiceId: string,
  token: string
): Promise<{ url?: string; error?: string }> {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anon = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY
  if (!base || !anon) return { error: 'Server not configured' }

  try {
    const res = await fetch(`${base}/functions/v1/request-invoice-payment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: anon },
      body: JSON.stringify({ invoice_id: invoiceId, token, mode: 'open' }),
    })
    const data = (await res.json()) as { url?: string; error?: string }
    if (!res.ok || !data.url) return { error: data.error ?? 'Could not start the payment.' }
    return { url: data.url }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Network error' }
  }
}
