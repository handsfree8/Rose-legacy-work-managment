# Invoice Module Migration (invoice-2-0 → rose-legacy-work-management) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Retire the standalone `invoice-2-0` static app by rebuilding its functionality (invoices, estimates, KPI dashboard, consolidation, payment links) as native routes inside `rose-legacy-work-management` (Next.js 16 / App Router), so there is one app, one auth session, one deploy.

**Architecture:** Both apps already share the same Supabase project (`wrlwhnjqnsfkpyihumqd` — "Rose Legacy Managment") and the `invoices`/`invoice_items`/`estimates` tables already have `ticket_id`/`property_id` foreign keys into the tables `work-management` already owns. **No data migration is required.** This is a UI/logic port: take the behavior in `invoice-2-0/app.js` (1446 lines, vanilla JS) and `invoice-2-0/index.html` and re-implement it as React Server Components + Server Actions, following the patterns already used in `app/tickets/` and `app/properties/`. PDF generation reuses `jspdf`, already a dependency of `work-management` (`package.json`).

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript, Supabase JS v2 (`@supabase/supabase-js`, `@supabase/ssr`), `jspdf`, Tailwind v4.

## Global Constraints

- Do not modify the `invoices`, `invoice_items`, or `estimates` table schemas — they are already correct and already linked to `tickets`/`properties`. Reuse them as-is.
- No test runner exists in this repo today (confirmed: zero `*.test.*`/`*.spec.*` files, no vitest/jest in `package.json`). Do not introduce one mid-task. For pure calculation logic (totals, KPI aggregation) add `vitest` once, in Task 1, mirroring the "framework-free, testable in isolation" style already used in `lib/kpis.ts`. For Server Components/Actions that talk to Supabase, verification is manual (`npm run dev`, click through) — there is no existing pattern for mocking Supabase in this repo, so don't invent one.
- Keep `user_id` on `invoices` set to `auth.uid()` of the logged-in tech, matching current `invoice-2-0` behavior (`saveInvoiceToHistory`, `invoice-2-0/app.js:162-176`).
- Follow existing file conventions: route-colocated `actions.ts` for server actions (see `app/tickets/[id]/edit/actions.ts`), and a `page.tsx` per route doing the initial Supabase read server-side.
- Reference implementation for exact behavior to port: `invoice-2-0/app.js` and `invoice-2-0/index.html` (read the relevant function before writing its replacement — don't guess at edge cases already handled there, e.g. invoice-number auto-increment digit-parsing at `app.js:27-45`, or the update-vs-insert dedupe via `loadedInvoiceId` at `app.js:178-186`).

---

### Task 1: Pure invoice-math module + totals

**Files:**
- Create: `lib/invoice-math.ts`
- Create: `lib/invoice-math.test.ts`
- Modify: `package.json` (add `vitest` devDependency + `test` script)

**Interfaces:**
- Produces: `computeTotals(items: LineItem[], taxRate: number, discountRate: number): Totals` where `LineItem = { description: string; qty: number; price: number }` and `Totals = { sub: number; tax: number; disc: number; total: number }`.
- Produces: `nextInvoiceNumber(existingNumbers: string[]): string` — port of `fetchNextInvoiceNumber` (`invoice-2-0/app.js:27-45`): parse digits out of each existing number (ignore prefixes like `INV-`), take the numeric max, return `String(max + 1).padStart(6, '0')`; return `'000001'` if the list is empty.
- Later tasks (3, 4) import both functions from `lib/invoice-math.ts`.

- [ ] **Step 1: Install vitest**

```bash
cd ~/Desktop/rose-legacy-work-management
npm install -D vitest
```

Add to `package.json` `scripts`: `"test": "vitest run"`.

- [ ] **Step 2: Write the failing tests**

```typescript
// lib/invoice-math.test.ts
import { describe, it, expect } from 'vitest'
import { computeTotals, nextInvoiceNumber } from './invoice-math'

describe('computeTotals', () => {
  it('computes subtotal, tax, discount and total', () => {
    const items = [
      { description: 'Labor', qty: 2, price: 50 },
      { description: 'Parts', qty: 1, price: 30 },
    ]
    const result = computeTotals(items, 8, 10)
    expect(result.sub).toBe(130)
    expect(result.disc).toBeCloseTo(13)
    expect(result.tax).toBeCloseTo((130 - 13) * 0.08)
    expect(result.total).toBeCloseTo(130 - 13 + (130 - 13) * 0.08)
  })

  it('treats missing rates as zero', () => {
    const items = [{ description: 'Visit fee', qty: 1, price: 75 }]
    const result = computeTotals(items, 0, 0)
    expect(result).toEqual({ sub: 75, tax: 0, disc: 0, total: 75 })
  })
})

describe('nextInvoiceNumber', () => {
  it('returns 000001 when there is no history', () => {
    expect(nextInvoiceNumber([])).toBe('000001')
  })

  it('ignores prefixes and takes the numeric max + 1', () => {
    expect(nextInvoiceNumber(['000005', 'INV-000006', '000003'])).toBe('000007')
  })
})
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL — `lib/invoice-math.ts` does not exist yet.

- [ ] **Step 4: Implement**

```typescript
// lib/invoice-math.ts
export type LineItem = { description: string; qty: number; price: number }
export type Totals = { sub: number; tax: number; disc: number; total: number }

export function computeTotals(items: LineItem[], taxRate: number, discountRate: number): Totals {
  const sub = items.reduce((acc, item) => acc + Number(item.qty || 0) * Number(item.price || 0), 0)
  const disc = sub * (Number(discountRate || 0) / 100)
  const taxable = sub - disc
  const tax = taxable * (Number(taxRate || 0) / 100)
  const total = taxable + tax
  return { sub, tax, disc, total }
}

export function nextInvoiceNumber(existingNumbers: string[]): string {
  let max = 0
  for (const raw of existingNumbers) {
    const match = String(raw || '').match(/(\d+)/)
    if (match) max = Math.max(max, Number(match[1]))
  }
  return String(max + 1).padStart(6, '0')
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm test`
Expected: PASS — 4 tests green.

- [ ] **Step 6: Commit**

```bash
git add lib/invoice-math.ts lib/invoice-math.test.ts package.json package-lock.json
git commit -m "feat: add pure invoice totals + invoice-number math, ported from invoice-2-0"
```

---

### Task 2: Database types + read-side query helpers

**Files:**
- Create: `lib/invoices/types.ts`
- Create: `lib/invoices/queries.ts`

**Interfaces:**
- Consumes: shared `supabase` client from `lib/supabase.ts`.
- Produces: `type InvoiceRow` (matches the `invoices` table columns exactly — see below), `type InvoiceItemRow`, `type EstimateRow`.
- Produces: `getInvoiceWithItems(id: string): Promise<{ invoice: InvoiceRow; items: InvoiceItemRow[] } | null>`, `listInvoices(filters?: { clientName?: string; status?: string }): Promise<InvoiceRow[]>`. Task 5 (history list) and Task 6 (load-for-edit) consume these.

- [ ] **Step 1: Define types matching the live schema**

```typescript
// lib/invoices/types.ts
export type InvoiceRow = {
  id: string
  user_id: string | null
  invoice_number: string | null
  invoice_date: string | null
  client_name: string | null
  payment_method: string | null
  terms: string | null
  notes: string | null
  warranty_disclaimer: string | null
  tax_rate: number
  discount_rate: number
  subtotal: number
  tax_amount: number
  discount_amount: number
  total: number
  payment_link: string | null
  payment_status: 'pending' | 'paid' | 'overdue' | 'consolidated'
  property_id: string | null
  ticket_id: string | null
  consolidated_into: string | null
  created_at: string
  updated_at: string
}

export type InvoiceItemRow = {
  id: string
  invoice_id: string
  description: string
  qty: number
  unit_price: number
  line_total: number
  position: number
}

export type EstimateRow = {
  id: string
  ticket_id: string
  property_id: string
  description: string
  amount: number
  status: 'pending' | 'approved' | 'rejected'
  landlord_comment: string | null
  created_at: string
  decided_at: string | null
}
```

- [ ] **Step 2: Implement query helpers**

```typescript
// lib/invoices/queries.ts
import { supabase } from '@/lib/supabase'
import type { InvoiceRow, InvoiceItemRow } from './types'

export async function getInvoiceWithItems(
  id: string
): Promise<{ invoice: InvoiceRow; items: InvoiceItemRow[] } | null> {
  const { data: invoice, error: invErr } = await supabase
    .from('invoices')
    .select('*')
    .eq('id', id)
    .single()
  if (invErr || !invoice) return null

  const { data: items, error: itemsErr } = await supabase
    .from('invoice_items')
    .select('*')
    .eq('invoice_id', id)
    .order('position', { ascending: true })
  if (itemsErr) return null

  return { invoice: invoice as InvoiceRow, items: (items ?? []) as InvoiceItemRow[] }
}

export async function listInvoices(filters?: {
  clientName?: string
  status?: string
}): Promise<InvoiceRow[]> {
  let query = supabase.from('invoices').select('*').order('created_at', { ascending: false })
  if (filters?.clientName) query = query.ilike('client_name', `%${filters.clientName}%`)
  if (filters?.status) query = query.eq('payment_status', filters.status)
  const { data, error } = await query
  if (error) return []
  return data as InvoiceRow[]
}
```

- [ ] **Step 3: Verify against the live schema**

Run (read-only, confirms columns/types still match what's in production):

```bash
echo "verify columns manually against supabase list_tables output for public.invoices and public.invoice_items"
```

There is no automated check here — Supabase isn't mocked in this repo (see Global Constraints). Cross-check the field list above against the schema dump already captured for this plan; do not re-derive it from guesswork.

- [ ] **Step 4: Commit**

```bash
git add lib/invoices/types.ts lib/invoices/queries.ts
git commit -m "feat: add invoice/estimate types and read query helpers"
```

---

### Task 3: New-invoice route — form, line items, totals (no save yet)

**Files:**
- Create: `app/invoices/new/page.tsx`
- Create: `app/invoices/new/InvoiceForm.tsx`
- Create: `app/invoices/new/LineItemsTable.tsx`

**Interfaces:**
- Consumes: `computeTotals`, `nextInvoiceNumber` from `lib/invoice-math.ts` (Task 1); `listInvoices` from `lib/invoices/queries.ts` (Task 2, used server-side to compute the next invoice number from existing `invoice_number` values).
- Produces: `<InvoiceForm initialNumber={string} ticketContext={{ ticketId, propertyId, clientName, description } | null} />`, client component, holds line-item state and renders live totals. Task 4 (save action) wires its submit handler.

- [ ] **Step 1: Server page reads ticket context + computes next number**

```tsx
// app/invoices/new/page.tsx
import { supabase } from '@/lib/supabase'
import { listInvoices } from '@/lib/invoices/queries'
import { nextInvoiceNumber } from '@/lib/invoice-math'
import { InvoiceForm } from './InvoiceForm'

export default async function NewInvoicePage({
  searchParams,
}: {
  searchParams: Promise<{ ticket?: string }>
}) {
  const { ticket: ticketId } = await searchParams

  const invoices = await listInvoices()
  const initialNumber = nextInvoiceNumber(invoices.map((inv) => inv.invoice_number ?? ''))

  let ticketContext = null
  if (ticketId) {
    const { data: t } = await supabase
      .from('tickets')
      .select('id, title, unit_number, property_id, properties(name)')
      .eq('id', ticketId)
      .single()
    if (t) {
      const prop = Array.isArray(t.properties) ? t.properties[0] : t.properties
      ticketContext = {
        ticketId: t.id,
        propertyId: t.property_id,
        clientName: prop?.name ?? '',
        description: t.title + (t.unit_number ? ` (Unit ${t.unit_number})` : ''),
      }
    }
  }

  return <InvoiceForm initialNumber={initialNumber} ticketContext={ticketContext} />
}
```

- [ ] **Step 2: Line items table (client component)**

```tsx
// app/invoices/new/LineItemsTable.tsx
'use client'
import type { LineItem } from '@/lib/invoice-math'

export function LineItemsTable({
  items,
  onChange,
}: {
  items: LineItem[]
  onChange: (items: LineItem[]) => void
}) {
  function updateRow(index: number, patch: Partial<LineItem>) {
    onChange(items.map((it, i) => (i === index ? { ...it, ...patch } : it)))
  }
  function removeRow(index: number) {
    onChange(items.filter((_, i) => i !== index))
  }
  return (
    <table className="w-full">
      <thead>
        <tr>
          <th className="text-left">Description</th>
          <th>Qty</th>
          <th>Price</th>
          <th />
        </tr>
      </thead>
      <tbody>
        {items.map((item, i) => (
          <tr key={i}>
            <td>
              <input
                className="w-full"
                value={item.description}
                onChange={(e) => updateRow(i, { description: e.target.value })}
              />
            </td>
            <td>
              <input
                type="number"
                value={item.qty}
                onChange={(e) => updateRow(i, { qty: Number(e.target.value) })}
              />
            </td>
            <td>
              <input
                type="number"
                value={item.price}
                onChange={(e) => updateRow(i, { price: Number(e.target.value) })}
              />
            </td>
            <td>
              <button type="button" onClick={() => removeRow(i)}>
                Remove
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
```

- [ ] **Step 3: Form shell wiring totals live**

```tsx
// app/invoices/new/InvoiceForm.tsx
'use client'
import { useMemo, useState } from 'react'
import { computeTotals, type LineItem } from '@/lib/invoice-math'
import { LineItemsTable } from './LineItemsTable'

type TicketContext = {
  ticketId: string
  propertyId: string | null
  clientName: string
  description: string
} | null

export function InvoiceForm({
  initialNumber,
  ticketContext,
}: {
  initialNumber: string
  ticketContext: TicketContext
}) {
  const [number, setNumber] = useState(initialNumber)
  const [clientName, setClientName] = useState(ticketContext?.clientName ?? '')
  const [taxRate, setTaxRate] = useState(0)
  const [discountRate, setDiscountRate] = useState(0)
  const [items, setItems] = useState<LineItem[]>(
    ticketContext ? [{ description: ticketContext.description, qty: 1, price: 0 }] : []
  )

  const totals = useMemo(() => computeTotals(items, taxRate, discountRate), [items, taxRate, discountRate])

  return (
    <form>
      <input value={number} onChange={(e) => setNumber(e.target.value)} aria-label="Invoice number" />
      <input value={clientName} onChange={(e) => setClientName(e.target.value)} aria-label="Client name" />
      <LineItemsTable items={items} onChange={setItems} />
      <button type="button" onClick={() => setItems([...items, { description: '', qty: 1, price: 0 }])}>
        Add line
      </button>
      <input
        type="number"
        value={taxRate}
        onChange={(e) => setTaxRate(Number(e.target.value))}
        aria-label="Tax rate"
      />
      <input
        type="number"
        value={discountRate}
        onChange={(e) => setDiscountRate(Number(e.target.value))}
        aria-label="Discount rate"
      />
      <div>Subtotal: {totals.sub.toFixed(2)}</div>
      <div>Tax: {totals.tax.toFixed(2)}</div>
      <div>Discount: {totals.disc.toFixed(2)}</div>
      <div>Total: {totals.total.toFixed(2)}</div>
    </form>
  )
}
```

- [ ] **Step 4: Manual verification**

Run: `npm run dev`, open `http://localhost:3000/invoices/new?ticket=<a real ticket id from the tickets table>`.
Expected: form loads, client name + first line item are pre-filled from the ticket, adding/editing rows updates totals live.

- [ ] **Step 5: Commit**

```bash
git add app/invoices/new
git commit -m "feat: add new-invoice route with ticket prefill and live totals"
```

---

### Task 4: Save action — insert/update invoice + items (port of saveInvoiceToHistory)

**Files:**
- Create: `app/invoices/new/actions.ts`
- Modify: `app/invoices/new/InvoiceForm.tsx` (wire submit to the action)

**Interfaces:**
- Consumes: `InvoiceRow`, `InvoiceItemRow` types (Task 2); `computeTotals` (Task 1).
- Produces: `saveInvoice(input: SaveInvoiceInput): Promise<{ id: string } | { error: string }>` where `SaveInvoiceInput` carries everything the form holds plus optional `invoiceId` (update path) and optional `ticketId`/`propertyId`. Task 6 (load existing invoice for edit) and Task 9 (ticket page button) both call into this route.

- [ ] **Step 1: Server action — exact port of update-vs-insert logic**

Reference: `invoice-2-0/app.js:162-243` (`saveInvoiceToHistory`) — preserves: session-based auth check (not `getUser()`, which can silently fail on flaky connections per the comment at `app.js:166-168`), update-in-place when `invoiceId` is already known, otherwise insert + insert items.

```typescript
// app/invoices/new/actions.ts
'use server'
import { supabase } from '@/lib/supabase'
import { computeTotals, type LineItem } from '@/lib/invoice-math'

export type SaveInvoiceInput = {
  invoiceId?: string
  number: string
  date: string
  clientName: string
  paymentMethod: string
  terms: string
  notes: string
  warrantyDisclaimer: string
  taxRate: number
  discountRate: number
  items: LineItem[]
  ticketId: string | null
  propertyId: string | null
}

export async function saveInvoice(
  input: SaveInvoiceInput
): Promise<{ id: string } | { error: string }> {
  const { data: sessionData } = await supabase.auth.getSession()
  const user = sessionData.session?.user
  if (!user) return { error: 'Not signed in — please log in to save.' }

  const totals = computeTotals(input.items, input.taxRate, input.discountRate)
  const payload = {
    user_id: user.id,
    invoice_number: input.number || null,
    invoice_date: input.date || null,
    client_name: input.clientName || null,
    payment_method: input.paymentMethod || null,
    terms: input.terms || null,
    notes: input.notes || null,
    warranty_disclaimer: input.warrantyDisclaimer || null,
    tax_rate: input.taxRate,
    discount_rate: input.discountRate,
    subtotal: totals.sub,
    tax_amount: totals.tax,
    discount_amount: totals.disc,
    total: totals.total,
    ticket_id: input.ticketId,
    property_id: input.propertyId,
  }

  let invoiceId = input.invoiceId

  if (invoiceId) {
    const { error: updErr } = await supabase.from('invoices').update(payload).eq('id', invoiceId)
    if (updErr) return { error: updErr.message }
    const { error: delErr } = await supabase.from('invoice_items').delete().eq('invoice_id', invoiceId)
    if (delErr) return { error: delErr.message }
  } else {
    const { data: inserted, error: insErr } = await supabase
      .from('invoices')
      .insert(payload)
      .select()
      .single()
    if (insErr || !inserted) return { error: insErr?.message ?? 'Insert failed' }
    invoiceId = inserted.id
  }

  const itemRows = input.items.map((item, i) => ({
    invoice_id: invoiceId,
    description: item.description,
    qty: item.qty,
    unit_price: item.price,
    line_total: item.qty * item.price,
    position: i,
  }))
  if (itemRows.length) {
    const { error: itemsErr } = await supabase.from('invoice_items').insert(itemRows)
    if (itemsErr) return { error: itemsErr.message }
  }

  return { id: invoiceId! }
}
```

- [ ] **Step 2: Wire the form's submit to the action**

In `InvoiceForm.tsx`, add:

```tsx
import { saveInvoice } from './actions'
// ...inside the component:
async function handleSubmit(e: React.FormEvent) {
  e.preventDefault()
  const result = await saveInvoice({
    number,
    date: new Date().toISOString().slice(0, 10),
    clientName,
    paymentMethod: '',
    terms: '',
    notes: '',
    warrantyDisclaimer: '',
    taxRate,
    discountRate,
    items,
    ticketId: ticketContext?.ticketId ?? null,
    propertyId: ticketContext?.propertyId ?? null,
  })
  if ('error' in result) alert(result.error)
  else window.location.href = `/invoices/${result.id}`
}
// change <form> to <form onSubmit={handleSubmit}> and add a submit button
```

- [ ] **Step 3: Manual verification**

Run: `npm run dev`, fill out the form at `/invoices/new`, submit, confirm a row appears in the `invoices` table (check via Supabase dashboard or `select * from invoices order by created_at desc limit 1`) with correct `subtotal`/`tax_amount`/`total`, and matching rows in `invoice_items`.

- [ ] **Step 4: Commit**

```bash
git add app/invoices/new
git commit -m "feat: wire invoice save action (insert/update + line items)"
```

---

### Task 5: Invoice detail/view route + PDF download

**Files:**
- Create: `app/invoices/[id]/page.tsx`
- Create: `lib/invoices/pdf.ts`

**Interfaces:**
- Consumes: `getInvoiceWithItems` (Task 2).
- Produces: `generateInvoicePdf(invoice: InvoiceRow, items: InvoiceItemRow[]): jsPDF` — client-only (jsPDF runs in the browser), called from a "Download PDF" button on the detail page.

- [ ] **Step 1: Detail page — server-rendered, read-only**

```tsx
// app/invoices/[id]/page.tsx
import { getInvoiceWithItems } from '@/lib/invoices/queries'
import { notFound } from 'next/navigation'
import { DownloadPdfButton } from './DownloadPdfButton'

export default async function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const result = await getInvoiceWithItems(id)
  if (!result) notFound()
  const { invoice, items } = result

  return (
    <div>
      <h1>Invoice {invoice.invoice_number}</h1>
      <p>{invoice.client_name}</p>
      <table>
        <tbody>
          {items.map((item) => (
            <tr key={item.id}>
              <td>{item.description}</td>
              <td>{item.qty}</td>
              <td>{item.unit_price}</td>
              <td>{item.line_total}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div>Total: {invoice.total}</div>
      <DownloadPdfButton invoice={invoice} items={items} />
    </div>
  )
}
```

- [ ] **Step 2: PDF generation, branded header per existing app**

Reference: purple-branded PDF header is an existing feature (`invoice-2-0/README.txt`: "Purple-branded PDF headers") — match the brand color already used in `lib/kpis.ts` (`TICKET_STATUS_COLORS.new = '#6b35b8'`).

```typescript
// lib/invoices/pdf.ts
import { jsPDF } from 'jspdf'
import type { InvoiceRow, InvoiceItemRow } from './types'

export function generateInvoicePdf(invoice: InvoiceRow, items: InvoiceItemRow[]): jsPDF {
  const doc = new jsPDF()
  doc.setFillColor('#6b35b8')
  doc.rect(0, 0, 210, 24, 'F')
  doc.setTextColor('#ffffff')
  doc.setFontSize(18)
  doc.text('Rose Legacy Home Solutions', 14, 16)

  doc.setTextColor('#000000')
  doc.setFontSize(12)
  doc.text(`Invoice ${invoice.invoice_number ?? ''}`, 14, 36)
  doc.text(`Client: ${invoice.client_name ?? ''}`, 14, 44)
  doc.text(`Date: ${invoice.invoice_date ?? ''}`, 14, 52)

  let y = 64
  for (const item of items) {
    doc.text(`${item.description}  x${item.qty}  @ ${item.unit_price}  = ${item.line_total}`, 14, y)
    y += 8
  }

  y += 8
  doc.text(`Subtotal: ${invoice.subtotal}`, 14, y)
  doc.text(`Tax: ${invoice.tax_amount}`, 14, y + 8)
  doc.text(`Discount: ${invoice.discount_amount}`, 14, y + 16)
  doc.setFontSize(14)
  doc.text(`Total: ${invoice.total}`, 14, y + 28)

  return doc
}
```

```tsx
// app/invoices/[id]/DownloadPdfButton.tsx
'use client'
import { generateInvoicePdf } from '@/lib/invoices/pdf'
import type { InvoiceRow, InvoiceItemRow } from '@/lib/invoices/types'

export function DownloadPdfButton({ invoice, items }: { invoice: InvoiceRow; items: InvoiceItemRow[] }) {
  return (
    <button
      type="button"
      onClick={() => {
        const doc = generateInvoicePdf(invoice, items)
        doc.save(`invoice-${invoice.invoice_number ?? invoice.id}.pdf`)
      }}
    >
      Download PDF
    </button>
  )
}
```

- [ ] **Step 3: Manual verification**

Run: `npm run dev`, navigate to `/invoices/<id from the row created in Task 4>`, click Download PDF, confirm a PDF downloads with the purple header, client name, line items, and totals matching the database row.

- [ ] **Step 4: Commit**

```bash
git add app/invoices/[id] lib/invoices/pdf.ts
git commit -m "feat: add invoice detail page and branded PDF export"
```

---

### Task 6: Invoice history list (replaces invoice-2-0's loadHistory)

**Files:**
- Create: `app/invoices/page.tsx`

**Interfaces:**
- Consumes: `listInvoices` (Task 2).
- Produces: the `/invoices` index route — entry point linked from the site header (Task 9).

- [ ] **Step 1: Implement**

```tsx
// app/invoices/page.tsx
import Link from 'next/link'
import { listInvoices } from '@/lib/invoices/queries'

export default async function InvoicesPage() {
  const invoices = await listInvoices()
  return (
    <div>
      <div>
        <Link href="/invoices/new">New invoice</Link>
      </div>
      <table>
        <thead>
          <tr>
            <th>Number</th>
            <th>Client</th>
            <th>Date</th>
            <th>Total</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {invoices.map((inv) => (
            <tr key={inv.id}>
              <td>
                <Link href={`/invoices/${inv.id}`}>{inv.invoice_number}</Link>
              </td>
              <td>{inv.client_name}</td>
              <td>{inv.invoice_date}</td>
              <td>{inv.total.toFixed(2)}</td>
              <td>{inv.payment_status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
```

- [ ] **Step 2: Manual verification**

Run: `npm run dev`, open `/invoices`, confirm all 23 existing invoice rows (from the live `invoices` table) render with correct totals and statuses.

- [ ] **Step 3: Commit**

```bash
git add app/invoices/page.tsx
git commit -m "feat: add invoice history list route"
```

---

### Task 7: Wire ticket detail page to the new internal route

**Files:**
- Modify: `app/tickets/[id]/page.tsx:100` (currently reads `process.env.NEXT_PUBLIC_INVOICE_APP_URL` to build an external link)
- Modify: `app/layout.tsx:32` (currently passes `invoiceAppUrl` into `SiteHeader`)
- Modify: `app/components/SiteHeader.tsx` (find via `grep -rn "invoiceAppUrl" app/components`)

**Interfaces:**
- Consumes: nothing new — replaces an external URL prop with an internal `<Link href="/invoices">`/`<Link href={`/invoices/new?ticket=${id}`}>`.

- [ ] **Step 1: Read current usage**

```bash
grep -n "invoiceAppUrl" app/components/SiteHeader.tsx app/tickets/\[id\]/page.tsx app/layout.tsx
```

- [ ] **Step 2: Replace the external-URL prop with internal links**

In `app/tickets/[id]/page.tsx`, replace the block building a link from `NEXT_PUBLIC_INVOICE_APP_URL` + `?ticket=${id}` with a `Link href={`/invoices/new?ticket=${ticket.id}`}`. In `app/layout.tsx`, stop passing `invoiceAppUrl` to `SiteHeader`; instead pass nothing and have `SiteHeader` render `<Link href="/invoices">Invoices</Link>` directly.

- [ ] **Step 3: Manual verification**

Run: `npm run dev`, open any ticket detail page, click "Create Invoice" (or equivalent), confirm it lands on `/invoices/new?ticket=<id>` (internal route, same session) instead of an external Vercel URL, and the form prefills from the ticket as in Task 3.

- [ ] **Step 4: Commit**

```bash
git add app/tickets app/layout.tsx app/components/SiteHeader.tsx
git commit -m "refactor: link tickets to internal /invoices routes instead of external invoice-2-0 app"
```

---

### Task 8: Decommission invoice-2-0

**Files:**
- Modify: `.env.local` and Vercel project env vars (remove `NEXT_PUBLIC_INVOICE_APP_URL`)
- No file changes inside `invoice-2-0` itself — it stays as a git-tracked archive, just undeployed.

**Interfaces:** none — this is a cleanup/decommission task, not a code interface.

- [ ] **Step 1: Confirm no remaining references**

```bash
grep -rn "NEXT_PUBLIC_INVOICE_APP_URL" ~/Desktop/rose-legacy-work-management/app ~/Desktop/rose-legacy-work-management/lib
```

Expected: no output (Task 7 already removed every usage).

- [ ] **Step 2: Remove the env var**

Remove the `NEXT_PUBLIC_INVOICE_APP_URL=` line from `.env.local`, and remove the same variable from the Vercel project settings for `rose-legacy-work-management` (Vercel dashboard → Settings → Environment Variables) — **ask the user to confirm before touching the Vercel dashboard**, since that's a shared/production setting outside this repo.

- [ ] **Step 3: Stop the invoice-2-0 Vercel deployment**

In the Vercel dashboard, pause/remove the `invoice-2-0` project's production deployment — **ask the user to confirm first**; this takes a live URL offline (anyone with the old bookmark loses access immediately).

- [ ] **Step 4: Commit the env cleanup**

```bash
cd ~/Desktop/rose-legacy-work-management
git add .env.local
git commit -m "chore: remove invoice-2-0 external URL now that invoices are native routes"
```

---

## Out of scope for this plan (tracked separately)

- **Estimates tab, KPI dashboard for invoices, consolidation, payment links** (`invoice-2-0/app.js` lines 343–880): real features worth keeping, but each is independently portable using the same pattern established in Tasks 2–6. Write a follow-up plan once Tasks 1–8 are merged and the core invoice flow is proven in production.
- **Mobile app (Expo/React Native)**: a separate plan, built after the invoice module lives natively in `work-management` — the mobile app should consume the same Supabase project and ideally the same `lib/invoice-math.ts`/`lib/invoices/types.ts` modules (framework-free, already portable to React Native).
- **Multi-tenant (`org_id`) and AI-drafted invoices from call transcripts**: business-value features layered on top once the single-tenant migration is stable.
