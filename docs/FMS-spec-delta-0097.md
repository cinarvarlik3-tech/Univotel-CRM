# FMS Spec — Delta 0097 (Season Pricing + Vacate Ruleset)

**Applies on top of:** `FMS-spec.md` + migration `0096`, then migration `0097`.
**Read this after the base spec.** It changes the price source (now seasonal/month-based), adds the move-in-month input, adds the automatic vacate rules, and adds the kapora toggle. Where this delta and the base spec disagree, **this delta wins.**

---

## A. What changed and why

The business has **seasonal pricing**: a ~3-month summer rate and a ~9-month academic rate per room, updated annually for inflation. The price a customer pays is **one frozen rate for the whole contract**, chosen by their **move-in month**. A stay spanning seasons = **multiple contracts** (multiple finance rows drawn sequentially). There is **no carried-over / pre-agreed rate** — every contract takes the season's price at the time it's drawn.

So `room_types.default_price` (a single number) is replaced as the price source by **`room_type_prices`** (month-bounded periods). **`default_price` is deprecated as of 0097**; every sellable room must have a `room_type_prices` period or the kapora gate blocks it.

Migration 0097 also closes the **lost/dropped-deal pollution hole**: finance rows are now automatically vacated when a deal exits the financial zone, so dead deals never pollute revenue.

---

## B. Pricing model (replaces base spec §4's "copy default_price")

### B1. Price source: `room_type_prices`

Month-bounded periods per room type (0097 §1). Columns: `room_type_id`, `price` (monthly TRY), `valid_from_month` (YYYY-MM-01, inclusive), `valid_until_month` (YYYY-MM-01 inclusive, or NULL = open-ended), `label` ("summer"/"academic"/…). Summer and academic are two rows; next year's inflation update is new rows with next year's months. **Adding a season never changes the schema.**

### B2. Move-in collected as a MONTH, not a date

At kapora, the salesperson asks the customer for a **move-in month** ("September"), not an exact date. Stored/passed as `YYYY-MM` (or any date in that month; the DB normalizes with `date_trunc('month', ...)`). This is the 4th gated input at kapora.

### B3. Price resolution — `fms_price_for_month(room_type_id, move_in_month)`

Returns the monthly price whose period covers that month, or **NULL if none** → the kapora gate **blocks** ("no price defined for September for this room — define it before taking a deposit"). Same rule as the unpriced-room block in the base spec, now per-month.

### B4. The frozen value

`fms_create_finance_row(...)` (0097 §4) resolves the seasonal price by `move_in_month`, **freezes** it into `lead_finance.monthly_payment`, and **snapshots the month** into `lead_finance.move_in_month`. Everything downstream — `effective_monthly`, `lead_revenue`, partner rollups, commission — is **unchanged**. The only difference vs the base spec is _where the frozen number comes from_ (a dated lookup instead of `default_price`).

### B5. Kapora gate — updated input set

Block the `kapora-alindi` transition unless ALL of:

1. `purchased_room` set, **and**
2. `move_in_month` provided, **and**
3. a `room_type_prices` period covers that month for that room (`fms_price_for_month` not NULL), **and**
4. `deal_duration` provided (default 9, 1–12), **and**
5. `discount` provided (default 0, `0 ≤ discount ≤ resolved monthly price`).

`assertKaporaFinanceReady()` now takes `moveInMonth` and calls `fms_price_for_month` to both validate (3) and return the frozen price for (5)'s bound.

---

## C. Write path (replaces base spec §4.2 / §4.3 RPC signatures)

Both RPCs now take `move_in_month` and resolve the price server-side (the caller no longer passes a price — the DB freezes it, single source of truth):

- **Create on kapora entry:** `fms_create_finance_row(lead_id, purchased_room, move_in_month, discount, deal_duration, actor_id)`. Still ordered **finance-row-first, then funnel write** (base spec §4.2 ordering stands).
- **Re-confirm / room change / extension:** `fms_record_finance_change(lead_id, purchased_room, move_in_month, discount, deal_duration, actor_id)` — atomic vacate+insert, price resolved by month.

**Direct PATCH guard:** `pages/api/leads/[id].ts` rejects PATCH that sets `funnel_status` to `kapora-alindi` or `sozlesme-imzalandi`. All financial-zone transitions go through the finance-aware advance-stage API (or loss recovery with finance inputs — §D2). Advance-stage also rejects skipping kapora (e.g. jumping straight to `sozlesme-imzalandi` without being at `kapora-alindi`).

`recordFinanceChange` / `createFinanceRow` TS wrappers drop the `monthlyPayment` argument (the DB resolves it) and add `moveInMonth`. Collect `move_in_month` in `PurchasedRoomDialog` for both kapora (`required`) and sözleşme (`confirm`, pre-filled from the active row's `move_in_month`).

> **Extension = new contract:** when a customer extends, the salesperson draws a new contract → `fms_record_finance_change` with the new term's move-in month → picks that season's (possibly higher / inflation-updated) price, vacates the old row, inserts the new. The append-only ledger keeps both. No special path needed — it's just a record-change.

---

## D. Vacate ruleset (NEW — base spec had no auto-vacate)

**Vacate is a pure function of funnel transitions. `is_archived` is NEVER consulted.** Implemented as DB trigger `fn_vacate_finance_on_exit` (0097 §6) so every path (advance-stage, visit-ops, direct PATCH, anything) is covered with no app code.

| Transition                                                                    | Finance row                                                                 |
| ----------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| Enter `kapora-alindi` (from below)                                            | **Create** (app code; re-entry after a prior vacate makes a NEW active row) |
| **Lost** (from any stage)                                                     | **Vacate. Always.** Trumps everything. Archiving later does NOT un-vacate.  |
| Drop from `kapora-alindi`/`sozlesme-imzalandi` to any stage **before kapora** | **Vacate** (left the financial zone)                                        |
| `kapora-alindi` ↔ `sozlesme-imzalandi` (between the two financial stages)     | **NOT a vacate** — re-confirm via `fms_record_finance_change`               |
| Forward to moved-in / moved-in rows                                           | **Stay active** (protected by STAGE)                                        |
| Archive (`is_archived = true`)                                                | **Irrelevant** — never triggers or prevents a vacate                        |

**Critical framing for implementation:** a moved-in customer archived after 80 days keeps its active finance row because it is _moved-in_, not because of any archive rule. A lost lead archived after 80 days stays vacated because _lost_ vacated it. Archive is invisible to the finance row's active/vacated state — do not write any archive-based vacate logic.

The "before kapora" set is hardcoded in the trigger (every `FUNNEL_STATUSES` entry before `kapora-alindi`) with `lib/constants.ts` cited as source of truth. Keep in sync if the funnel order changes (rare).

### D1. Re-entry safety

Because dropping below kapora vacates the row, a re-closed lead (dropped, then advanced to kapora again) must get a **fresh** row. `fms_create_finance_row` fires on **every** entry into kapora (`OLD <> 'kapora-alindi' AND NEW = 'kapora-alindi'`), not once-per-lead-lifetime. The prior row is vacated, so the unique index permits the new active row. Verify the create hook is entry-triggered, not first-time-only — otherwise re-closed customers silently vanish from revenue.

### D2. Lost recovery → new contract (not silent restore)

When a lead recovers from `lost` back into a financial stage (`funnel_status_before_lost` is `kapora-alindi` or `sozlesme-imzalandi`, via clearing `loss_reason` in `applyLossReasonUpdate`), the vacated finance row is **not** silently restored — the season may have changed, so price must be **re-resolved**.

Recovery into a financial stage is a **new-contract event**:

- **`kapora-alindi` recovery:** `fms_create_finance_row` with fresh `move_in_month`, `deal_duration`, `discount`, `purchased_room` — same inputs as kapora entry.
- **`sozlesme-imzalandi` recovery:** `fms_record_finance_change` with the same inputs (atomic vacate+insert; prior row already vacated on lost).

Finance row is created **before** the funnel write (same ordering as kapora entry). If finance inputs are missing, the recovery transition is **blocked** (same gate as kapora entry). Direct PATCH may not set `funnel_status` to either financial stage — recovery must supply finance fields on the PATCH that clears `loss_reason`.

`fn_finance_row_guard` logs when **either** financial stage is entered with no active finance row (not just kapora).

---

## E. Kapora toggle — "kaporadakileri göster"

`fms_revenue_breakdown(p_include_kapora boolean default false)` (0097 §7):

- **Default (false):** **contracted** revenue — excludes leads currently at `kapora-alindi`. This is the FMS headline number.
- **true:** adds kapora-stage deposits back ("kaporadakileri göster" button).

Lost/dropped customers are already vacated, so they're absent from `active_finance` in **both** modes — the toggle only governs the kapora-vs-signed split among live rows.

### E1. App changes

- `getFmsTotals(includeKapora = false)` passes the flag to the RPC. The FMS dashboard renders the default (contracted) number and a **"Kaporadakileri göster"** toggle that re-fetches with `includeKapora = true`.
- `getPartnerSummary` / `getUnattributed` / `getPropertyCustomers` accept the same flag so the toggle is consistent across all FMS pages, not just the dashboard.
- The toggle is a single boolean threaded through the one revenue module — no second query.

---

## F. Backfill (updates base spec §10 backfill)

The base 0096 backfill copied `room_types.default_price`. With seasonal pricing, existing won customers need a price resolved by their move-in month — but historical leads may not have a clean move-in month recorded. Approach:

1. **Seed `room_type_prices` first** (managers enter current summer + academic periods per room).
2. For existing won customers **with** a usable move-in month: resolve via `fms_price_for_month` and insert the finance row with the frozen seasonal price.
3. For those **without** a usable move-in month, or whose month has no covering period: **log `BACKFILL_SKIPPED`** (reason: no move-in month / month unpriced) for manual entry. Do not guess a price.

> Practically: backfill is best run as a **script after price seeding**, not inline in the migration, since it depends on manually-entered prices that don't exist at migration time. Move the backfill out of 0097 into `scripts/backfill-finance.ts` (service-role), runnable once prices are seeded, idempotent via the one-active-row guard. The 0096 inline backfill should be treated as superseded — do not rely on `default_price` for backfill once seasonal pricing exists.

---

## G. Updated v2 parking lot

Unchanged from base, minus the resolved items. Still deferred:

- Collected-amount tracking (vs contracted).
- Year-to-year cohort isolation.
- Real-estate commission multiplexer.
- Upfront fees (per-partner, some exempt).
- Academic House tiered commission (x% to 100M, y% above).
- Revenue over time / monthly.
- PMS sidebar retrofit.
- Batched commission (N+1).
- **Overlap prevention on `room_type_prices`** via `btree_gist` exclusion constraint (commented in 0097 §1) — enable once `btree_gist` availability is confirmed; until then the resolver's "most specific wins" handles accidental overlaps and an admin-side check should prevent them.

---

## H. Build order delta

Insert between base-spec Phase 0 and Phase 1:

- **0a.** Apply `0097` after `0096`; run its post-checks; `pnpm gen:types`; `get_advisors`.
- **0b.** Build a room-price admin surface (managers seed `room_type_prices` — summer + academic periods per room). Without seeded prices, the kapora gate blocks every deal, so this gates everything else going live.

Then base-spec phases, with these substitutions:

- Phase 1 `kapora-gate.ts` / `create-finance-row.ts` / `record-change.ts` use the **month-based** RPC signatures (§C).
- Phase 2 `PurchasedRoomDialog` collects **move-in month** (§B2).
- Add the **vacate trigger** awareness to tests: dropping below kapora or to lost vacates; moving kapora↔sözleşme does not; archive does nothing.
- Add the **kapora toggle** to the dashboard and thread `includeKapora` through the revenue module (§E).
- Replace inline backfill with the **post-price-seeding script** (§F).

---

**End of delta.** Net effect: price comes from `room_type_prices` by move-in month (frozen per contract); dead deals auto-vacate on exit/lost (archive-blind); the dashboard defaults to contracted revenue with a kapora toggle. The ledger, commission chokepoint, RLS, and revenue math from 0096 are otherwise untouched.
