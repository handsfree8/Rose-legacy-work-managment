# Landlord Web Portal — Pay by Card (Stripe) Design

**Date:** 2026-06-27
**Status:** Approved (pending final spec review)

## Goal

Bring the same Stripe "Pay by card" capability the mobile app has to the **web landlord portal** (`rose-legacy-work-management` `/landlord/[token]`), so property managers and landlords working on a computer can pay an invoice by card directly in the browser. Clicking "Pay by card" generates a Stripe invoice (with the card-processing surcharge) and opens Stripe's hosted payment page in a new tab. The existing webhook marks the invoice `paid` automatically.

## Background & constraints

- The web landlord portal is **token-based** (no Supabase login): `/landlord/[token]` loads a property by its `landlord_token` and shows its tickets, photos, estimates and invoices. It already has a `ConsolidatedPaymentBanner` with a "Pay Now" that opens `payment_link` when one is already set.
- The Stripe logic already lives in the Supabase **Edge Function** `request-invoice-payment` (in the `rose-legacy-mobile` repo, deployed to project `wrlwhnjqnsfkpyihumqd`): it computes the surcharge, creates+finalizes a Stripe invoice, caches the hosted URL in `invoices.payment_link`, posts a Telegram alert, and is idempotent. A `stripe-webhook` function already flips `payment_status` to `paid` on `invoice.paid`.
- **Single source of truth:** reuse that Edge Function for the web too — do NOT add the Stripe SDK or `STRIPE_SECRET_KEY` to the web app. Switching to LIVE later changes one secret in Supabase only.
- Surcharge: `gross = (total + 0.30) / (1 - 0.029)`, fee = gross − total. Shown as a separate "Card processing fee" line in Stripe and disclosed in the UI.
- Stripe TEST mode for now.

## Architecture

```
Landlord (web, token-based) clicks "Pay by card"
        │  Next.js server action payByCard(invoiceId, token)
        ▼
Edge Function: request-invoice-payment   (verify_jwt = false; auth done inside)
  - authorize by EITHER a Supabase JWT (mobile) OR a landlord_token that owns
    the invoice's property (web)
  - mode 'open' (web): finalize the Stripe invoice, DO NOT email; return hosted_invoice_url
  - mode 'email' (mobile, default): finalize + sendInvoice (Stripe emails it)
  - always: surcharge, cache payment_link, Telegram alert, idempotent reuse
        ▼
Server action returns { url }  →  client opens it in a new tab
        ▼
Landlord pays on Stripe's hosted page → stripe-webhook sets payment_status='paid'
        ▼
Portal shows Paid on refresh (web + mobile in sync)
```

## Components

### 1. Edge Function refactor (`rose-legacy-mobile/supabase/functions/request-invoice-payment`)
- Input: `{ invoice_id, token?, mode? }` where `mode` ∈ `'email' | 'open'` (default `'email'`).
- **Auth:** if `token` is provided, load the invoice's `property_id` → property and require `property.landlord_token === token`; else fall back to the existing JWT `getUser()` path. Reject (401) if neither authorizes.
- **Customer email:** JWT path uses the caller's email (today's behavior). Token path uses the property's landlord email if available (`access_groups.email` via the property's `access_group_id`), otherwise creates the Stripe customer without an email (fine for `mode: 'open'`).
- **mode:** `'email'` → `finalizeInvoice` + `sendInvoice` (current behavior). `'open'` → `finalizeInvoice` only (no email), return `hosted_invoice_url`.
- Keep: surcharge math, idempotency (reuse existing `payment_link`), `payment_link` caching, Telegram alert.
- Redeploy with `--no-verify-jwt` (auth is enforced inside).

### 2. Web server action (`app/landlord/[token]/payment-actions.ts`, new)
- `payByCard(invoiceId: string, token: string): Promise<{ url?: string; error?: string }>` — server-side; calls the Edge Function URL (`${NEXT_PUBLIC_SUPABASE_URL}/functions/v1/request-invoice-payment`) with the publishable key as `apikey` header and body `{ invoice_id, token, mode: 'open' }`; returns the `url`.

### 3. Web UI
- A small client component `PayByCardButton` (`'use client'`) rendered on each unpaid invoice in the landlord portal (and wired into the existing `ConsolidatedPaymentBanner` "Pay Now"): green button + the surcharge disclosure ("Paying by card adds a $X.XX processing fee — total $Y.YY"). On click → `payByCard` → `window.open(url, '_blank')`. Hidden when the invoice is already `paid`/`consolidated`.

## Error handling
- Edge Function error (bad token, Stripe failure) → server action returns a readable `error`; the button shows it inline; nothing is marked paid.
- Idempotent: re-clicking reuses the cached `payment_link` (no duplicate Stripe invoices).
- The webhook is the only thing that sets `paid`; the web never sets it directly.

## Testing
- **Edge Function:** call with a valid `landlord_token` + `mode:'open'` → returns a hosted URL; with a wrong token → 401. Confirm the mobile (`mode:'email'`) path still works.
- **Web:** open a real `/landlord/<token>` page, click "Pay by card" on an unpaid invoice → Stripe page opens with total + processing fee → pay with `4242 4242 4242 4242` → after the webhook, the invoice shows Paid on refresh.

## Out of scope (later)
- LIVE Stripe keys + LIVE webhook (swap secrets when ready).
- Replacing the manual "Add Pay Link" admin flow.
- Receipts/refunds beyond what Stripe provides.
