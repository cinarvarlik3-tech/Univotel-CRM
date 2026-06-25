# FMS — Finance Management System (v1) — Build Spec

**For:** Claude Code / Cursor implementation.
**Pairs with:** `0096_fms_finance_layer.sql` (apply that migration first).
**Stack:** Next.js 15 Pages Router → Cloudflare Workers → Supabase. `lib/` = logic, `pages/api/` = thin handlers, `components/` = UI. Service role only from allowed `lib/` paths. **Funnel slugs are ASCII** from `lib/constants.ts` — `kapora-alindi`, `sozlesme-imzalandi` (NO Turkish diacritics anywhere in code). After migration: `pnpm gen:types` + Supabase `get_advisors`.

FMS is a **manager-and-above** financial layer for **won customers** — a semi-separate app like PMS, reached by a button above the PMS button, visible to managers/superadmins only. Inside FMS the normal CRM sidebar is replaced by FMS-only nav.

> **This spec was revised after two codebase reviews.** Round 1: `active_finance` is `security_invoker` (RLS bypass fix); finance row is created **before** the kapora funnel write; `operator` role can write finance; archival is **soft** (won customers stay in `leads`); arrangement changes go through an **atomic RPC**; audit records a real **actor** via a GUC. Round 2: the mutator RPCs are **EXECUTE-locked to `service_role`** (anon could otherwise call them); the kapora flow **compensates** (vacates the row) if the funnel write fails, so a failed transition can't leave an orphan revenue-counting row; the first row is created through an **audited `fms_create_finance_row()` RPC** (real actor, no broad INSERT grant); direct-INSERT RLS is tightened to **manager+**; lost/refunded recognition is a flagged **open decision**.

---

## 0. One-paragraph mental model

A won customer (entering `kapora-alindi`) gets one **active** `lead_finance` row carrying a **frozen** monthly price copied from the room they bought, an editable **discount**, and a **deal_duration**. Revenue per customer = `(monthly_payment − discount) × deal_duration`. Customers attribute to a partner by walking `purchased_room → room_types → properties → partners`. FMS sums those into **partner revenue**, applies `commission_percentage` to get **our cut**, and shows **partner profit = revenue − our cut**, sliced per partner (pages) and per property (sub-pages). Every read goes through the `active_finance` view so the `vacated_at IS NULL` filter can never be forgotten, and the view is `security_invoker` so RLS actually applies.

---

## 1. What 0096 already does (do not re-implement)

- `room_types.default_price` (monthly TRY, manual seed, canonical price home).
- `lead_details.purchased_room` FK → `ON DELETE RESTRICT`; `lead_finance.purchased_room` same. **Room types soft-deleted (`is_active=false`), never hard-deleted.**
- `partners.commission_percentage` (flat % v1).
- `lead_finance` ledger + `idx_lead_finance_one_active` (one-active-row invariant).
- **`active_finance`** view — `security_invoker = true`, current rows only, `effective_monthly` + `lead_revenue` precomputed. **The only read path.**
- **`fms_revenue_breakdown()`** — the single canonical revenue query (per partner/property + unattributed group).
- **`fms_create_finance_row()`** — audited first-row creation RPC (SECURITY DEFINER, sets the actor GUC); the creation chokepoint at kapora.
- **`fms_record_finance_change()`** — atomic vacate+insert RPC; both RPCs reject partner_operator and set the audit actor GUC.
- All three RPCs are **`EXECUTE`-revoked from `PUBLIC` and granted only to `service_role`** — they bypass RLS, so anon/authenticated must not be able to call them.
- `finance_audit` + `fn_finance_actor()` (GUC-then-auth.uid()) + audit triggers (commission %, property→partner, room price, lead_finance edits/vacate/create).
- `fn_finance_row_guard` — true-positive-only safety net (fires only on genuine bypass, because the row is created before the funnel write).
- RLS: manager+ SELECT (no archive filter); **direct INSERT = manager+** (non-managers create via `fms_create_finance_row()`); UPDATE = manager+; partner denied throughout.
- Backfill: single pass over `leads` (no `is_archived` filter — soft archive); skips logged `BACKFILL_SKIPPED`.

---

## 2. Calculations — exact definitions

All read **`active_finance`** (or `fms_revenue_breakdown()`), never `lead_finance` directly.

| Quantity              | Formula                                          | Source                              |
| --------------------- | ------------------------------------------------ | ----------------------------------- |
| Effective monthly     | `monthly_payment − discount`                     | `active_finance.effective_monthly`  |
| Lead revenue          | `effective_monthly × deal_duration`              | `active_finance.lead_revenue`       |
| Partner revenue       | `SUM(lead_revenue)` by partner                   | `fms_revenue_breakdown()` rolled up |
| Our cut (per partner) | `calculatePartnerCommission(partnerId, revenue)` | §5 chokepoint                       |
| Partner profit        | `revenue − our_cut`                              | derived, never stored               |
| Property revenue      | `SUM(lead_revenue)` by property                  | `fms_revenue_breakdown()`           |
| Grand totals          | `SUM` across partners                            | §3 module                           |

**Unattributed bucket:** customers whose property has `partner_id IS NULL` → shown as a visible "Unattributed" line, never dropped.

---

## 3. Partner revenue module — THE critical piece

> Single most breakable part. Lives in **one** module (`lib/finance/revenue.ts`); every FMS surface reads from it. **No FMS page re-derives revenue.**

### 3.1 Non-negotiable rules (already enforced in 0096's SQL)

1. Read `active_finance` / `fms_revenue_breakdown()`, never raw `lead_finance`. (ESLint rule — §7.)
2. No `is_archived` filter — soft-archived won customers count.
3. LEFT JOIN partners — null partner surfaces in Unattributed, never vanishes.
4. Commission only via `calculatePartnerCommission` (§5). Never inline.

### 3.2 The module

```typescript
// lib/finance/revenue.ts
// Single source of truth for ALL FMS revenue figures. Read here, nowhere else.
import { createServiceClient } from '@/lib/supabase/service';
import { calculatePartnerCommission } from '@/lib/finance/commission';

export type PropertyRevenue = {
  partnerId: string | null; // null => unattributed
  partnerName: string | null;
  propertyId: string;
  propertyName: string;
  customerCount: number;
  propertyRevenue: number;
};

export type PartnerSummary = {
  partnerId: string | null; // null => "Unattributed"
  partnerName: string;
  revenue: number;
  ourCut: number;
  profit: number;
  properties: PropertyRevenue[];
};

export type FmsTotals = {
  partners: PartnerSummary[];
  unattributed: PartnerSummary | null; // pulled out for its own nav entry (S5 fix)
  grandRevenue: number;
  grandOurCut: number;
  grandProfit: number;
};

export async function getFmsTotals(): Promise<FmsTotals> {
  const supa = createServiceClient();
  const { data, error } = await supa.rpc('fms_revenue_breakdown');
  if (error) throw error;
  const rows = (data ?? []) as PropertyRevenue[];

  const byPartner = new Map<string, PartnerSummary>();
  for (const r of rows) {
    const key = r.partnerId ?? '__unattributed__';
    let p = byPartner.get(key);
    if (!p) {
      p = {
        partnerId: r.partnerId,
        partnerName: r.partnerName ?? 'Unattributed',
        revenue: 0,
        ourCut: 0,
        profit: 0,
        properties: [],
      };
      byPartner.set(key, p);
    }
    p.properties.push(r);
    p.revenue += Number(r.propertyRevenue);
  }

  // Commission per partner via the chokepoint. Unattributed gets 0 (no partner =>
  // no rate) but its revenue stays visible so totals never silently shrink.
  // (Batched-friendly: calculatePartnerCommission can be swapped for a batch
  //  variant behind the same name — see §5 note on N+1.)
  for (const p of byPartner.values()) {
    p.ourCut = p.partnerId === null ? 0 : await calculatePartnerCommission(p.partnerId, p.revenue);
    p.profit = p.revenue - p.ourCut;
  }

  const unattributed = byPartner.get('__unattributed__') ?? null;
  const partners = [...byPartner.values()]
    .filter((p) => p.partnerId !== null)
    .sort((a, b) => b.revenue - a.revenue);

  const all = [...partners, ...(unattributed ? [unattributed] : [])];
  const grandRevenue = all.reduce((s, p) => s + p.revenue, 0);
  const grandOurCut = all.reduce((s, p) => s + p.ourCut, 0);

  return {
    partners,
    unattributed,
    grandRevenue,
    grandOurCut,
    grandProfit: grandRevenue - grandOurCut,
  };
}

export async function getPartnerSummary(partnerId: string): Promise<PartnerSummary | null> {
  const totals = await getFmsTotals();
  return totals.partners.find((p) => p.partnerId === partnerId) ?? null;
}

// Unattributed is addressed via its own getter, NOT the [partnerId] route (S5).
export async function getUnattributed(): Promise<PartnerSummary | null> {
  return (await getFmsTotals()).unattributed;
}
```

> Per-partner pages → `getPartnerSummary`. Property sub-pages → `summary.properties`. Dashboard → `getFmsTotals`. Unattributed → `getUnattributed` (its own page, never `[partnerId]`).

---

## 4. Funnel gate + finance-row creation (write side)

In the existing chokepoint (`advance-stage.ts` / `lib/leads/update-lead.ts`), **not** a pure DB trigger (the trigger can't see `deal_duration`/`discount`, which are fresh UI inputs).

### 4.1 Strict kapora gate

When target = `kapora-alindi`, **block** unless all of:

1. `lead_details.purchased_room` set, **and**
2. that room's `room_types.default_price` **is not null** (priced), **and**
3. `deal_duration` provided (default 9, range 1–12), **and**
4. `discount` provided (default 0, `0 ≤ discount ≤ monthly_payment`).

Return a clear validation error naming the missing field. See `lib/finance/kapora-gate.ts` (same as prior spec; `assertKaporaFinanceReady` returns the frozen `monthlyPayment`).

### 4.2 Order of operations — finance row FIRST, then funnel write, WITH compensation (M2 + N1 fix)

**Create the finance row BEFORE flipping `funnel_status` to `kapora-alindi`, and vacate it if the funnel write fails.** Reasons:

- The safety-net trigger (`fn_finance_row_guard`) checks for the row at the moment of the funnel write. Creating the row first means the happy path never trips the guard (no false anomalies).
- **The two writes are NOT one transaction** (separate PostgREST calls). If the row is created but the funnel write then fails, you'd be left with an **active finance row on a lead that never reached kapora** — and `fms_revenue_breakdown()` has no `funnel_status` filter, so it would count that orphan as revenue forever. So on funnel-write failure, **compensate by vacating the just-created row** (a vacated row never counts).

```
advance to kapora-alindi:
  1. assertKaporaFinanceReady(...)            // validate + get frozen monthlyPayment
  2. id = createFinanceRow(...)               // fms_create_finance_row RPC (audited actor)
  3. try {
       updateLeadRecord(... funnel_status='kapora-alindi' ...)   // funnel write LAST
     } catch (e) {
       await vacateFinanceRow(id)             // COMPENSATE: leave no orphan active row
       throw e
     }
```

`createFinanceRow` calls the SECURITY DEFINER **`fms_create_finance_row`** RPC (not a raw INSERT) so the `'created'` audit row records a real actor and no role needs a broad INSERT grant (direct-INSERT RLS is now manager+ only). The compensating vacate runs through the same `service_role` client, which bypasses the manager-only UPDATE RLS. The RPC is for the _first_ row; later _changes_ use `fms_record_finance_change` (§4.3).

```typescript
// lib/finance/create-finance-row.ts — calls the audited RPC, never a raw INSERT.
export async function createFinanceRow(
  supa: ServiceClient,
  leadId: string,
  input: KaporaFinanceInput,
  monthlyPayment: number, // frozen by assertKaporaFinanceReady
  actorId: string | null, // session user id -> real audit actor
): Promise<string> {
  const { data, error } = await supa.rpc('fms_create_finance_row', {
    p_lead_id: leadId,
    p_purchased_room: input.purchasedRoom,
    p_monthly_payment: monthlyPayment,
    p_discount: input.discount,
    p_deal_duration: input.dealDuration,
    p_actor_id: actorId,
  });
  if (error) throw error;
  return data as string; // new finance row id (pass to vacate on compensation)
}
```

### 4.3 Sözleşme adjustment / any later change = atomic RPC (S3 fix)

At `sozlesme-imzalandi` re-confirm, or any room/term change after the first row: **never** do vacate then insert as two PostgREST calls (a failure between them drops the active row → silent revenue loss). Call the atomic RPC:

```typescript
// lib/finance/record-change.ts
// Reads + freezes the new room's price, then calls the atomic DB function.
export async function recordFinanceChange(
  supa: ServiceClient,
  args: {
    leadId: string;
    purchasedRoom: string;
    dealDuration: number;
    discount: number;
    actorId: string | null;
  },
): Promise<string> {
  const { data: room, error: rErr } = await supa
    .from('room_types')
    .select('default_price')
    .eq('id', args.purchasedRoom)
    .single();
  if (rErr || !room || room.default_price == null) {
    throw new ValidationError('Seçilen odanın fiyatı tanımlı değil.');
  }
  const { data, error } = await supa.rpc('fms_record_finance_change', {
    p_lead_id: args.leadId,
    p_purchased_room: args.purchasedRoom,
    p_monthly_payment: room.default_price, // frozen here
    p_discount: args.discount,
    p_deal_duration: args.dealDuration,
    p_actor_id: args.actorId, // recorded in finance_audit via GUC
  });
  if (error) throw error;
  return data as string; // new row id
}
```

The RPC rejects partner_operator internally and is **`EXECUTE`-granted only to `service_role`** (revoked from `PUBLIC`) — it is SECURITY DEFINER and bypasses RLS, so it must be reachable only from the server-side `service_role` client in `lib/`, never directly by an anon/authenticated browser session. Operators and salespeople drive the sözleşme step through this server path without holding direct UPDATE on the table. Pass `actorId` = the session user's id so the audit "who" is real, not NULL.

---

## 5. Commission chokepoint

```typescript
// lib/finance/commission.ts
// THE single place commission is computed. v1 = flat %. v2 swaps the body for
// Academic House tiering + real-estate multiplexer WITHOUT touching callers.
import { createServiceClient } from '@/lib/supabase/service';

export async function calculatePartnerCommission(
  partnerId: string,
  partnerRevenue: number,
): Promise<number> {
  const supa = createServiceClient();
  const { data, error } = await supa
    .from('partners')
    .select('commission_percentage')
    .eq('id', partnerId)
    .single();
  if (error || !data || data.commission_percentage == null) return 0;
  return partnerRevenue * (Number(data.commission_percentage) / 100);
  // v2 (do not build): Academic House pct_low <=100M TRY, pct_high above;
  // real-estate per-property deals via multiplexer. Slot in HERE.
}
```

> **N+1 note (S4):** `getFmsTotals` calls this per partner. Fine for a handful of partners. When partner count grows, add `calculatePartnerCommissionBatch(Map<partnerId, revenue>)` behind the same module and have `getFmsTotals` use it — one query, same chokepoint. Not required for v1.

---

## 6. FMS app surface

### 6.1 FeatureShell (FMS establishes the pattern; PMS retrofits later)

Extend/wrap `AppShell` with a **`navOverride`** prop: when set, render those nav groups instead of the CRM groups; when unset, behave exactly as today. Build `components/finance/FmsShell.tsx` passing `navOverride={fmsNavGroups}`. Inside FMS the CRM nav is absent. **PMS retrofit is a separate later task.**

### 6.2 Access (two layers, both required)

- **AppShell route guard:** add `/fms` prefix as **manager+ only**. partner_operator AND salesperson AND operator hitting `/fms/*` → redirect to default. Keep `/fms` **off** `PARTNER_ALLOWED_PREFIXES` and off `partnerNavGroups`. (Note: salespeople/operators write finance via the CRM funnel but never see the FMS app.)
- **RLS** (0096): `lead_finance` SELECT manager+ only. The `security_invoker` view means this RLS actually applies through `active_finance`.

> 0095 lesson: the guard/sidebar are allowlists. Adding FMS to staff nav must NOT add it to partner nav. Verify `Sidebar.tsx` `partnerNavGroups` excludes `/fms`.

### 6.3 The FMS button

Directly **above** the PMS sidebar entry, gated on `isManagerOrAbove` (manager/superadmin only). Note `isManagerOrAbove` returns true only for manager/superadmin — salespeople, operators, partners never see it. Correct for FMS.

### 6.4 Routes & pages

```
pages/fms/
  index.tsx                     -> dashboard: grand totals + per-partner cards + Unattributed line
  unattributed.tsx              -> the null-partner bucket (its own page, NOT [partnerId])
  [partnerId]/index.tsx         -> one partner: revenue / our cut / profit + property list
  [partnerId]/[propertyId].tsx  -> one property: customers + property revenue
```

FMS sidebar nav = "Overview" + one entry per partner (expandable to its properties) + an "Unattributed" entry shown only when its revenue > 0.

### 6.5 API

```
pages/api/fms/
  totals.ts          GET -> getFmsTotals()           (manager+)
  [partnerId].ts     GET -> getPartnerSummary(id)    (manager+)
  unattributed.ts    GET -> getUnattributed()        (manager+)
```

Thin handlers: `isManagerOrAbove` check (403 else) → call `lib/finance/revenue.ts` → `{ data }`.

### 6.6 What pages display

- **Dashboard:** grand revenue / our cut / profit; per-partner cards (revenue, our cut, profit); Unattributed line if > 0.
- **Partner page:** that partner's revenue, our cut, profit together; property list (drill to sub-page).
- **Property sub-page:** customers (count + each lead revenue), property revenue.
- Visual design from 21st.dev — this spec fixes the **data contract** (`PartnerSummary`, `PropertyRevenue`, `FmsTotals`), not pixels.

---

## 7. Guard rails (defend the top-5 break paths)

| #   | Risk                                                                    | Defense                                                                                                                             |
| --- | ----------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Query forgets `vacated_at IS NULL` → silent inflation                   | `active_finance` (security_invoker) + **ESLint rule** forbidding raw `lead_finance` reads outside `lib/finance/`.                   |
| 2   | `deal_duration` typo in range                                           | CHECK 1–12 (absurd) + `finance_audit` with real actor (traceable).                                                                  |
| 3   | Property→partner reassignment moves history                             | `finance_audit` logs `partner_id` change. v1 accepts + traces.                                                                      |
| 4   | `commission_percentage` edited                                          | `finance_audit` logs it. v2 time-scopes.                                                                                            |
| 5   | Null partner_id silently dropped                                        | LEFT JOIN + visible Unattributed page.                                                                                              |
| 6   | Orphan finance row (created, but funnel write failed) counts as revenue | Kapora flow **compensates**: vacate the row if the funnel write throws (§4.2). Guard catches the opposite (status flipped, no row). |
| 7   | SECURITY DEFINER RPC callable by anon → finance tampering               | RPCs `EXECUTE`-revoked from `PUBLIC`, granted only to `service_role` (§1, §4.3); verified in §8 item 5.                             |

**ESLint rule:**

```js
'no-restricted-syntax': ['error', {
  selector: "CallExpression[callee.property.name='from'][arguments.0.value='lead_finance']",
  message: "Read 'active_finance' (filters vacated rows), not 'lead_finance' directly.",
}],
```

Creation now goes through the `fms_create_finance_row` RPC (a `.rpc(...)` call, not `from('lead_finance')`), and arrangement changes through `fms_record_finance_change`, so neither trips the rule. The only remaining raw `from('lead_finance')` access is the **compensating vacate** in `lib/finance/create-finance-row.ts` (`.update({ vacated_at })`) — carve that file out (writes are fine; the rule's intent is to stop forgetting `vacated_at IS NULL` on **reads**).

---

## 8. Pre-build verification (mostly confirmed against live DB)

Confirmed by review: `room_types.hotel_id`, `properties.hotel_name`/`partner_id`, `partners.id`/`name`, `lead_details.lead_uuid`, `leads.has_moved_in`/`is_deleted`, archived-soft model, ASCII slugs, FK name, role set. Still verify at build time:

1. After applying 0096, run `get_advisors` → **no `security_definer_view`** warning on `active_finance` (confirms `security_invoker` took).
2. `get_user_role()` returns exactly `'salesperson'`/`'operator'`/`'manager'`/`'superadmin'`/`'partner_operator'` (RLS keys on partner_operator only, so spelling of the others is non-critical, but confirm `is_partner_operator()` and `is_manager_or_superadmin()` behave as expected).
3. The post-check on the FK re-point returns `ON DELETE RESTRICT`.
4. `operator` is genuinely meant to write finance (confirmed: operator can advance to any stage incl. kapora → yes).
5. **RPC EXECUTE is locked down**: `fms_create_finance_row`, `fms_record_finance_change`, `fms_revenue_breakdown` are NOT EXECUTEable by `anon`/`authenticated`/`public` (post-check query in the migration returns zero rows). The app's `service_role` client can still call them.
6. The kapora flow **compensates on funnel-write failure** (vacates the just-created row) — covered by a unit/integration test that forces step 3 to throw and asserts no active row remains.

---

## 9. v2 parking lot (do NOT build now)

- Collected-amount tracking (vs contracted).
- Year-to-year cohort isolation.
- Real-estate commission multiplexer (resolve in `calculatePartnerCommission`).
- Upfront fees (per-partner, some exempt).
- Academic House tiered commission (x% to 100M TRY, y% above).
- Revenue over time / monthly.
- PMS sidebar retrofit (adopt FeatureShell `navOverride`).
- Property→partner reassignment correction tooling.
- Batched commission (`calculatePartnerCommissionBatch`) if partner count grows.
- **Lost / refunded revenue recognition (OPEN DECISION).** A finance row is NOT vacated when a won lead later goes `lost`, so v1 counts backed-out/refunded customers in _contracted_ revenue until a manager vacates the row manually. Auto-vacate-on-lost is intentionally deferred: `lost → recovery` (via `leads.funnel_status_before_lost`) would silently drop revenue with no row to restore. Decide the recognition rule with the business before automating; until then losses are a manual vacate, traceable in `finance_audit`.

---

## 10. Build order

1. Apply `0096`; run post-checks + `get_advisors`; `pnpm gen:types`.
2. `lib/finance/commission.ts`, `lib/finance/revenue.ts` + unit tests (revenue math; unattributed surfaces; vacated excluded; commission via chokepoint; archived-but-active counted).
3. `lib/finance/kapora-gate.ts` + `create-finance-row.ts` (calls `fms_create_finance_row`, exposes `vacateFinanceRow` for compensation) + `record-change.ts` (calls `fms_record_finance_change`); wire into `advance-stage.ts`/`update-lead.ts` with **finance-row-before-funnel-write** ordering **and compensating vacate on funnel-write failure** (§4.2).
4. ESLint rule (§7).
5. `FeatureShell` (`navOverride` on AppShell) + `FmsShell`.
6. `pages/api/fms/*` thin handlers.
7. `pages/fms/*` pages against the fixed data contract (visuals from 21st.dev).
8. AppShell guard + sidebar FMS button (manager+), kept off partner nav.
9. Manual reconcile: backfill totals vs a hand count; Unattributed bucket reconciles; `finance_audit` populating with real actor ids.

---

**End of spec.** Breakable parts (migration, `active_finance`, `fms_revenue_breakdown`, `fms_record_finance_change`, commission chokepoint, RLS) are written exactly. The rest is structure against the fixed data contract.
