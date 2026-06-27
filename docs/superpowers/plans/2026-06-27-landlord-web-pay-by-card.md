# Landlord Web Pay by Card (Stripe) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "Pay by card" button to the web landlord portal that generates a Stripe invoice (with surcharge) via the existing Edge Function and opens Stripe's hosted payment page in a new tab; the existing webhook marks it paid.

**Architecture:** Reuse the Supabase Edge Function `request-invoice-payment` (in the rose-legacy-mobile repo) as the single Stripe brain, refactored to authorize by a landlord token (web) in addition to a JWT (mobile) and to support a `mode: 'open'` that returns the hosted payment URL without emailing. The web app (rose-legacy-work-management) calls it from a token-gated server action and opens the returned URL.

**Tech Stack:** Supabase Edge Function (Deno, npm:stripe), Next.js 16 server actions + client components, existing landlord-token portal.

## Global Constraints

- Edge Function lives in `/Users/roselegacyhomesolutions/Desktop/rose-legacy-mobile/supabase/functions/request-invoice-payment` and deploys to Supabase project `wrlwhnjqnsfkpyihumqd`. Web app is `/Users/roselegacyhomesolutions/Desktop/rose-legacy-work-management`.
- No Stripe SDK or `STRIPE_SECRET_KEY` in the web app — Stripe stays only in the Edge Function (one place to swap for LIVE).
- Surcharge: `gross = (total + 0.30) / (1 - 0.029)`, `fee = gross - total`, rounded to cents. Disclosed in the UI; shown as a "Card processing fee" line in Stripe.
- Web env: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY` (publishable/anon key).
- Edge Function endpoint: `${NEXT_PUBLIC_SUPABASE_URL}/functions/v1/request-invoice-payment`.
- Token auth: the provided `token` must equal `properties.landlord_token` of the invoice's property.
- "Pay by card" shows only for invoices whose `payment_status` is `pending` or `overdue` (never `paid`/`consolidated`).
- Stripe TEST mode for now.

---

### Task 1: Edge Function — token auth + `mode` (mobile repo)

**Files:**
- Modify: `/Users/roselegacyhomesolutions/Desktop/rose-legacy-mobile/supabase/functions/request-invoice-payment/index.ts`

**Interfaces:**
- Produces: the function now accepts `{ invoice_id, token?, mode? }` (`mode` ∈ `'email' | 'open'`, default `'email'`) and authorizes by JWT or landlord token. `mode: 'open'` returns `{ sent: true, url }` without emailing.

- [ ] **Step 1: Replace the auth + invoice-load + email block**

Open the file and replace the section that starts at the auth resolution (`const authHeader = ...` / `getUser`) through the end of the Stripe send, with this. Keep the imports, `stripe`, `FEE_*`, `surcharge`, `json`, `notifyTelegram`, and the OPTIONS handler exactly as they are.

```typescript
    const { invoice_id, token, mode } = await req.json()
    if (!invoice_id) return json({ error: 'invoice_id is required' }, 400)
    const deliver = mode === 'open' ? 'open' : 'email'

    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

    const { data: inv, error } = await admin
      .from('invoices')
      .select('id, invoice_number, total, payment_status, payment_link, property_id')
      .eq('id', invoice_id)
      .maybeSingle()
    if (error || !inv) return json({ error: 'Invoice not found' }, 404)
    if (inv.payment_status === 'paid') return json({ error: 'Invoice is already paid' }, 409)

    // Authorize: a landlord token that owns the invoice's property, OR a JWT user.
    let email: string | null = null
    if (token) {
      const { data: prop } = await admin
        .from('properties')
        .select('landlord_token, access_group_id')
        .eq('id', inv.property_id)
        .maybeSingle()
      if (!prop || prop.landlord_token !== token) return json({ error: 'Not authorized' }, 401)
      if (prop.access_group_id) {
        const { data: grp } = await admin
          .from('access_groups')
          .select('email')
          .eq('id', prop.access_group_id)
          .maybeSingle()
        email = grp?.email ?? null
      }
    } else {
      const authHeader = req.headers.get('Authorization') ?? ''
      const userClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
        global: { headers: { Authorization: authHeader } },
      })
      const { data: userData } = await userClient.auth.getUser()
      email = userData.user?.email ?? null
      if (!email) return json({ error: 'Not authenticated' }, 401)
    }

    // Idempotent: reuse an existing payment link.
    if (inv.payment_link) return json({ sent: true, url: inv.payment_link, reused: true }, 200)

    const total = Number(inv.total) || 0
    const { fee } = surcharge(total)

    // Reuse a Stripe customer per email when we have one, else create a nameless customer.
    let customerId: string
    if (email) {
      const existing = await stripe.customers.list({ email, limit: 1 })
      customerId = existing.data[0]?.id ?? (await stripe.customers.create({ email })).id
    } else {
      customerId = (await stripe.customers.create({ name: `Invoice ${inv.invoice_number ?? inv.id}` })).id
    }

    const invoice = await stripe.invoices.create({
      customer: customerId,
      collection_method: 'send_invoice',
      days_until_due: 30,
      metadata: { invoice_id: String(invoice_id) },
    })
    await stripe.invoiceItems.create({
      customer: customerId,
      invoice: invoice.id,
      currency: 'usd',
      amount: Math.round(total * 100),
      description: `Invoice ${inv.invoice_number ?? inv.id}`,
    })
    if (fee > 0) {
      await stripe.invoiceItems.create({
        customer: customerId,
        invoice: invoice.id,
        currency: 'usd',
        amount: Math.round(fee * 100),
        description: 'Card processing fee',
      })
    }
    const finalized = await stripe.invoices.finalizeInvoice(invoice.id)
    if (deliver === 'email') await stripe.invoices.sendInvoice(invoice.id)

    if (finalized.hosted_invoice_url) {
      await admin.from('invoices').update({ payment_link: finalized.hosted_invoice_url }).eq('id', invoice_id)
    }

    await notifyTelegram(
      `💳 ${email ?? 'A landlord'} requested to pay invoice #${inv.invoice_number ?? inv.id} — $${total.toFixed(2)}`
    )

    return json({ sent: true, url: finalized.hosted_invoice_url ?? inv.payment_link ?? null }, 200)
```

- [ ] **Step 2: Redeploy without JWT verification (auth is enforced inside)**

```bash
cd /Users/roselegacyhomesolutions/Desktop/rose-legacy-mobile
npx supabase functions deploy request-invoice-payment --no-verify-jwt
```

Expected: "Deployed Functions."

- [ ] **Step 3: Smoke-test both paths**

Token path (replace with a real `landlord_token` and a pending invoice id for that property):

```bash
curl -s -X POST 'https://wrlwhnjqnsfkpyihumqd.supabase.co/functions/v1/request-invoice-payment' \
  -H 'Content-Type: application/json' \
  -d '{"invoice_id":"<pending-uuid>","token":"<landlord_token>","mode":"open"}'
```

Expected: `{ "sent": true, "url": "https://invoice.stripe.com/..." }`. A wrong token returns `{ "error": "Not authorized" }` (401). Confirm the mobile app's "Pay by card" (JWT, email mode) still works.

- [ ] **Step 4: Commit (mobile repo)**

```bash
cd /Users/roselegacyhomesolutions/Desktop/rose-legacy-mobile
git add supabase/functions/request-invoice-payment/index.ts
git commit -m "feat: request-invoice-payment accepts landlord token + open mode (web reuse)"
git push origin main
```

---

### Task 2: Web surcharge helper + server action

**Files:**
- Create: `/Users/roselegacyhomesolutions/Desktop/rose-legacy-work-management/app/landlord/[token]/payment-actions.ts`
- Create: `/Users/roselegacyhomesolutions/Desktop/rose-legacy-work-management/lib/surcharge.ts`

**Interfaces:**
- Produces: `surcharge(total: number): { gross: number; fee: number }` (display) and `payByCard(invoiceId: string, token: string): Promise<{ url?: string; error?: string }>` (server action). Consumed by Task 3.

- [ ] **Step 1: Surcharge helper (mirrors the Edge Function)**

```typescript
// lib/surcharge.ts
export function surcharge(total: number): { gross: number; fee: number } {
  const t = Number(total) || 0
  if (t <= 0) return { gross: 0, fee: 0 }
  const gross = Math.round(((t + 0.3) / (1 - 0.029)) * 100) / 100
  const fee = Math.round((gross - t) * 100) / 100
  return { gross, fee }
}
```

- [ ] **Step 2: Server action that calls the Edge Function**

```typescript
// app/landlord/[token]/payment-actions.ts
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
```

- [ ] **Step 3: Type-check**

Run: `cd /Users/roselegacyhomesolutions/Desktop/rose-legacy-work-management && npx tsc --noEmit`
Expected: clean (no errors from these two files).

- [ ] **Step 4: Commit**

```bash
git add lib/surcharge.ts app/landlord/[token]/payment-actions.ts
git commit -m "feat: web surcharge helper + payByCard server action (calls edge fn)"
```

---

### Task 3: `PayByCardButton` component + wire into the portal

**Files:**
- Create: `/Users/roselegacyhomesolutions/Desktop/rose-legacy-work-management/app/landlord/[token]/PayByCardButton.tsx`
- Modify: `app/landlord/[token]/LandlordTicketCard.tsx` (render the button on unpaid per-ticket invoices)
- Modify: `app/landlord/[token]/ConsolidatedPaymentBanner.tsx` (offer it when an unpaid consolidated invoice has no payment link)

**Interfaces:**
- Consumes: `payByCard` (Task 2), `surcharge` (Task 2).
- Produces: `<PayByCardButton invoiceId total token />` client component.

- [ ] **Step 1: The button component**

```tsx
// app/landlord/[token]/PayByCardButton.tsx
'use client'

import { useState } from 'react'
import { payByCard } from './payment-actions'
import { surcharge } from '@/lib/surcharge'

export default function PayByCardButton({
  invoiceId,
  total,
  token,
}: {
  invoiceId: string
  total: number
  token: string
}) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { gross, fee } = surcharge(total)

  async function onClick() {
    setBusy(true)
    setError(null)
    const result = await payByCard(invoiceId, token)
    setBusy(false)
    if (result.error) {
      setError(result.error)
      return
    }
    if (result.url) window.open(result.url, '_blank', 'noopener,noreferrer')
  }

  return (
    <div style={{ marginTop: '10px' }}>
      <div style={{ fontSize: '12px', color: '#9c6a16', background: '#fdf3e3', borderRadius: '8px', padding: '8px 10px', marginBottom: '8px' }}>
        Paying by credit/debit card adds a ${fee.toFixed(2)} processing fee (total ${gross.toFixed(2)}).
      </div>
      <button
        type="button"
        onClick={onClick}
        disabled={busy}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: '8px',
          background: '#2f9e44', color: '#fff', border: 'none', borderRadius: '10px',
          padding: '11px 18px', fontWeight: 700, fontSize: '14px', cursor: busy ? 'default' : 'pointer',
          opacity: busy ? 0.7 : 1,
        }}
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/></svg>
        {busy ? 'Opening…' : 'Pay by card'}
      </button>
      {error ? <div style={{ color: '#cf1322', fontSize: '13px', marginTop: '6px', fontWeight: 600 }}>{error}</div> : null}
    </div>
  )
}
```

- [ ] **Step 2: Render on unpaid per-ticket invoices in `LandlordTicketCard.tsx`**

The card already renders `<InvoicePreview invoice={invoice} .../>` for non-consolidated invoices (around line 186). Import the button at the top:

```tsx
import PayByCardButton from './PayByCardButton'
```

The component's props type already carries `invoice`; add a `token: string` prop to `LandlordTicketCardProps` and thread it from the parent (the portal page passes `token` to each card — wire that in Task 4). Then, right after the `<InvoicePreview .../>` element, add:

```tsx
{invoice && invoice.payment_status !== 'consolidated' && invoice.payment_status !== 'paid' && (
  <PayByCardButton invoiceId={invoice.id} total={Number(invoice.total)} token={token} />
)}
```

- [ ] **Step 3: Offer it for unpaid consolidated invoices in `ConsolidatedPaymentBanner.tsx`**

In the `request` variant, the "Pay Now" anchor only renders `{inv.payment_link && !isPaid && (...)}` (around line 390). Add a fallback when there is no link yet. Import the button (`import PayByCardButton from './PayByCardButton'`), ensure the component receives the portal `token` (add `token: string` to its `Props` and pass it from Task 4), and render right after the existing Pay Now block:

```tsx
{!inv.payment_link && !isPaid && (
  <PayByCardButton invoiceId={inv.id} total={Number(inv.total)} token={token} />
)}
```

- [ ] **Step 4: Type-check**

Run: `npx tsc --noEmit`
Expected: errors only about the missing `token` prop wiring, which Task 4 resolves. (If you implement Task 4 immediately after, run tsc once at the end of Task 4 for a clean result.)

- [ ] **Step 5: Commit**

```bash
git add app/landlord/[token]/PayByCardButton.tsx app/landlord/[token]/LandlordTicketCard.tsx app/landlord/[token]/ConsolidatedPaymentBanner.tsx
git commit -m "feat: PayByCardButton on landlord portal invoices"
```

---

### Task 4: Thread the portal token through to the buttons

**Files:**
- Modify: `app/landlord/[token]/page.tsx` (pass `token` to each `LandlordTicketCard` and to `ConsolidatedPaymentBanner`)
- Modify: `app/landlord/[token]/LandlordTicketCard.tsx` (accept `token` prop — already used in Task 3)
- Modify: `app/landlord/[token]/ConsolidatedPaymentBanner.tsx` (accept `token` prop — already used in Task 3)

**Interfaces:**
- Consumes: the route's `token` (already destructured in `page.tsx` as `const { token } = await params`).

- [ ] **Step 1: Pass `token` from the page**

In `app/landlord/[token]/page.tsx`, find where `<LandlordTicketCard ... />` is rendered and add `token={token}` to its props. Find where `<ConsolidatedPaymentBanner ... />` is rendered and add `token={token}`.

- [ ] **Step 2: Accept the prop in both components**

In `LandlordTicketCard.tsx`, add `token: string` to its props type and destructure `token` in the component signature. In `ConsolidatedPaymentBanner.tsx`, add `token: string` to `Props` and destructure `token`.

- [ ] **Step 3: Type-check (now clean)**

Run: `cd /Users/roselegacyhomesolutions/Desktop/rose-legacy-work-management && npx tsc --noEmit`
Expected: clean.

- [ ] **Step 4: Lint the touched files**

Run: `npx eslint app/landlord/[token]`
Expected: no new errors from the added files.

- [ ] **Step 5: Commit**

```bash
git add app/landlord/[token]
git commit -m "feat: thread landlord token into Pay by card buttons"
```

---

### Task 5: Deploy + end-to-end verification (human-gated)

**Files:** none (deploy + manual test).

- [ ] **Step 1: Push the web app (Vercel auto-deploys master)**

```bash
cd /Users/roselegacyhomesolutions/Desktop/rose-legacy-work-management
git push origin master
```

- [ ] **Step 2: End-to-end test on the deployed portal**

Open a real landlord portal URL `https://rose-legacy-work-management.vercel.app/landlord/<landlord_token>` for a property that has a pending invoice. Click **Pay by card** on an unpaid invoice → confirm the disclosure shows the fee → a Stripe hosted payment page opens in a new tab with the total + "Card processing fee" → pay with `4242 4242 4242 4242`. After the webhook fires, refresh the portal → the invoice shows paid (and it shows paid in the mobile app too).

---

## Self-Review

**Spec coverage:**
- Reuse Edge Function as single Stripe brain, token auth + `mode:'open'` → Task 1. ✓
- Web server action calling the function → Task 2. ✓
- "Pay by card" button + surcharge disclosure on unpaid invoices, opens hosted page → Task 3. ✓
- Wire into existing portal (per-ticket invoices + consolidated banner) → Tasks 3–4. ✓
- Webhook marks paid (already exists) → verified in Task 5. ✓
- No Stripe SDK/secret in the web → only fetch to the function. ✓
- TEST mode → Task 5 uses 4242. ✓

**Placeholder scan:** No TBD/TODO; all code complete. Human deploy/test steps carry exact commands/URLs. ✓

**Type consistency:** `surcharge(total) → { gross, fee }` identical in the Edge Function (Task 1) and web helper (Task 2). `payByCard(invoiceId, token) → { url?, error? }` defined Task 2, used in Task 3. `PayByCardButton` props `{ invoiceId, total, token }` consistent across Tasks 3–4. `mode` values `'email' | 'open'` consistent. ✓

---

## Out of scope (later)
- LIVE Stripe keys + LIVE webhook.
- Replacing the manual "Add Pay Link" admin button.
- Per-landlord auth email lookup beyond `access_groups.email`.
