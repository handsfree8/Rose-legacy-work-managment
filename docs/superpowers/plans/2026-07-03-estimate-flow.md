# Estimate Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a standalone "New Estimate" button on the property page that opens invoice-2-0 pre-filled, saves the estimate to Supabase, and auto-expires it after 3 days if not approved by the landlord.

**Architecture:** The property page (work-management app) links to invoice-2-0 with `?property=<id>&mode=estimate`. Invoice-2-0 reads those params, pre-fills the client name from Supabase, switches to the Estimate tab, and adds a "Save Estimate" button that writes to the `estimates` Supabase table with `expires_at = now + 3 days`. A Supabase pg_cron job deletes expired pending estimates nightly.

**Tech Stack:** Next.js (App Router, server components), vanilla JS + Supabase JS client (invoice-2-0), Supabase pg_cron, PostgreSQL migration via Supabase MCP.

## Global Constraints

- `estimates` table lives in Supabase project `wrlwhnjqnsfkpyihumqd`
- invoice-2-0 is a static app at `/Users/roselegacyhomesolutions/Desktop/invoice-2-0` deployed at `https://invoice-2-0-two.vercel.app`
- work-management is a Next.js app at `/Users/roselegacyhomesolutions/Desktop/rose-legacy-work-management`
- `NEXT_PUBLIC_INVOICE_APP_URL=https://invoice-2-0-two.vercel.app` (already set in work-management)
- invoice-2-0 uses anon Supabase key (client-side) — no service role key available there
- The `estimates` table currently requires `ticket_id NOT NULL` — must be made nullable
- Do NOT use `ticket_id` for standalone estimates; leave it null
- No new npm dependencies in either app

---

## Task 1: DB Migration — make `ticket_id` nullable, add `expires_at`

**Files:**
- No file — run via Supabase MCP `apply_migration`

**Migration SQL:**
```sql
-- Make ticket_id nullable so estimates can exist without a ticket
ALTER TABLE estimates ALTER COLUMN ticket_id DROP NOT NULL;

-- Add expiry timestamp; null means no expiry (ticket-linked estimates don't expire)
ALTER TABLE estimates ADD COLUMN IF NOT EXISTS expires_at timestamptz;

-- Index for the nightly cleanup cron
CREATE INDEX IF NOT EXISTS idx_estimates_expires_at ON estimates (expires_at)
  WHERE status = 'pending';
```

- [ ] **Step 1: Apply migration via Supabase MCP**

  Use `apply_migration` tool:
  - project_id: `wrlwhnjqnsfkpyihumqd`
  - name: `estimates_standalone_and_expiry`
  - SQL: the block above

- [ ] **Step 2: Verify**

  Run via `execute_sql`:
  ```sql
  SELECT column_name, is_nullable, data_type
  FROM information_schema.columns
  WHERE table_name = 'estimates'
  ORDER BY ordinal_position;
  ```
  Confirm `ticket_id` shows `is_nullable = YES` and `expires_at` column exists.

- [ ] **Step 3: Commit note**

  No code files changed — migration is DB-only. Note in git: "DB: estimates ticket_id nullable + expires_at column".

---

## Task 2: Supabase pg_cron — auto-delete expired pending estimates

**Files:**
- No file — run via Supabase MCP `apply_migration` (pg_cron SQL)

**What it does:** Every night at 02:00 UTC, delete any estimate where `status = 'pending'` and `expires_at < now()`.

- [ ] **Step 1: Apply cron migration**

  Use `apply_migration`:
  - project_id: `wrlwhnjqnsfkpyihumqd`
  - name: `estimates_expiry_cron`
  - SQL:
  ```sql
  -- Enable pg_cron extension if not already enabled
  CREATE EXTENSION IF NOT EXISTS pg_cron;

  -- Schedule nightly cleanup of expired pending estimates at 02:00 UTC
  SELECT cron.schedule(
    'expire-pending-estimates',
    '0 2 * * *',
    $$
      DELETE FROM estimates
      WHERE status = 'pending'
        AND expires_at IS NOT NULL
        AND expires_at < now();
    $$
  );
  ```

- [ ] **Step 2: Verify cron registered**

  ```sql
  SELECT jobname, schedule, command FROM cron.job WHERE jobname = 'expire-pending-estimates';
  ```
  Expected: one row with the schedule `0 2 * * *`.

---

## Task 3: invoice-2-0 — handle `?property=<id>&mode=estimate` URL params

**Files:**
- Modify: `/Users/roselegacyhomesolutions/Desktop/invoice-2-0/app.js` — add `prefillFromProperty()` function and tab-switch logic

**Where to insert:** After the `prefillFromTicket()` function (around line 160), before the `saveInvoiceToHistory` function.

**What it does:**
1. Reads `?property=<id>` from URL
2. Fetches property name from Supabase `properties` table
3. Pre-fills `#client-name` with the property name
4. If `?mode=estimate`, clicks the "Estimate" nav tab to switch the UI to it
5. Sets `linkedPropertyId` so later the save will use it

- [ ] **Step 1: Add `prefillFromProperty` function in app.js**

  Insert after line ~159 (after `prefillFromTicket` closing brace), before the `/* ── Save invoice to history */` comment:

  ```js
  /* ── Property link (?property=<uuid>&mode=estimate) ─ */
  let propertyPrefilled = false;

  async function prefillFromProperty() {
    if (propertyPrefilled) return;
    const params = new URLSearchParams(location.search);
    const propertyId = params.get('property');
    const mode = params.get('mode');
    if (!propertyId) return;
    propertyPrefilled = true;
    try {
      const { data: prop, error } = await supabase
        .from('properties')
        .select('id, name, address, city, state')
        .eq('id', propertyId)
        .single();
      if (error) throw error;
      linkedPropertyId = prop.id;
      const clientEl = $('#client-name');
      if (clientEl && !clientEl.value) {
        clientEl.value = prop.name + (prop.address ? ' — ' + prop.address : '');
      }
      if (mode === 'estimate') {
        // Switch to the Estimate tab
        const estimateTab = document.querySelector('[data-section="estimate"]');
        if (estimateTab) estimateTab.click();
      }
      if (typeof showToast === 'function') {
        showToast('Linked to property: ' + prop.name);
      }
    } catch (err) {
      console.error('Could not load property:', err);
    }
  }
  ```

- [ ] **Step 2: Call `prefillFromProperty()` alongside the other prefill calls**

  Find where `prefillFromTicket()` and `prefillFromInvoiceParam()` are called (search for `prefillFromTicket()` call site — around line 1350-1380 in the app init block). Add `prefillFromProperty()` to the same call site:

  ```js
  prefillFromInvoiceParam();
  prefillFromTicket();
  prefillFromProperty();   // ← add this line
  ```

- [ ] **Step 3: Find the estimate tab's selector**

  Check `index.html` for the nav element that shows the Estimate section. It likely has `data-section="estimate"` or a similar attribute. Confirm the selector used in Step 1 matches the actual HTML. If not, adjust the selector.

- [ ] **Step 4: Build check**

  This is a static app — no build step. Open `index.html` in a browser locally and navigate to `?property=3b8abd51-9607-45bf-965e-dbdaa49b0ac7&mode=estimate`. Confirm:
  - Client name pre-fills with "Maple Landlord"
  - UI switches to Estimate tab
  - Toast shows "Linked to property: Maple Landlord"

- [ ] **Step 5: Commit**
  ```bash
  cd /Users/roselegacyhomesolutions/Desktop/invoice-2-0
  git checkout -b feature/estimate-flow
  git add app.js
  git commit -m "feat: prefill estimate from ?property=<id>&mode=estimate URL param"
  ```

---

## Task 4: invoice-2-0 — "Save Estimate" button writes to Supabase `estimates`

**Files:**
- Modify: `/Users/roselegacyhomesolutions/Desktop/invoice-2-0/app.js` — add `saveEstimateToSupabase()` function
- Modify: `/Users/roselegacyhomesolutions/Desktop/invoice-2-0/index.html` — add "Save Estimate" button in the estimate section

**What it does:** When the user clicks "Save Estimate", collect the estimate line items, compute the total, and insert into `estimates`:
- `property_id`: from `linkedPropertyId`
- `ticket_id`: null (standalone estimate)
- `description`: JSON stringified list of items (or joined text)
- `amount`: total of all estimate rows
- `status`: `'pending'`
- `expires_at`: `new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString()`

- [ ] **Step 1: Add `saveEstimateToSupabase()` in app.js**

  Insert after the `computeEstimateTotals` function (after line ~1024):

  ```js
  async function saveEstimateToSupabase() {
    if (!linkedPropertyId) {
      showToast('No property linked — open this page from a property card.');
      return;
    }
    const rows = getEstimateRows().filter(r => r.description.trim());
    if (rows.length === 0) {
      showToast('Add at least one line item before saving.');
      return;
    }
    const total = rows.reduce((sum, r) => sum + r.qty * r.price, 0);
    const description = rows.map(r => `${r.description} (x${r.qty}) — $${(r.qty * r.price).toFixed(2)}`).join('\n');
    const expiresAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();

    const { error } = await supabase.from('estimates').insert({
      property_id: linkedPropertyId,
      ticket_id: null,
      description,
      amount: total,
      status: 'pending',
      expires_at: expiresAt,
    });

    if (error) {
      showToast('Could not save estimate: ' + error.message);
      console.error('Save estimate failed:', error);
      return;
    }
    showToast('Estimate saved — expires in 3 days if not approved ✓');
  }
  ```

- [ ] **Step 2: Wire button in index.html**

  In `index.html`, find the estimate section (search for `btn-add-estimate` or the estimate tab content area). Add a "Save Estimate" button near the estimate totals area:

  ```html
  <button id="btn-save-estimate" class="btn btn-primary">Save Estimate</button>
  ```

- [ ] **Step 3: Wire the click handler in app.js**

  After the `$('#btn-add-estimate').addEventListener(...)` line (~1026), add:

  ```js
  $('#btn-save-estimate').addEventListener('click', saveEstimateToSupabase);
  ```

- [ ] **Step 4: Test manually**

  Open via `?property=3b8abd51-9607-45bf-965e-dbdaa49b0ac7&mode=estimate`, add 2 line items, click "Save Estimate". Then verify in Supabase:
  ```sql
  SELECT id, property_id, description, amount, status, expires_at, created_at
  FROM estimates
  WHERE property_id = '3b8abd51-9607-45bf-965e-dbdaa49b0ac7'
    AND ticket_id IS NULL
  ORDER BY created_at DESC
  LIMIT 3;
  ```
  Confirm: one row, status `pending`, `expires_at` ~3 days from now, `ticket_id` null.

- [ ] **Step 5: Commit**
  ```bash
  git add app.js index.html
  git commit -m "feat: Save Estimate button writes to estimates table with 3-day expiry"
  ```

---

## Task 5: work-management — "New Estimate" button on property page

**Files:**
- Modify: `rose-legacy-work-management/app/access/[id]/page.tsx` lines 96-131 (the top action bar)

**What it does:** Add an "Estimado" button next to "+ New Ticket". Clicking it opens invoice-2-0 in a new tab with `?property=<id>&mode=estimate`.

The `NEXT_PUBLIC_INVOICE_APP_URL` env var is already available in the layout — but it's not available in this server component directly. Read it via `process.env.NEXT_PUBLIC_INVOICE_APP_URL`.

- [ ] **Step 1: Add the button in `app/access/[id]/page.tsx`**

  The invoice app URL in a server component:
  ```ts
  const invoiceAppUrl = process.env.NEXT_PUBLIC_INVOICE_APP_URL || 'https://invoice-2-0-two.vercel.app'
  ```

  Replace the current top action bar block (lines 98-131) with:

  ```tsx
  const invoiceAppUrl = process.env.NEXT_PUBLIC_INVOICE_APP_URL || 'https://invoice-2-0-two.vercel.app'

  // inside JSX, replace the top bar div:
  <div
    style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: '12px',
      flexWrap: 'wrap',
      marginBottom: '20px',
    }}
  >
    <Link
      href="/"
      style={{
        textDecoration: 'none',
        color: 'var(--purple)',
        fontWeight: 600,
      }}
    >
      ← Back to properties
    </Link>

    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
      <a
        href={`${invoiceAppUrl}?property=${id}&mode=estimate`}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          textDecoration: 'none',
          background: '#fff',
          color: 'var(--purple)',
          border: '2px solid var(--purple)',
          padding: '10px 16px',
          borderRadius: '10px',
          fontWeight: 700,
        }}
      >
        + New Estimate
      </a>

      <Link
        href={`/access/${id}/new-ticket`}
        style={{
          textDecoration: 'none',
          background: 'var(--purple)',
          color: '#fff',
          padding: '10px 16px',
          borderRadius: '10px',
          fontWeight: 700,
        }}
      >
        + New Ticket
      </Link>
    </div>
  </div>
  ```

- [ ] **Step 2: Build check**
  ```bash
  cd /Users/roselegacyhomesolutions/Desktop/rose-legacy-work-management
  npm run build
  ```
  Expected: no TypeScript errors, clean build.

- [ ] **Step 3: Commit in work-management**
  ```bash
  git checkout -b feature/estimate-button
  git add app/access/\[id\]/page.tsx
  git commit -m "feat: add New Estimate button linking to invoice app with property context"
  ```

---

## Task 6: Deploy both apps

**Files:** No code changes — just PR + merge.

- [ ] **Step 1: Push and merge invoice-2-0 PR**
  ```bash
  cd /Users/roselegacyhomesolutions/Desktop/invoice-2-0
  git push -u origin feature/estimate-flow
  gh pr create --head feature/estimate-flow --title "Estimate flow: property pre-fill + Save to Supabase"
  # after review:
  gh pr merge --merge --delete-branch
  ```

- [ ] **Step 2: Push and merge work-management PR**
  ```bash
  cd /Users/roselegacyhomesolutions/Desktop/rose-legacy-work-management
  git push -u origin feature/estimate-button
  gh pr create --head feature/estimate-button --title "Add New Estimate button on property page"
  gh pr merge --merge --delete-branch
  ```

- [ ] **Step 3: End-to-end test in production**

  1. Go to `rose-legacy-work-management.vercel.app/access/<property-id>`
  2. Click "+ New Estimate" → confirm it opens invoice-2-0 on the Estimate tab, pre-filled with the property name
  3. Add 2 line items, click "Save Estimate"
  4. Confirm toast "Estimate saved — expires in 3 days if not approved ✓"
  5. In Supabase, verify the row exists with `status='pending'` and correct `expires_at`
  6. Go to the landlord portal for that property and confirm the estimate appears with Approve/Reject buttons

---

## Self-Review

**Spec coverage check:**
- ✅ "New Estimate" button on property page → Task 5
- ✅ Opens invoice-2-0 pre-filled → Task 3
- ✅ Saves to Supabase `estimates` table → Task 4
- ✅ 3-day expiry / auto-delete → Tasks 1 + 2
- ✅ Estimate is standalone (no ticket required) → Tasks 1 + 4
- ✅ Landlord Approve/Reject already works (existing feature, no changes needed)
- ⚠️ JSON format improvement (mentioned by user, JSON file uploaded) — user will share details; handle in a follow-up task after this plan is running

**Placeholder scan:** None found.

**Type consistency:** `linkedPropertyId` is a module-level `let` already declared in invoice-2-0 — reused correctly in Tasks 3 and 4. `expires_at` column added in Task 1 and used in Task 4.
