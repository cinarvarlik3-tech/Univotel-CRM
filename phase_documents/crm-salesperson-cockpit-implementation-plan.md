# Univotel CRM — Salesperson Job Easing & Tracking Implementation Plan

**Date:** 2026-06-11
**Author:** Çınar (Lead Software Engineer) + Claude (architecture planning)
**Target:** Claude Code implementation
**Production:** https://panel.marketinguni.app
**Stack:** Next.js 15 Pages Router, Cloudflare Workers, Supabase Postgres, TypeScript, Zod, shadcn/ui

> **Dependency note:** This update assumes the Major Update (Lead Hub, compartment tables, `visits` table, task revamp, funnel consolidation) is already implemented. References to `visits`, `is_auto_created`, `claimed_at`, the new funnel enum, and the compartment mapping all come from that plan. Ship the Major Update first.

---

## Overview

This update builds the salesperson cockpit — a personal command center called **My Day** — and the instrumentation underneath it that makes performance tracking truthful rather than decorative. It has two halves:

1. **Job easing** — a new landing screen (My Day) plus contextual quick-actions surfaced across existing screens, so the next right action is always one tap away.
2. **Tracking** — a Performance tab and the underlying event capture (`lead_stage_history`, message attribution, `claimed_at`) required to compute honest metrics.

The guiding principle: **you can't track what you don't log.** Much of this plan is instrumentation that must be in place before metrics can be trusted.

---

## 1. Scope and roles

- **My Day** becomes the universal landing page for **every role** (salesperson, manager, superadmin), self-scoped to the logged-in user.
- Managers also retain the existing org-wide `/dashboard`. My Day is their _personal_ cockpit; `/dashboard` is the team view. Managers claim and close leads at Univotel, so their My Day is identical to a salesperson's — no special-casing.
- All metrics on My Day are **self-only**. RLS stays tight. Leaderboards / peer comparison are explicitly deferred to a future update.
- **"Today"** = Istanbul calendar day (not shift window). Overtime past midnight rolls into the next day.
- **"This week"** = Monday-start ISO week, Istanbul timezone (not rolling 7 days).

---

## 2. Primary new screen — My Day

**Route:** `/` (replaces current landing) — or `/my-day` with a redirect from `/`.
**Access:** All roles. Self-scoped.

Two tabs: **Today** (the cockpit) and **Performance** (trends, see §3).

### 2.1 Today tab layout (top to bottom)

#### A. Header strip — at-a-glance counters

Compact stat tiles, scoped to the logged-in user. Each tile is clickable and deep-links to the relevant filtered screen.

| Tile                      | Value                                                            | Deep-link                   |
| ------------------------- | ---------------------------------------------------------------- | --------------------------- |
| Active leads owned        | count of owned relevant leads                                    | `/leads/mine`               |
| Not contacted today       | nurture + post-visit leads with no `contact_history` entry today | `/leads/nurture` filtered   |
| Visits today / this week  | from `visits` table                                              | `/visits` filtered to today |
| Tasks due today / overdue | from `tasks`                                                     | scrolls to task panel       |
| New claims this week      | leads claimed by user this ISO week (needs `claimed_at`)         | `/leads/mine`               |

#### B. Task panel — core of the screen

The user's tasks with a **Day / Week toggle**. Grouping within the view:

- **Overdue** (red) — anything past due, pulled forward regardless of the day/week filter
- **Today**
- **Upcoming** — this week, shown only when Week view is active

Each task card shows:

- Task type icon (auto vs manual — uses `is_auto_created` + `auto_task_type`)
- Linked lead's name + current funnel stage
- Due time
- An **inline action button** appropriate to the task type, resolving the task without opening the lead:

| `auto_task_type`              | Inline action                                           |
| ----------------------------- | ------------------------------------------------------- |
| `nurture_reminder`            | "Mark contacted" → logs contact_history, clears flag    |
| `post_visit_nurture_reminder` | "Mark contacted"                                        |
| `visit_reminder`              | "View visit" → opens visit on calendar                  |
| `visit_resolution`            | "Update visit status" → attended/failed picker          |
| `move_in_reminder`            | "View move-in"                                          |
| `failed_visit_followup`       | "Log call outcome" → reschedule / lost / nurture picker |
| (manual task)                 | "Complete"                                              |

#### C. Attention queue — computed "needs action now"

Distinct from the task panel. These are **computed states with no `tasks` row** (see dedup rule §9). Items:

- Nurture / post-visit leads with no `contact_history` entry today
- Visits scheduled for today still in `scheduled` status (unresolved)
- Expecting-call leads sitting in `aranacak` not yet called
- (Optional, if derivable) leads approaching the 24h window based on last inbound message age

Each item has a one-tap action (Mark contacted, Update visit, Log call outcome).

#### D. Mini funnel — personal pipeline snapshot

A small horizontal bar showing the distribution of the user's owned leads across compartments (Cold → Expecting Call → Nurture → Will Visit → Post Visit → Downpayment → Deal Signed). Gives a sense of where their book is concentrated and stalling. Uses the `FUNNEL_COMPARTMENTS` constant from the Major Update. Each segment clickable → deep-links to that compartment table filtered to the user.

---

## 3. Performance tab (inside My Day)

The Today tab shows _now_; the Performance tab shows _trends_. Self-scoped mirror of the manager dashboard. Date-range selector: This Week / This Month / Custom.

### Sections

1. **Conversion funnel** — claimed → contacted → visited → downpayment → signed → moved in, for the selected window.
2. **Visit show-rate** — attended / (attended + failed) from `visits`.
3. **Activity volume** — calls logged, messages sent, contacts logged.
4. **Task completion rate** — completed / assigned in window.

All numbers self-scoped. For managers, this tab shows their _personal_ numbers (may be sparse if they close few leads — that is acceptable and intended; org-wide view lives in `/dashboard`).

---

## 4. Contextual quick actions (the easing layer)

Surface the right action on each existing screen so the common path is one tap, rather than navigating into a lead detail panel. Implemented as a shared set of reusable action components, conditionally rendered per screen.

### 4.1 Action placement per screen

| Screen               | Primary contextual action(s)                                                                                           |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Lead Hub             | Claim                                                                                                                  |
| My Leads             | Create task, Advance stage, Mark lost                                                                                  |
| Expecting Call       | **Log call outcome** → connected advances to `arandi`; no-answer to `arandi-acmadi`; both auto-write `contact_history` |
| Nurture / Post Visit | **Mark contacted today** (writes `contact_history`, clears the "not contacted" flag), Create follow-up task            |
| Visit Calendar       | Mark attended / failed, Reschedule, Schedule new visit                                                                 |
| Downpayment          | **Set move-in date** (sets `lead_details.move_in`, flips `move_in_date_set`)                                           |
| Deal Signed          | Set actual move-in date (sets `actual_move_in_date`, flips `has_moved_in`)                                             |

### 4.2 Reusable building blocks

| Component                            | Purpose                                         | Notes                                                                                       |
| ------------------------------------ | ----------------------------------------------- | ------------------------------------------------------------------------------------------- |
| `CreateTaskDialog`                   | Quick task: title, due date, optional lead link | Defaults `is_auto_created = false` so it survives stage transitions                         |
| `VisitScheduleDialog`                | Schedule a visit (date/time + property)         | Reuses the dialog from the Major Update; auto-advances funnel to `ziyaret`                  |
| `SetMoveInDialog`                    | Date picker for move-in                         | Enforces `kapora-alindi`+ gating                                                            |
| `LogContactDialog` / `LogCallDialog` | Writes `contact_history`                        | Always stamps `salesperson_id = session user` — powers "contacted today" + activity metrics |
| `QuickStageAdvance`                  | Dropdown to move lead forward                   | Triggers auto-task cancel/create cycle + writes `lead_stage_history`                        |

All of these are callable from any lead context (lead card, slide-over, or My Day inline action).

---

## 5. Instrumentation — the foundation

To make tracking truthful, these must be recorded. This is the part most likely to be underestimated; it gates nearly every metric.

### 5.1 `leads.claimed_at` timestamp

- **New column:** `leads.claimed_at TIMESTAMPTZ` (nullable)
- Set by the claim endpoint (`POST /api/leads/[id]/claim`) at claim time.
- On reactivation that returns a lead to Lead Hub, `claimed_at` is cleared (NULL) so the next claim re-stamps it.
- Required for "new claims this week" and any claim-to-conversion timing.

### 5.2 Reliable `contact_history.salesperson_id` on salesperson actions

- For **salesperson-initiated** writes (Log Call, Mark Contacted, Log Contact), always stamp `salesperson_id = session user`.
- NetGSM CDR writes remain `salesperson_id: null` (agent identity not reliably available from CDR — see Major Update §17). This is acceptable: **salesperson activity metrics count _logged_ actions, not raw telephony.** Document this explicitly in any metric label so it's not mistaken for a phone-system count.

### 5.3 `lead_stage_history` audit table

The centerpiece of the tracking half. One row per funnel transition.

```sql
CREATE TABLE lead_stage_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_uuid UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  from_status TEXT,                    -- nullable: first transition has no "from"
  to_status TEXT NOT NULL,
  changed_by UUID REFERENCES salespeople(id),  -- nullable for system/webhook
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  source TEXT NOT NULL CHECK (source IN ('manual', 'chatwoot', 'netgsm', 'system'))
);

CREATE INDEX idx_stage_history_lead ON lead_stage_history(lead_uuid, changed_at);
CREATE INDEX idx_stage_history_changed_by ON lead_stage_history(changed_by, changed_at);
CREATE INDEX idx_stage_history_to_status ON lead_stage_history(to_status, changed_at);
```

**Hard rule — single chokepoint:** Every funnel-status write MUST go through `lib/leads/update-lead.ts`, which writes the `lead_stage_history` row in the same transaction as the status change. No direct `funnel_status` UPDATE anywhere in the codebase (webhooks, claim, quick-advance, Chatwoot label sync) may bypass this. Add an ESLint/code-review note; consider a DB trigger as a safety net that writes a `source = 'system'` row if a status change arrives without a corresponding history row.

**What it unlocks:** time-bounded conversion rates, stage dwell-time ("how long do my leads sit in Nurture"), stage velocity per agent, accurate period-over-period reporting.

### 5.4 `lead_messages` sender attribution

The Chatwoot `message_created` webhook already arrives and is already processed to upsert `lead_messages`. We need to capture two more fields from the payload:

- `message_type` from Chatwoot → store as `direction` (`incoming` = from contact, `outgoing` = from agent)
- `sender` object's agent `id` (present on agent-sent messages) → store as `sender_agent_id`

```sql
ALTER TABLE lead_messages ADD COLUMN direction TEXT CHECK (direction IN ('incoming', 'outgoing'));
ALTER TABLE lead_messages ADD COLUMN sender_agent_id TEXT;  -- Chatwoot agent id
```

Agent → salesperson resolution already exists via the `chatwoot_user_id` mapping used for assignee sync.

**Campaign exclusion:** WhatsApp template campaign sends are also `outgoing` messages but are automated bulk sends, not personal replies. They must NOT count toward a salesperson's "messages sent." Exclude them by filtering to messages that have a human `sender_agent_id` (campaign sends have a system/bot sender or no agent id), or by cross-referencing `campaign_leads`. Verify the actual sender shape on a real campaign send before finalizing the filter.

---

## 6. Metrics catalog with computability

| Metric                               | Source                                              | Status after this update            |
| ------------------------------------ | --------------------------------------------------- | ----------------------------------- |
| Active leads owned                   | `leads WHERE assigned_to = me`                      | ✅ Computable                       |
| Leads by stage / mini funnel         | group by `funnel_status`                            | ✅ Computable                       |
| Visits scheduled / attended / failed | `visits`                                            | ✅ Computable                       |
| Visit show-rate                      | attended / (attended + failed)                      | ✅ Computable                       |
| Tasks completed / pending            | `tasks`                                             | ✅ Computable                       |
| Nurture compliance (contacted today) | `contact_history` for today (Istanbul)              | ✅ Computable                       |
| New claims (today / week)            | `leads.claimed_at`                                  | ✅ After §5.1                       |
| Calls logged (per salesperson)       | `contact_history.salesperson_id` + interaction_type | ✅ After §5.2 (logged actions only) |
| **Messages sent (per salesperson)**  | `lead_messages` direction + sender_agent_id         | ✅ After §5.4 (campaign-excluded)   |
| Conversion rate over window          | `lead_stage_history` + conversion-credit rule       | ✅ After §5.3                       |
| Downpayments / deals in a period     | `lead_stage_history` transitions to those stages    | ✅ After §5.3                       |
| Avg time-to-first-contact            | first contact + `claimed_at`                        | ⏸ Deferred (tied to SLA rework)     |

### Conversion-credit rule (confirmed)

- **Credit for a close** goes to whoever is `assigned_to` at the moment of transition to `sozlesme-imzalandi`.
- **Claiming writes to the claimer's record regardless of outcome.** If salesperson A claims a lead, loses it, then B recovers and closes it: A gets it as a _lost_ lead in their numbers; B gets it as a _closed_ lead in theirs. A lead may appear in multiple people's denominators if it passed through multiple hands — fair, since each genuinely worked it.
- **Conversion rate per person** = (deals closed where they were assignee at `sozlesme-imzalandi`) / (leads they ever claimed within the window).

---

## 7. Activity timeline assembly

The complete per-lead history (for the lead detail panel and performance views) is assembled **at query time** by merging four single-purpose sources, each carrying a timestamp:

1. `lead_stage_history` — funnel transitions
2. `contact_history` — calls / messages / contacts logged
3. `visits` — scheduled / attended / failed
4. `tasks` — created / completed

Merge and sort by timestamp descending. No unified mega event-table — each source stays single-purpose, and completeness is guaranteed by the §5.3 chokepoint rule for stage changes (the other three tables are already append-style).

**Helper:** `lib/leads/build-activity-timeline.ts` — takes a `lead_uuid`, fetches from the four sources, returns a normalized, sorted `ActivityEvent[]`.

---

## 8. New and modified API endpoints

### New endpoints

| Route                           | Method | Auth    | Purpose                                                                              |
| ------------------------------- | ------ | ------- | ------------------------------------------------------------------------------------ |
| `/api/my-day`                   | GET    | Session | Aggregated cockpit payload: counters, tasks (day/week), attention queue, mini-funnel |
| `/api/my-day/performance`       | GET    | Session | Performance metrics for a date range (self-scoped)                                   |
| `/api/leads/[id]/log-contact`   | POST   | Session | Write `contact_history` (call/message/contact), stamps salesperson_id                |
| `/api/leads/[id]/advance-stage` | POST   | Session | Quick stage advance via update-lead chokepoint                                       |
| `/api/tasks`                    | POST   | Session | Create manual task (`is_auto_created = false`)                                       |
| `/api/leads/[id]/activity`      | GET    | Session | Merged activity timeline (§7)                                                        |

### Modified endpoints

| Route                                | Change                                                                          |
| ------------------------------------ | ------------------------------------------------------------------------------- |
| `POST /api/leads/[id]/claim`         | Set `claimed_at = now()` on claim                                               |
| `PATCH /api/leads/[id]`              | All funnel_status changes route through `update-lead.ts` (writes stage history) |
| Chatwoot `message_created` processor | Capture `direction` + `sender_agent_id` into `lead_messages`                    |
| Chatwoot label-sync funnel writes    | Must route through `update-lead.ts` chokepoint (no direct funnel UPDATE)        |

### `/api/my-day` payload shape (suggested)

```typescript
{
  data: {
    counters: {
      activeLeads: number;
      notContactedToday: number;
      visitsToday: number;
      visitsThisWeek: number;
      tasksDueToday: number;
      tasksOverdue: number;
      newClaimsThisWeek: number;
    };
    tasks: { overdue: TaskCard[]; today: TaskCard[]; upcoming: TaskCard[] };
    attentionQueue: AttentionItem[];
    miniFunnel: { compartment: string; count: number }[];
  }
}
```

---

## 9. Dedup rule — attention queue vs task panel

- If an item has a `tasks` row (e.g. `failed_visit_followup`, `visit_resolution`), it appears **only** in the task panel.
- The attention queue is reserved for **computed states with no task row** (nurture lead not contacted today, expecting-call lead still uncalled).
- Rule: _if it's a task, it's in the task panel; if it's derived state, it's in the attention queue._ No item appears in both.

---

## 10. RLS and access control

- All My Day / Performance queries are self-scoped: `WHERE assigned_to = auth.uid()` (or `changed_by = auth.uid()` / `salesperson_id = auth.uid()` for activity sources).
- `lead_stage_history` RLS: users read rows where `changed_by = auth.uid()` OR they are the lead's assignee OR manager+. Managers can read all (for `/dashboard`).
- No new cross-salesperson visibility introduced. Leaderboards deferred — do not loosen RLS for peer comparison.
- `claimed_at`, `direction`, `sender_agent_id` are plain columns under existing table RLS — no special policies.

---

## 11. Migration plan

Continues from the Major Update's migration sequence (which ended around 0067). Adjust numbers to actual head.

| Migration | Purpose                                                                                                                                                                                                    |
| --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **00XX**  | `leads.claimed_at TIMESTAMPTZ`                                                                                                                                                                             |
| **00XX**  | `lead_stage_history` table + indexes + RLS                                                                                                                                                                 |
| **00XX**  | `lead_messages.direction` + `lead_messages.sender_agent_id`                                                                                                                                                |
| **00XX**  | Optional safety-net trigger: write `source='system'` stage-history row if a `funnel_status` change lands without one                                                                                       |
| **00XX**  | Backfill: seed `lead_stage_history` with one `to_status = current funnel_status`, `source='system'`, `changed_at = leads.updated_at` row per existing lead, so timelines aren't empty for historical leads |

**After migrations:** `pnpm gen:types`

**Backfill note:** the seed gives every existing lead a baseline history entry. It won't reconstruct past transitions (that data doesn't exist), but it establishes a starting point so go-forward tracking is complete and timelines render.

---

## 12. Frontend components

| Component           | Location                                  | Purpose                                                        |
| ------------------- | ----------------------------------------- | -------------------------------------------------------------- |
| `MyDayPage`         | `pages/index.tsx` (or `pages/my-day.tsx`) | Container, Today/Performance tabs                              |
| `CounterStrip`      | `components/my-day/`                      | Header stat tiles                                              |
| `TaskPanel`         | `components/my-day/`                      | Day/Week toggle, grouped task cards, inline actions            |
| `AttentionQueue`    | `components/my-day/`                      | Computed needs-action items                                    |
| `MiniFunnel`        | `components/my-day/`                      | Personal compartment distribution bar                          |
| `PerformanceTab`    | `components/my-day/`                      | Conversion funnel, show-rate, activity volume, task completion |
| `CreateTaskDialog`  | `components/actions/`                     | Shared quick-task modal                                        |
| `SetMoveInDialog`   | `components/actions/`                     | Shared move-in date modal                                      |
| `LogContactDialog`  | `components/actions/`                     | Shared contact/call logging modal                              |
| `QuickStageAdvance` | `components/actions/`                     | Shared stage-advance dropdown                                  |
| `ActivityTimeline`  | `components/leads/`                       | Renders merged timeline from `/api/leads/[id]/activity`        |

Reuse `VisitScheduleDialog` from the Major Update.

### Data fetching

- My Day: SWR hook `useMyDay()` with periodic revalidation (e.g. 60s) so counters stay live.
- Performance: SWR hook `usePerformance(dateRange)`.
- Inline actions: direct `fetch` mutations, then SWR revalidate.

---

## 13. Internationalization

Add `tr` + `en` translations for: My Day, Today/Performance tab labels, all counter tile labels, task panel groupings (Overdue/Today/Upcoming), Day/Week toggle, attention queue item types, mini funnel compartment names, all Performance section titles, every contextual action label (Mark contacted, Log call outcome, Set move-in date, Advance stage, Create task), conversion/show-rate/activity metric labels, and the activity timeline event descriptions.

Turkish is the default locale.

---

## 14. Delivery phases

### Phase A — Instrumentation foundation (ship first)

1. Migration: `leads.claimed_at`
2. Migration: `lead_stage_history` table + RLS + safety-net trigger
3. Migration: `lead_messages.direction` + `sender_agent_id`
4. Migration: stage-history backfill seed
5. Route ALL funnel writes through `lib/leads/update-lead.ts` chokepoint; write history rows
6. Claim endpoint stamps `claimed_at`
7. Chatwoot `message_created` processor captures direction + sender_agent_id
8. `pnpm gen:types`

### Phase B — Backend aggregation

1. `GET /api/my-day` aggregation
2. `GET /api/my-day/performance` with conversion-credit rule + campaign-excluded message counts
3. `POST /api/leads/[id]/log-contact`
4. `POST /api/leads/[id]/advance-stage`
5. `POST /api/tasks` (manual)
6. `GET /api/leads/[id]/activity` + `build-activity-timeline.ts`

### Phase C — My Day frontend

1. `MyDayPage` shell with Today/Performance tabs
2. CounterStrip, TaskPanel (day/week + inline actions), AttentionQueue, MiniFunnel
3. Set as landing page (redirect `/`)
4. PerformanceTab with all four sections

### Phase D — Contextual actions

1. Shared action components (CreateTask, SetMoveIn, LogContact, QuickStageAdvance)
2. Wire actions into each compartment screen per §4.1
3. ActivityTimeline component in lead detail panel

### Phase E — Testing

1. Unit tests: conversion-credit calculation, message-count campaign exclusion, stage-history chokepoint coverage, "today"/"this week" Istanbul boundary math
2. Verify no funnel write bypasses the chokepoint (grep for direct `funnel_status` updates)
3. Verify campaign sends excluded from message counts on a real payload
4. Integration: claim → advance through stages → confirm complete `lead_stage_history` + assembled timeline

---

## 15. Decisions log (quick reference)

| #   | Decision                                                                                  | Confirmed |
| --- | ----------------------------------------------------------------------------------------- | --------- |
| 1   | My Day replaces landing page for every role, self-scoped                                  | Yes       |
| 2   | Performance is a tab inside My Day, not a separate page                                   | Yes       |
| 3   | Conversion credit → assignee at moment of `sozlesme-imzalandi`                            | Yes       |
| 4   | Self-only metrics; leaderboards deferred; RLS stays tight                                 | Yes       |
| 5   | Messages-sent is a must-have; captured via Chatwoot webhook sender attribution            | Yes       |
| 6   | "Today" = Istanbul calendar day (handles overtime)                                        | Yes       |
| 7   | `lead_stage_history` audit table confirmed                                                | Yes       |
| 8   | Claiming writes to claimer's record regardless of outcome (lost to A, close to B)         | Yes       |
| 9   | Conversion rate denominator = leads ever claimed in window                                | Yes       |
| 10  | `lead_stage_history` strict to funnel transitions; timeline merged at query time          | Yes       |
| 11  | Managers get identical self-scoped My Day (they claim + close too)                        | Yes       |
| 12  | Attention queue vs task panel: no dedup overlap; tasks in panel, computed states in queue | Yes       |
| 13  | Weekly counters = Monday-start ISO week, Istanbul                                         | Yes       |
| 14  | Campaign template sends excluded from personal message counts                             | Yes       |
| 15  | Funnel writes must route through single chokepoint (`update-lead.ts`)                     | Yes       |
| 16  | Salesperson activity metrics count logged actions, not raw telephony                      | Yes       |
| 17  | `claimed_at` cleared on reactivation to Lead Hub                                          | Yes       |
