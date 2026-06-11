# Univotel CRM — Major Update Implementation Plan

**Date:** 2026-06-11
**Author:** Çınar (Lead Software Engineer) + Claude (architecture planning)
**Target:** Claude Code implementation
**Production:** https://panel.marketinguni.app
**Stack:** Next.js 15 Pages Router, Cloudflare Workers, Supabase Postgres, TypeScript, Zod, shadcn/ui

---

## Overview

This document is the authoritative implementation plan for the CRM Major Update. It was produced through a 49-question architectural review between the lead engineer and Claude. Every structural decision referenced here has been explicitly confirmed. Claude Code should treat this as the spec — do not deviate from stated decisions without consulting the lead engineer.

The update transforms the CRM from a flat lead list into purpose-built workstations for each sales phase, introduces a self-service Lead Hub, revamps the task system with auto-tasks, adds visit and move-in calendars, consolidates lost states, and introduces several new boolean flags.

### Key architectural principles (carried from existing system)

- `lib/` = business logic (no React). `pages/api/` = thin handlers. `components/` = UI only.
- Service role (`lib/supabase/service.ts`) for webhooks, cron, imports — never import from `pages/api/`.
- TEXT + CHECK constraints instead of Postgres enums — canonical lists in `lib/constants.ts`.
- API envelope: `{ data: T }` / `{ error: string }` via `lib/api-helpers.ts`.
- Turkish funnel slugs — use constants, do not invent English slugs.
- Zod at API boundaries and webhook payloads.
- After any migration: `pnpm gen:types`.

---

## 1. Funnel status changes

### New funnel enum (ordered)

```
yeni → bilgi-verildi → aranacak → arandi → arandi-acmadi → bizi-aradi-konustuk → ziyaret → ziyaret-etmedi → ziyaret-etti → teklif-gonderildi → kapora-alindi → sozlesme-imzalandi → lost
```

### Changes from current

| Action     | Details                                                                                                                                                          |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Add**    | `bilgi-verildi` — new status for "informed via text." Positioned after `yeni`, before `aranacak`. Chatwoot label: `bilgi-verildi`. Display name: "Bilgi Verildi" |
| **Remove** | `ilgilenmiyor` — remap existing rows to `lost`, backfill `funnel_status_before_lost` if NULL, preserve `loss_reason`                                             |
| **Remove** | `ziyaret-ama-almayacak` — same remap as above                                                                                                                    |
| **Remove** | `24h_window_warning` — replaced by boolean `is_24h_restricted` (see §3)                                                                                          |

### Compartment mapping (pseudo-names for kanban)

| Compartment        | Funnel stages                                    |
| ------------------ | ------------------------------------------------ |
| Cold               | `yeni`                                           |
| Expecting Call     | `aranacak`, `arandi-acmadi`                      |
| Nurture            | `arandi`, `bilgi-verildi`, `bizi-aradi-konustuk` |
| Will Visit         | `ziyaret`                                        |
| Failed Visit       | `ziyaret-etmedi`                                 |
| Post Visit Nurture | `ziyaret-etti`, `teklif-gonderildi`              |
| Downpayment        | `kapora-alindi`                                  |
| Deal Signed        | `sozlesme-imzalandi`                             |

`lost` is excluded from the compartment kanban view. Boolean states (`is_24h_restricted`, `has_moved_in`) are excluded from kanban entirely — they have dedicated tables.

### Lost status rules

- `loss_reason` is **always required** when marking a lead as `lost`. No exceptions.
- `funnel_status_before_lost` is always set on transition to `lost`.
- Leaving `lost` restores `funnel_status_before_lost` unless an explicit new stage is set.

### Kanban view

Two toggleable modes via button:

1. **Funnel stages** — one column per funnel status (existing behavior, updated enum)
2. **Compartments** — grouped columns per the mapping above (lost excluded)

Both modes get the "Show All / relevant only" toggle (see §4 for relevance definition).

---

## 2. New boolean flags

### `has_moved_in` (leads table)

- Type: `BOOLEAN DEFAULT false`
- Can only be set `true` if `funnel_status` is `sozlesme-imzalandi`. Enforce with CHECK or application logic.
- When set `true`, `actual_move_in_date` (see §5) must also be set.
- Leads with `has_moved_in = true` are "finalized" and hidden from default views.

### `is_24h_restricted` (leads table)

- Type: `BOOLEAN DEFAULT false`
- Set `true` via Chatwoot label sync (inbound label `24h_window_warning` maps to this boolean instead of funnel status).
- Can only be cleared by **superadmin** (manual action in CRM).
- Funnel status is **unchanged** when this flag is set — lead keeps its current stage.
- Leads with `is_24h_restricted = true` are hidden from default views but visible in the dedicated 24h Restricted table.

### `move_in_date_set` (leads table)

- Type: `BOOLEAN DEFAULT false`
- Set `true` automatically when `lead_details.move_in` is populated with a concrete date AND `funnel_status` is `kapora-alindi` or `sozlesme-imzalandi`.
- Gating: cannot be `true` if funnel status is below `kapora-alindi`.
- Hierarchy is strictly sequential: `kapora-alindi` → `sozlesme-imzalandi` → `has_moved_in = true`.

---

## 3. Relevance definition

"Relevant" leads are the default view. "Irrelevant" leads are shown only with the "Show All Leads" toggle (manager+ only).

**Irrelevant (hidden by default):**

- `funnel_status = 'lost'`
- `funnel_status = 'sozlesme-imzalandi'`
- `has_moved_in = true`
- `is_24h_restricted = true`

**`deal_awaiting = true`** remains a separate concept — parked leads are excluded from main pipeline but are NOT "irrelevant." They live in their existing `/deal-awaiting` page. This concept survives unchanged.

---

## 4. New database tables

### 4.1 `visits` table

Purpose: Track scheduled, attended, and failed property visits. One row per visit attempt (history preserved — failed visits stay, rescheduling creates a new row).

```sql
CREATE TABLE visits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_uuid UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES properties(id),
  scheduled_date TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'attended', 'failed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES salespeople(id),
  notes TEXT
);

CREATE INDEX idx_visits_lead ON visits(lead_uuid);
CREATE INDEX idx_visits_property_date ON visits(property_id, scheduled_date);
CREATE INDEX idx_visits_status ON visits(status);
CREATE INDEX idx_visits_scheduled_date ON visits(scheduled_date);
```

**RLS:** All authenticated salespeople can READ all visit rows (calendar visibility across properties). INSERT/UPDATE restricted to the lead's assignee or manager+. Managers see a central calendar; salespeople see visits divided by property.

**Visit scheduling side effect:** When a visit row is created, the lead's `funnel_status` auto-advances to `ziyaret`. This is application logic in the visit creation endpoint, not a database trigger.

**Visit status transitions:**

- `scheduled` → `attended` (salesperson marks manually)
- `scheduled` → `failed` (salesperson marks manually; creates follow-up auto-task)
- `failed` → (rescheduling creates a NEW row with `scheduled` status)

### 4.2 `move_in_records` table (optional — evaluate if `lead_details` fields suffice)

The planned/preferred move-in date stays in `lead_details.move_in` (repurposed to DATE type). A new field `lead_details.actual_move_in_date` (DATE, nullable) records when they actually moved in. When `actual_move_in_date` is set, `has_moved_in` flips to `true`.

**No separate move-in table needed** — the move-in calendar queries `lead_details` where `move_in IS NOT NULL AND move_in_date_set = true`, joined with `leads` for funnel/assignment data.

**Move-in calendar RLS:** Same model as visit calendar — open read for all salespeople (divided by property), managers see central view. The property for move-in calendar grouping comes from `lead_details.interested_hotel` or a dedicated field if needed.

---

## 5. Altered columns and fields

### `lead_details.move_in`

- **Current:** TEXT field (preference/timeline)
- **Change:** Repurpose to `DATE` type. Migration must convert existing text values where possible, NULL where not parseable.
- **Gating:** Can only be populated when `funnel_status IN ('kapora-alindi', 'sozlesme-imzalandi')`.

### `lead_details.actual_move_in_date`

- **New column:** `DATE`, nullable
- When set, `leads.has_moved_in` is set to `true` (application logic or trigger).

### `leads` table new columns

- `has_moved_in BOOLEAN NOT NULL DEFAULT false`
- `is_24h_restricted BOOLEAN NOT NULL DEFAULT false`
- `move_in_date_set BOOLEAN NOT NULL DEFAULT false`

### `tasks` table new columns

- `is_auto_created BOOLEAN NOT NULL DEFAULT false` — distinguishes auto-tasks from manual. Stage transition cancellation only affects rows where `is_auto_created = true`.
- `auto_task_type TEXT` — nullable, values like `nurture_reminder`, `visit_reminder`, `move_in_reminder`, `visit_resolution`, `failed_visit_followup`. Used for cancellation targeting and UI display.

---

## 6. Migration plan

Execute migrations sequentially. Each migration should be a single file in `supabase/migrations/`. Current latest is `0061`.

### Migration 0062 — Funnel status consolidation

```sql
-- 1. Add bilgi-verildi to CHECK constraint
-- 2. Remap ilgilenmiyor → lost
UPDATE leads
SET funnel_status = 'lost',
    funnel_status_before_lost = COALESCE(funnel_status_before_lost, 'yeni'),
    loss_reason = COALESCE(loss_reason, 'ilgilenmiyor')
WHERE funnel_status = 'ilgilenmiyor';

-- 3. Remap ziyaret-ama-almayacak → lost
UPDATE leads
SET funnel_status = 'lost',
    funnel_status_before_lost = COALESCE(funnel_status_before_lost, 'ziyaret-etti'),
    loss_reason = COALESCE(loss_reason, 'ziyaret-ama-almayacak')
WHERE funnel_status = 'ziyaret-ama-almayacak';

-- 4. Remap 24h_window_warning → set boolean, restore prior stage
-- (Leads with 24h_window_warning need their funnel_status_before_lost or default to yeni)

-- 5. Remove old values from CHECK constraint
-- 6. Update archived_leads similarly if applicable
-- 7. Make loss_reason NOT NULL when funnel_status = 'lost' (CHECK constraint)
```

### Migration 0063 — New boolean columns on leads

```sql
ALTER TABLE leads ADD COLUMN has_moved_in BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE leads ADD COLUMN is_24h_restricted BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE leads ADD COLUMN move_in_date_set BOOLEAN NOT NULL DEFAULT false;
```

### Migration 0064 — Visits table

Full CREATE TABLE as specified in §4.1, with indexes and RLS policies.

### Migration 0065 — Lead details changes

```sql
-- Repurpose move_in to DATE (handle existing text data)
-- Add actual_move_in_date DATE column
ALTER TABLE lead_details ADD COLUMN actual_move_in_date DATE;
```

### Migration 0066 — Task system additions

```sql
ALTER TABLE tasks ADD COLUMN is_auto_created BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE tasks ADD COLUMN auto_task_type TEXT;
```

### Migration 0067 — Backfill 24h_window_warning leads

```sql
-- For any leads currently at 24h_window_warning:
UPDATE leads
SET is_24h_restricted = true,
    funnel_status = COALESCE(funnel_status_before_lost, 'yeni')
WHERE funnel_status = '24h_window_warning';
```

**After all migrations:** `pnpm gen:types`

---

## 7. Assignment system overhaul

### Current system (REMOVED)

The automatic assignment algorithm in `lib/leads/assign.ts` (pool filter, language/hotel narrowing, tie-break) is **scrapped entirely**.

### New system: Lead Hub self-service

- All new leads are created with `assigned_to = NULL`.
- Leads land in Lead Hub.
- Any authenticated user (salesperson, manager, superadmin) can claim a lead from Lead Hub.
- Claiming sets `assigned_to = claimer's UUID`, removes lead from Lead Hub, shows in claimer's My Leads.
- **Optimistic lock:** First write wins. If two users claim simultaneously, second gets an error ("Lead already claimed").
- **No guardrails:** No max active lead count check, no language/hotel matching on claim.
- Lead stays at its current funnel stage on claim (typically `yeni`).
- The `active_lead_count` increment/decrement logic on `salespeople` should still be maintained for analytics.

### Claim API

```
POST /api/leads/[id]/claim
Auth: Session (any role)
Body: {} (no payload needed)
Logic:
  1. SELECT assigned_to FROM leads WHERE id = :id FOR UPDATE
  2. If assigned_to IS NOT NULL → 409 { error: "Lead already claimed" }
  3. UPDATE leads SET assigned_to = session.user.id
  4. Increment active_lead_count
  5. Return { data: { claimed: true } }
```

### Soft home-property signal

Lead Hub list displays a visual indicator (icon, badge, or subtle highlight) on leads whose `interested_hotel` includes a property matching the viewing salesperson's home property. This is UI-only — no backend filtering.

### Impact on existing code

- `lib/leads/assign.ts` — keep the file but the `assignLead()` function is no longer called on lead creation. It may be retained for potential future manager-reassignment flows.
- `lib/leads/create-lead.ts` — remove the `assignLead()` call. New leads always get `assigned_to = NULL`.
- Webhook processors (Chatwoot, NetGSM) — same change, no auto-assignment.
- `incrementActiveLeadCount` / `decrementActiveLeadCount` — still used, but triggered by claim/unclaim/archive/unarchive.

---

## 8. Lead reactivation (before and after 80 days)

### Before 80 days (lead still active, flagged `lost`)

When a Chatwoot webhook matches an existing lead that has `funnel_status = 'lost'`:

1. Clear `funnel_status` → `yeni` (NOT restore `funnel_status_before_lost` — it's a fresh start)
2. Clear `loss_reason`
3. Set `assigned_to = NULL` (lead returns to Lead Hub)
4. Decrement previous assignee's `active_lead_count` if applicable
5. Normal webhook processing continues (message sync, etc.)

**Implementation location:** `lib/webhooks/process-chatwoot.ts` → in the existing-lead merge path, add a check for `lost` status.

### After 80 days (lead archived)

Change deduplication to also check `archived_leads`:

1. `findExistingLead` in `lib/leads/deduplicate.ts` — add a secondary query against `archived_leads` when no active match found
2. If archived match found → call `unarchive_single_lead(uuid, NULL)`
3. Set `funnel_status = 'yeni'`, `assigned_to = NULL` (Lead Hub)
4. Normal lead pipeline continues — no new lead created, history preserved

---

## 9. New and modified API endpoints

### New endpoints

| Route                    | Method | Auth          | Purpose                                                                  |
| ------------------------ | ------ | ------------- | ------------------------------------------------------------------------ |
| `/api/leads/[id]/claim`  | POST   | Session (any) | Self-assign from Lead Hub                                                |
| `/api/visits`            | GET    | Session       | List visits (filterable by property, date range, status)                 |
| `/api/visits`            | POST   | Session       | Schedule a visit (creates visit row + auto-advances funnel to `ziyaret`) |
| `/api/visits/[id]`       | PATCH  | Session       | Update visit status (attended/failed), reschedule                        |
| `/api/leads/[id]/visits` | GET    | Session       | Get all visits for a specific lead                                       |

### Modified endpoints

| Route                              | Change                                                                                                     |
| ---------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `POST /api/leads` (manual create)  | Remove auto-assignment, always `assigned_to = NULL`                                                        |
| `PATCH /api/leads/[id]`            | Handle `is_24h_restricted` (superadmin only for clearing), `has_moved_in`, `move_in_date_set` gating logic |
| `PATCH /api/lead-details/[leadId]` | Handle `move_in` DATE type, `actual_move_in_date` → auto-set `has_moved_in`                                |
| `GET /api/leads`                   | Add support for relevance filter (`relevant_only=true` default), `is_24h_restricted` filter                |
| `GET /api/leads/pipeline`          | Support compartment grouping mode                                                                          |

### Webhook processor changes

| Processor              | Change                                                                                                                                                                                                                                    |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `process-chatwoot.ts`  | Map `24h_window_warning` label to `is_24h_restricted = true` instead of funnel status. Handle lost lead reactivation on new message. Remove `ilgilenmiyor` and `ziyaret-ama-almayacak` label handling. Add `bilgi-verildi` label mapping. |
| `process-netgsm.ts`    | Remove auto-assignment call.                                                                                                                                                                                                              |
| All webhook processors | `createLeadFromWebhook` no longer calls `assignLead()`.                                                                                                                                                                                   |

---

## 10. Chatwoot sync updates

### Label changes

| Action    | Label                   | Details                                                                                                                        |
| --------- | ----------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| **Add**   | `bilgi-verildi`         | Maps to `leads.funnel_status = 'bilgi-verildi'`                                                                                |
| **Remap** | `ilgilenmiyor`          | Remove from funnel label set. If received from Chatwoot, treat as `lost` with `loss_reason = 'ilgilenmiyor'`                   |
| **Remap** | `ziyaret-ama-almayacak` | Same — treat as `lost` with `loss_reason = 'ziyaret-ama-almayacak'`                                                            |
| **Remap** | `24h_window_warning`    | No longer a funnel label. Maps to `leads.is_24h_restricted = true`. Outbound: push this label when `is_24h_restricted` is set. |
| **Keep**  | `kayip`                 | Chatwoot label name stays `kayip`, maps to CRM `lost`                                                                          |

### `getLabelFieldTargets` update in `lib/constants.ts`

- Add `bilgi-verildi` → `{ table: 'leads', column: 'funnel_status', value: 'bilgi-verildi' }`
- Remove `ilgilenmiyor` and `ziyaret-ama-almayacak` from funnel label targets
- Change `24h_window_warning` from funnel target to boolean target: `{ table: 'leads', column: 'is_24h_restricted', value: true }`

### Outbound sync

When CRM sets `is_24h_restricted = true`, push `24h_window_warning` label to Chatwoot.
When CRM clears `is_24h_restricted` (superadmin), remove the label from Chatwoot.

Two-way sync continues for all other labels — updates flow in parallel between CRM and Chatwoot.

---

## 11. Task system revamp

### Auto-task types

| `auto_task_type`              | Trigger                                                         | Assigned to     | Behavior                                                                                                                                                                                       |
| ----------------------------- | --------------------------------------------------------------- | --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `nurture_reminder`            | Lead enters `arandi`, `bilgi-verildi`, or `bizi-aradi-konustuk` | Lead's assignee | Recurring alert: beginning of shift + end of shift. Single standing task, not one-per-day. Visual indicator in CRM: "This lead hasn't been contacted today yet"                                |
| `post_visit_nurture_reminder` | Lead enters `ziyaret-etti` or `teklif-gonderildi`               | Lead's assignee | Same mechanic as nurture_reminder                                                                                                                                                              |
| `visit_reminder`              | Visit row created (scheduled)                                   | Lead's assignee | One-time alert 1 day prior to `visits.scheduled_date`. Reminder text includes property name. If visit is rescheduled (new row), old reminder task is cancelled, new one created.               |
| `move_in_reminder`            | `move_in_date_set = true`                                       | Lead's assignee | One-time alert 1 week prior to `lead_details.move_in` date.                                                                                                                                    |
| `visit_resolution`            | Visit row created                                               | Lead's assignee | Created for the shift-end of the day `visits.scheduled_date` falls on. Pings salesperson to update visit status. If not resolved, keeps pinging each subsequent shift-end until status is set. |
| `failed_visit_followup`       | Visit status set to `failed`                                    | Lead's assignee | Call task: contact lead about failed visit. After call, salesperson moves lead to appropriate stage (lost, reschedule via new visit, back to nurture, etc.)                                    |

### Auto-task lifecycle

- **Creation:** Triggered by funnel stage transition or visit/move-in scheduling.
- **Cancellation:** When a lead changes funnel stage, all open tasks where `is_auto_created = true` for that lead are cancelled (set to completed/cancelled status). New auto-tasks for the new stage are then created.
- **Manual tasks survive:** Tasks where `is_auto_created = false` are never affected by stage transitions.
- **Recurring tasks (nurture):** The task itself is a single standing task. Shift-start and shift-end alerts are notification events tied to the task, using the salesperson's `shift_start`/`shift_end` from the `salespeople` table.

### Visual indicator: "Not contacted today"

On lead cards in Nurture and Post Visit Nurture tables, display a visual warning if `contact_history` has no entry for today (Istanbul timezone) for that lead. This is a UI computation, not a stored field.

### Task cancellation implementation

```typescript
// lib/tasks/auto-tasks.ts
async function cancelAutoTasksForLead(leadUuid: string) {
  await supabaseService
    .from('tasks')
    .update({ status: 'cancelled', updated_at: new Date().toISOString() })
    .eq('lead_uuid', leadUuid)
    .eq('is_auto_created', true)
    .in('status', ['pending', 'open']);
}

async function createAutoTasksForStage(leadUuid: string, funnelStatus: string, assignedTo: string) {
  const taskType = getAutoTaskTypeForStage(funnelStatus);
  if (!taskType) return;
  // Insert appropriate auto-task(s)
}
```

### Integration point

`lib/leads/update-lead.ts` — when `funnel_status` changes:

1. `cancelAutoTasksForLead(leadUuid)`
2. `createAutoTasksForStage(leadUuid, newStatus, assignedTo)`

---

## 12. Frontend: New pages and navigation

### Sidebar navigation (flat list)

```
Leads            → /leads           (manager+ only)
Lead Hub         → /lead-hub        (all)
My Leads         → /leads/mine      (all)
Expecting Call   → /leads/expecting-call   (all)
Nurture          → /leads/nurture          (all)
Visit Calendar   → /visits                 (all)
Post Visit       → /leads/post-visit       (all)
24h Restricted   → /leads/24h-restricted   (all)
Downpayment      → /leads/downpayment      (all)
Deal Signed      → /leads/deal-signed      (all)
Move-in Calendar → /move-in                (all)
Moved In         → /leads/moved-in         (all)
Deal Awaiting    → /deal-awaiting          (all, unchanged)
Tasks            → /tasks                  (all)
Campaigns        → /campaigns              (manager+)
Dashboard        → /dashboard              (manager+)
Settings         → /settings               (all)
```

### Page specifications

#### `/leads` — Central leads table (manager+ only)

- Shows all leads regardless of stage or boolean state.
- Default: shows only "relevant" leads (see §3).
- Toggle: "Show All Leads" adds lost, finalized, 24h restricted, moved-in leads.
- Full filter support (same as current).
- Pipeline/kanban toggle with two kanban modes (funnel stages / compartments).

#### `/lead-hub` — Lead Hub (all roles)

- Shows leads where `assigned_to IS NULL` and lead is "relevant."
- Same columns/info as current leads table plus soft home-property signal (visual indicator).
- Full filter support.
- Each lead card has a "Claim" button → `POST /api/leads/[id]/claim`.
- Optimistic lock: if claim fails (409), show "Lead already claimed" toast and remove from list.
- Managers can also claim.

#### `/leads/mine` — My Leads (all roles)

- Shows leads where `assigned_to = current user`.
- Default: shows only "relevant" leads assigned to the user.
- Toggle: "Show All Leads" includes lost/finalized/restricted leads assigned to the user.
- **NOT** defaulting to `yeni` only. Default is all relevant stages. A separate filter button can narrow to `yeni` only.

#### `/leads/expecting-call` — Expecting Call (all roles)

- Filter: `funnel_status IN ('aranacak', 'arandi-acmadi')`.
- Salesperson: only leads assigned to them.
- Manager+: leads assigned to anyone.

#### `/leads/nurture` — Nurture (all roles)

- Filter: `funnel_status IN ('arandi', 'bilgi-verildi', 'bizi-aradi-konustuk')`.
- Salesperson: only their leads.
- Manager+: all leads.
- Visual indicator on each lead card: "Not contacted today" based on `contact_history`.

#### `/visits` — Visit Calendar (all roles)

- Two views: **calendar** and **list**, toggleable.
- Data source: `visits` table joined with `leads` for lead name/info.
- **Calendar view:** Google Calendar-style display. Lead cards placed on their `scheduled_date`. Counter on each card showing days until visit (or days overdue). Current day highlighted.
- **List view:** Leads ordered by proximity of `scheduled_date` to today. Filterable to show only `status = 'failed'` visits. Supports rescheduling (creates new visit row).
- **Property filter:** Both views filterable by property.
- **Salesperson access:** Can see visits across ALL properties, but only divided by property (must select a property). Cannot see a unified cross-property view.
- **Manager+ access:** Same property-divided views PLUS a central/all-properties view.
- Visit scheduling action: button on lead detail that opens scheduling flow (pick date/time + property) → creates visit row → auto-advances funnel to `ziyaret`.

#### `/leads/post-visit` — Post Visit Nurture (all roles)

- Filter: `funnel_status IN ('ziyaret-etti', 'teklif-gonderildi')`.
- Same role-based visibility as Nurture.
- Same "Not contacted today" visual indicator.

#### `/leads/24h-restricted` — 24h Restricted Call (all roles)

- Filter: `is_24h_restricted = true`.
- Salesperson: only their leads.
- Manager+: all leads.
- These leads cannot be messaged, only called.
- Funnel status still displayed on each card (preserved from before restriction).

#### `/leads/downpayment` — Downpayment Received (all roles)

- Filter: `funnel_status = 'kapora-alindi'`.
- Salesperson: only their leads.
- Manager+: all leads.
- Filterable by `move_in_date_set` (true/false) to find leads still missing a move-in date.

#### `/leads/deal-signed` — Deal Signed (all roles)

- Filter: `funnel_status = 'sozlesme-imzalandi'`.
- Salesperson: only their leads.
- Manager+: all leads.

#### `/move-in` — Move-in Calendar (all roles)

- Same dual-view (calendar + list) as Visit Calendar.
- Data source: `leads` + `lead_details` where `move_in_date_set = true`.
- Leads with `has_moved_in = true` are visually marked as "Moved In" on the calendar.
- Move-in reminder auto-task: 1 week prior.
- Property filter + same RLS model as Visit Calendar (salespeople see by property, managers see central).

#### `/leads/moved-in` — Moved In (all roles)

- Filter: `has_moved_in = true`.
- Salesperson: only their leads.
- Manager+: all leads.
- Includes `actual_move_in_date` display.

### Shared components

All stage-specific tables reuse the existing `LeadTable` component with pre-applied filters. The slide-over detail panel (`LeadDetailPanel`) is shared across all pages — opens via `?selected={uuid}`.

Visit scheduling flow is a new component: `VisitScheduleDialog` — modal with date/time picker + property dropdown. Used from lead detail panel and visit calendar.

---

## 13. RLS policy changes

### New RLS: `visits` table

```sql
-- All authenticated users can read all visits
CREATE POLICY "visits_select_all" ON visits FOR SELECT
  TO authenticated USING (true);

-- Insert: lead must be assigned to user, or user is manager+
CREATE POLICY "visits_insert" ON visits FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM leads WHERE leads.id = lead_uuid
      AND (leads.assigned_to = auth.uid() OR EXISTS (
        SELECT 1 FROM salespeople WHERE id = auth.uid() AND role IN ('manager', 'superadmin')
      ))
    )
  );

-- Update: same as insert
CREATE POLICY "visits_update" ON visits FOR UPDATE
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM leads WHERE leads.id = lead_uuid
      AND (leads.assigned_to = auth.uid() OR EXISTS (
        SELECT 1 FROM salespeople WHERE id = auth.uid() AND role IN ('manager', 'superadmin')
      ))
    )
  );
```

### Modified RLS: `leads` table

Current policy allows salesperson to see `assigned_to = auth.uid() OR assigned_to IS NULL`. This still works for Lead Hub (`assigned_to IS NULL`). No change needed for base lead visibility.

### `is_24h_restricted` clearing

Application-level check in PATCH handler: only allow setting `is_24h_restricted = false` if `isSuperadmin(session)`. RLS doesn't need to handle this — it's a field-level business rule.

---

## 14. Filter system updates

### `lib/constants.ts` — `FILTERABLE_COLUMNS`

Add:

- `has_moved_in` (boolean filter)
- `is_24h_restricted` (boolean filter)
- `move_in_date_set` (boolean filter)

Remove from funnel status options:

- `ilgilenmiyor`
- `ziyaret-ama-almayacak`
- `24h_window_warning`

Add to funnel status options:

- `bilgi-verildi`

### `lib/leads/filter-field-registry.ts`

Add new fields to appropriate sections:

- `sistem` section: `has_moved_in`, `is_24h_restricted`, `move_in_date_set`

### Pre-applied filters per page

Each stage-specific page pre-applies its filter and hides the funnel_status filter control (since it's already determined by the page). Other filters remain available.

---

## 15. `lib/constants.ts` updates

### Funnel status list

Update `FUNNEL_STATUSES` to the new ordered list (§1).

### Terminal funnel statuses

Update to: `['sozlesme-imzalandi', 'lost']`

Remove: `ilgilenmiyor`, `ziyaret-ama-almayacak`, `24h_window_warning`

### Active lead definition

```
is_deleted = false
AND is_archived = false
AND deal_awaiting = false
```

Note: `lost`, `sozlesme-imzalandi`, `has_moved_in`, and `is_24h_restricted` leads are still "active" in the database sense — they're just filtered out by the relevance toggle in the UI. This is a change from current behavior where terminal statuses are excluded from active counts.

### Label field targets

Update `getLabelFieldTargets()` per §10.

### Compartment mapping

Add a new constant:

```typescript
export const FUNNEL_COMPARTMENTS: Record<string, string[]> = {
  cold: ['yeni'],
  'expecting-call': ['aranacak', 'arandi-acmadi'],
  nurture: ['arandi', 'bilgi-verildi', 'bizi-aradi-konustuk'],
  'will-visit': ['ziyaret'],
  'failed-visit': ['ziyaret-etmedi'],
  'post-visit-nurture': ['ziyaret-etti', 'teklif-gonderildi'],
  downpayment: ['kapora-alindi'],
  'deal-signed': ['sozlesme-imzalandi'],
};
```

---

## 16. Internationalization

### `lib/i18n/messages/tr.ts` and `en.ts`

Add translations for:

- `bilgi-verildi` display label
- All new page titles (Lead Hub, Expecting Call, Nurture, Visit Calendar, etc.)
- Auto-task type labels
- Visit status labels (`scheduled`, `attended`, `failed`)
- "Show All Leads" / "Show Relevant Only" toggle
- "Claim" button
- "Not contacted today" indicator
- "Lead already claimed" error
- Compartment display names (Cold, Expecting Call, Nurture, etc.)
- Visit scheduling dialog labels
- Move-in calendar labels

---

## 17. NetGSM integration changes

### Assignment removal

`process-netgsm.ts` — remove `assignLead()` call. All NetGSM-created leads get `assigned_to = NULL` and land in Lead Hub.

### Future: Auto-detect `arandi-acmadi` (deferred)

Depends on verifying whether outbound santral dinleme events (`scenario: "Outbound_call"`) with `talktime: 0` are being received. Design the system to support it, but ship as a follow-up:

1. Extend `normalizeNetGsmPayload` to parse `internal_num`, `customer_num`, `talktime` from santral dinleme payloads
2. For outbound calls: match `customer_num` to existing lead, `talktime = 0` → auto-set `arandi-acmadi`
3. Requires mapping `salespeople.netgsm_extension` → `internal_num`

**Not in scope for initial release.** Manual `arandi-acmadi` marking is the fallback.

### CDR agent identification (NOT implemented)

NetGSM CDR webhooks do not reliably include which agent handled the call. This was evaluated and explicitly deferred. `contact_history.salesperson_id` remains `null` for NetGSM CDR entries.

---

## 18. Scheduled jobs changes

### Existing cron updates

| Job               | Change                                                                                                                                                                                                                                                              |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `sla_update`      | **Defer for now.** SLA system is being restructured separately.                                                                                                                                                                                                     |
| `nightly-archive` | Update terminal status list: remove `ilgilenmiyor`, `ziyaret-ama-almayacak`, `24h_window_warning`. Terminal for auto-archive is now only `lost`. `sozlesme-imzalandi` leads with `has_moved_in = true` may also be archive candidates — confirm with lead engineer. |

### New cron jobs

| Job                     | Schedule                                        | Purpose                                                                           |
| ----------------------- | ----------------------------------------------- | --------------------------------------------------------------------------------- |
| `nurture-task-alerts`   | At each salesperson's shift start and shift end | Send Telegram alerts for nurture and post-visit-nurture leads not contacted today |
| `visit-reminder`        | Daily, morning (e.g., 08:00 Istanbul)           | Check for visits scheduled tomorrow, send reminder tasks/alerts                   |
| `visit-resolution-ping` | At each salesperson's shift end                 | Ping salespeople who have unresolved visits from today                            |
| `move-in-reminder`      | Daily, morning                                  | Check for move-in dates 1 week from now, send reminder tasks/alerts               |

---

## 19. Delivery phases

### Phase A — Database foundation (ship together)

1. Migration 0062: Funnel status consolidation
2. Migration 0063: New boolean columns
3. Migration 0064: Visits table
4. Migration 0065: Lead details changes
5. Migration 0066: Task system additions
6. Migration 0067: Backfill 24h_window_warning
7. Update `lib/constants.ts` (funnel statuses, compartments, label targets, terminal statuses)
8. Update `types/` — `pnpm gen:types`
9. Update Chatwoot label mapping in `getLabelFieldTargets()`

### Phase B — Backend logic

1. Assignment removal: strip `assignLead()` from all creation paths
2. Claim endpoint: `POST /api/leads/[id]/claim`
3. Visits CRUD: `GET/POST /api/visits`, `PATCH /api/visits/[id]`, `GET /api/leads/[id]/visits`
4. Visit scheduling side effect: auto-advance to `ziyaret`
5. Lead reactivation logic (before 80 days + after 80 days)
6. Auto-task creation/cancellation engine (`lib/tasks/auto-tasks.ts`)
7. Relevance filter in lead list query
8. `is_24h_restricted` Chatwoot sync (inbound + outbound)
9. `has_moved_in` / `actual_move_in_date` logic
10. Updated webhook processors

### Phase C — Frontend pages

1. Lead Hub page + claim mechanics
2. Stage-specific table pages (Expecting Call, Nurture, Post Visit, 24h Restricted, Downpayment, Deal Signed, Moved In)
3. Visit Calendar (calendar + list views)
4. Move-in Calendar (calendar + list views)
5. Visit scheduling dialog component
6. My Leads update (relevant default + show-all toggle)
7. Central Leads update (relevant default + show-all toggle, manager only)
8. Kanban dual-mode (funnel stages / compartments)
9. "Not contacted today" visual indicator
10. Sidebar navigation update

### Phase D — Cron and notifications

1. Nurture alert cron
2. Visit reminder cron
3. Visit resolution ping cron
4. Move-in reminder cron
5. Auto-task cancellation on stage change integration

### Phase E — Cleanup and testing

1. Remove old funnel status references throughout codebase
2. Update Vitest unit tests
3. Update filter field registry and tests
4. Full integration test: lead lifecycle from Lead Hub claim through moved-in
5. Chatwoot two-way sync verification
6. Webhook smoke tests

---

## 20. Decisions log (quick reference)

| #   | Decision                                                                          | Confirmed |
| --- | --------------------------------------------------------------------------------- | --------- |
| 1   | `bilgi-verildi` is a new funnel status, positioned after `yeni`                   | Yes       |
| 2   | `has_moved_in` is a boolean, not a funnel stage                                   | Yes       |
| 3   | `ilgilenmiyor`, `ziyaret-ama-almayacak` consolidated into `lost`                  | Yes       |
| 4   | Visit date stored in new `visits` table with lead FK                              | Yes       |
| 5   | `lead_details.move_in` repurposed to DATE type                                    | Yes       |
| 6   | Visit has `property_id` metadata set by salesperson                               | Yes       |
| 7   | Salespeople self-assign from Lead Hub (algorithm scrapped)                        | Yes       |
| 8   | `is_24h_restricted` set by Chatwoot label, cleared by superadmin only             | Yes       |
| 9   | Stage transition cancels auto-tasks only, manual tasks survive                    | Yes       |
| 10  | `deal_awaiting` concept survives unchanged                                        | Yes       |
| 11  | Chatwoot labels updated in parallel (two-way sync continues)                      | Yes       |
| 12  | Irrelevant = lost + sozlesme-imzalandi + has_moved_in + is_24h_restricted         | Yes       |
| 13  | Visit status updated manually; unresolved pings salesperson at shift end          | Yes       |
| 14  | Lead Hub uses optimistic lock, no capacity guardrails                             | Yes       |
| 15  | Auto-tasks deferred to after structural decisions (now resolved, see §11)         | Yes       |
| 16  | `actual_move_in_date` field added alongside `has_moved_in`                        | Yes       |
| 17  | My Leads defaults to all relevant leads (not just `yeni`)                         | Yes       |
| 18  | Failed visit rescheduling creates new visit row (history preserved)               | Yes       |
| 19  | NetGSM agent identification — not feasible from CDR, deferred                     | Yes       |
| 20  | Home property used as soft signal in Lead Hub only                                | Yes       |
| 21  | `has_moved_in` requires passing through `sozlesme-imzalandi`                      | Yes       |
| 22  | `is_24h_restricted` preserves funnel status                                       | Yes       |
| 23  | Calendars query visits/move-in tables, not leads table. Open read RLS.            | Yes       |
| 24  | Lead Hub has full filter support                                                  | Yes       |
| 25  | Claiming keeps current funnel stage, SLA deferred                                 | Yes       |
| 26  | Before 80 days: reactivate lost lead to `yeni`, clear to Lead Hub                 | Yes       |
| 27  | Calendar: salespeople see visit cards only, not full lead detail of others' leads | Yes       |
| 28  | `actual_move_in_date` sets `has_moved_in = true`                                  | Yes       |
| 29  | `loss_reason` always required when going to `lost`                                | Yes       |
| 30  | Reactivated leads reset to `yeni` (not restored to prior stage)                   | Yes       |
| 31  | `bilgi-verildi` added for text-based informing                                    | Yes       |
| 32  | Lead Hub cards show same info as leads table + home property signal               | Yes       |
| 33  | Kanban survives with dual mode (funnel stages / compartments)                     | Yes       |
| 34  | `lost` excluded from compartment kanban, booleans excluded entirely               | Yes       |
| 35  | Auto `arandi-acmadi` from NetGSM — deferred, design for it                        | Yes       |
| 36  | Flat sidebar navigation                                                           | Yes       |
| 37  | Move-in calendar: same RLS model as visit calendar                                | Yes       |
| 38  | `teklif-gonderildi` set manually by salesperson                                   | Yes       |
| 39  | Scheduling a visit auto-advances funnel to `ziyaret`                              | Yes       |
| 40  | Final funnel enum confirmed (see §1)                                              | Yes       |
| 41  | Page access control table confirmed (see §12)                                     | Yes       |
| 42  | Managers and above can claim from Lead Hub                                        | Yes       |
| 43  | Compartment kanban mapping confirmed (see §1)                                     | Yes       |
| 44  | Central Leads table manager-only, salespeople don't need it                       | Yes       |
| 45  | Chatwoot `kayip` label stays, maps to CRM `lost`                                  | Yes       |
| 46  | Host salesman info not stored in CRM, salesperson knows who to contact            | Yes       |
| 47  | Auto-task alerts use `salespeople.shift_start`/`shift_end`                        | Yes       |
| 48  | Manual tasks survive stage transitions                                            | Yes       |
| 49  | Volume: ~2000-2500 visits over 2-3 months, simple indexes sufficient              | Yes       |
