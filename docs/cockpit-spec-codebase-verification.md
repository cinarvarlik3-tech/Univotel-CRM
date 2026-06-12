# Salesperson Cockpit — Codebase Verification Q&A

Answers to batch codebase questions that gate the salesperson cockpit spec (D7, D12–D14, D16, D19–D21, D23, D25, D27, and cross-cutting items). Verified against the repo as of June 2026.

Use this document when writing or reviewing `phase_documents/crm-salesperson-cockpit-implementation-plan.md` so spec assumptions match what the code actually does today.

---

## Already flagged / closed

### D16 — Stale-label sync (`mergeOutboundLabels` / `setConversationLabels`)

**Outbound (CRM → Chatwoot): yes, stale funnel labels are removed.**

`mergeOutboundLabels` keeps only intent-only and unmanaged labels from Chatwoot, then rebuilds managed labels from CRM state. `buildManagedLabelsFromCrm` emits **one** funnel label — the current `funnel_status`. `setConversationLabels` overwrites the full label set.

**Inbound (Chatwoot → CRM): dual funnel labels can coexist on Chatwoot.**

If an agent adds `ziyaret-etti` without removing `ziyaret`, Chatwoot can hold both. The webhook sets CRM `funnel_status` from the added label(s); if multiple funnel labels are added in one event, **last one in the `added` array wins**. Old funnel labels are **not** stripped from Chatwoot until the next CRM outbound sync.

**CRM DB stays single-valued** (`leads.funnel_status`). Stale labels are a **Chatwoot UI/sync lag** problem, not a CRM column problem.

**Key files:** `lib/chatwoot/label-categories.ts`, `lib/chatwoot/sync-labels.ts`, `lib/webhooks/process-chatwoot.ts`

---

### D-OPEN-1 — CDR stage behavior (closed)

**Confirmed:** company-line CDR on a matched existing lead writes `contact_history` only (`interaction_type: call`, `status_changed: false`). No `funnel_status` transition, no `updateLeadRecord`, no `writeStageHistory`.

**Key file:** `lib/webhooks/process-netgsm.ts` → `handleCdrForExistingLead`, `writeCdrToContactHistory`

---

### D25 — Message-count attribution (`sender_agent_id` / campaign exclusion)

**Partially reliable; not production-verified on live payloads.**

| Aspect                       | Finding                                                                                                                                                                         |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| How `sender_agent_id` is set | In `process-chatwoot.ts`: only when `sender.type === 'user'` and `sender.id` is present → stored as **Chatwoot user ID string**, not CRM `salespeople.id`                       |
| Campaign/bot sends           | Get `sender_agent_id = null` by design                                                                                                                                          |
| Exclusion filter             | `getPerformancePayload` uses `.not('sender_agent_id', 'is', null)` on `lead_messages` — asserted by `__tests__/lib/campaign-exclusion.test.ts` (source audit, not live payload) |
| Per-rep scoping              | **Missing** on the `lead_messages` branch — no join to `salespeople.chatwoot_user_id`                                                                                           |
| Count logic                  | `Math.max(contact_history messages for user, global lead_messages count)` — the `lead_messages` branch can inflate any rep's count with **team-wide** human sends               |

**For D25 column:** treat campaign exclusion as **implemented but incomplete for per-agent attribution**.

**Key files:** `lib/webhooks/process-chatwoot.ts`, `lib/my-day/performance.ts`, `__tests__/lib/campaign-exclusion.test.ts`

---

## CDR auto-advance (D19 / D20)

### Does the NetGSM payload carry reliable call direction?

**Direction is not a payload field.** It is **derived in code** only in the company-line existing-lead path:

```ts
const direction: 'inbound' | 'outbound' = isCompanyCaller ? 'outbound' : 'inbound';
```

| Call type                                | Direction available?                                                                                         |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Company-line CDR (matched existing lead) | Yes — derived from whether company number is caller vs callee                                                |
| DNI / non-company-line CDR               | No — `handleCdrForExistingLead` returns `false`; falls through to new-lead creation with no direction stored |
| Normalized payload interface             | Exposes `callerPhone`, `calledNumber`, `durationSeconds`, `scenario` — **no `direction` property**           |

**Risks:** DNI calls, queue-suffixed `aranan` values, or format mismatches (`850…` vs `0212…`) can miss company-line detection. See `docs/netgsm-integration.md` §7.1.

**Key files:** `lib/webhooks/process-netgsm.ts`, `lib/webhooks/normalize-netgsm-payload.ts`, `lib/constants.ts` (`COMPANY_PHONE_NUMBER_NORMALIZED`)

---

### Does the payload carry usable talktime/duration (including missed)?

| Case                                             | Behavior                                                                                          |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------- |
| Present numeric `sure` / `talktime` / `duration` | Parsed to `durationSeconds` (integer ≥ 0)                                                         |
| Absent duration                                  | `durationSeconds === null`                                                                        |
| `scenario === 'cdr'`                             | `shouldCreateLead` is true even when duration is null                                             |
| Missed-call note text                            | `formatCdrNote` treats `durationSeconds <= 0` as **"cevapsız"** — requires parsed `0`, not `null` |

**Implication for D19:** rules keyed on `talktime === 0` must use an explicit policy such as `(duration ?? 0) === 0`. If NetGSM omits duration on unanswered calls, you get `null`, not `0`.

**Tests:** cover `sure: 164` and `talktime: 45`; **no test for `sure: 0` or missing duration** (`__tests__/lib/netgsm-normalize.test.ts`).

---

### Can `process-netgsm.ts` route stage change through `updateLeadRecord`?

**Yes — callable from webhook context and preferable to raw `.update()`.**

| Requirement                 | Status                                                                                           |
| --------------------------- | ------------------------------------------------------------------------------------------------ |
| Service client / no session | `updateLeadRecord` uses `createServiceClient()`                                                  |
| System attribution          | `changedBy: null`, `source: 'netgsm'` are valid (`lib/leads/write-stage-history.ts`)             |
| Side effects                | Also runs `writeStageHistory`, auto-task cancel/create, optional Chatwoot label/custom-attr push |

**Note:** `process-chatwoot.ts` currently **bypasses** `updateLeadRecord` and writes `leads` directly + `writeStageHistory` separately. NetGSM auto-advance should use the chokepoint, not copy the Chatwoot pattern.

**Key files:** `lib/leads/update-lead.ts`, `lib/leads/write-stage-history.ts`, `__tests__/lib/funnel-chokepoint.test.ts`

---

### Forward-only stage ordering source of truth

**Partial — no forward-only comparator exists today.**

| Source                                  | Role                                                                |
| --------------------------------------- | ------------------------------------------------------------------- |
| `FUNNEL_STATUSES` in `lib/constants.ts` | Canonical ordered list; same values as Chatwoot funnel labels       |
| `FUNNEL_COMPARTMENTS`                   | Kanban grouping; not a strict linear progression                    |
| `advance-stage.ts` / `updateLeadRecord` | No duplicate stage; **no forward-only or no-downgrade enforcement** |

**D19 must add** something like `FUNNEL_STATUSES.indexOf(target) > FUNNEL_STATUSES.indexOf(current)` with explicit handling for `lost`, terminal stages, and visit substates.

---

## Inbound-call surface (D14) — “just called” toast

### Real-time push to browser

**None today.**

- No Supabase Realtime, WebSocket, or SSE in the app
- CDR path: webhook → DB write only
- Closest pattern: **15s HTTP poll** for Chatwoot messages (`LEAD_CHAT_SYNC_POLL_MS`, `useLeadMessages`)
- Notifications exist for **manager Telegram/in-app** (`lead_message`, SLA, tasks) — **not** salesperson browser toasts for calls

**Implication:** “Just called” is **near-real-time at best** (poll or new Realtime subscription). Not plug-and-play.

---

### Per-agent routing for inbound calls

**No CDR-specific routing.**

| Linkage                                                       | Exists?                            |
| ------------------------------------------------------------- | ---------------------------------- |
| CDR `contact_history.salesperson_id`                          | Always `null`                      |
| `leads.assigned_to`                                           | Yes                                |
| Telegram notify for inbound **Chatwoot** messages to assignee | Yes (`run-lead-message-notify.ts`) |
| Notify all reps / DNI→agent mapping for calls                 | No                                 |

Toast recipient policy is an open product decision; codebase supports assignee-notify for chat only.

---

## Quick-search (D14)

### `search_leads_ids` coverage and performance

- Trigram search on `lead_name` and `lead_phone` (`similarity > 0.3`)
- GIN indexes on name and phone (migration 0009)
- Used via `?fuzzy=1&search=…` on leads list and pipeline
- **Not compartment-scoped** — RPC returns visible UUIDs; list filters apply afterward
- **No benchmark at current volume** in repo; should be fine at typical CRM sizes with trigram indexes

**Key files:** `supabase/migrations/0014_phase1c_search_rls.sql`, `lib/leads/leads-list-query.ts`, `pages/api/leads/pipeline.ts`

---

### RLS — can salespeople search leads they don't own?

**Own + unassigned only; not other reps' assigned leads.**

```sql
get_user_role() = 'manager'
OR l.assigned_to = auth.uid()
OR l.assigned_to IS NULL
```

- **Managers:** all leads
- **Salespeople:** own + unassigned
- Inbound caller on **someone else's lead** → salesperson won't find them via search (manager can)

---

## Editable name with provenance (D12)

**Single field today — no provenance split.**

| Item         | Finding                                                                                    |
| ------------ | ------------------------------------------------------------------------------------------ |
| Schema       | `leads.lead_name` only; no `display_name`, `auto_logged_name`, etc.                        |
| Set at       | Create time (`createLeadFromWebhook`, POST `/api/leads`)                                   |
| PATCH        | **Not** in `UpdateLeadSchema` — not editable via `/api/leads/[id]`                         |
| Detail panel | Header shows `lead.lead_name`; Genel tab edits `lead_details.parent_name`, not `lead_name` |
| Chatwoot     | Does not write `lead_name`                                                                 |

**D12 needs a new column + migration** (e.g. `auto_logged_name` + `display_name`). Nothing preserves an auto-logged original if the rep renames.

---

## Pins (D7) and recently-searched (D14)

**No per-agent personal-state storage exists.**

- Only UI-local “pinned sidebar” in `Sidebar.tsx` (`useState`, not persisted)
- No `lead_pins`, user preferences JSON, or salesperson settings table

**Both features need new storage** (e.g. `lead_pins(user_id, lead_uuid)` and `recent_searches(user_id, query, …)`).

---

## Two-way sync write-back (capture / D23)

**Yes for Tier-1 mapped fields — fires per PATCH, async, best-effort.**

- `PATCH /api/lead-details/[id]` → if Chatwoot sync enabled and field in `CRM_CUSTOM_ATTR_DETAIL_FIELDS` → `void pushCustomAttributesToChatwoot(leadId)`
- Outbound attrs: `university`, `butce`, `tasinma_tarihi`, `oda_tiipi`, `kayip_nedeni`, `ogrenci_cinsiyet`, `ilgili_otel`
- Skipped if no `chatwoot_conversation_id`, empty payload, or archived lead
- Omits keys when CRM has no value (does not clear Chatwoot fields)

**D23 autosave-on-blur would trigger one Chatwoot push per saved field** unless batched/debounced — write amplification is real.

**Key files:** `pages/api/lead-details/[leadId].ts`, `lib/chatwoot/push-custom-attributes.ts`, `lib/chatwoot/sync-custom-attributes.ts`

---

## Days-in-stage / last-contact (D2 / D13)

### `last_contact_at`

**Not reliably maintained across contact types.**

Only explicit updater:

```ts
// pages/api/contact-history/[leadId].ts — manual POST only
await supabase.from('leads').update({ last_contact_at: new Date().toISOString() });
```

| Contact type                                  | Updates `last_contact_at`? |
| --------------------------------------------- | -------------------------- |
| Manual contact log POST                       | Yes                        |
| CDR call notes                                | No                         |
| Chatwoot messages / webhook `contact_history` | No                         |

Stale pills based on `last_contact_at` will **under-count** activity from calls and chat.

---

### Days-in-stage from `lead_stage_history`

**Table exists; UI partially uses something else.**

| Item                    | Finding                                                                                           |
| ----------------------- | ------------------------------------------------------------------------------------------------- |
| Migration 0073 backfill | One baseline row per lead (`from_status NULL`, `source: system`) — not real pre-migration history |
| Go-forward transitions  | Via `updateLeadRecord`, Chatwoot webhook, visit-ops; DB trigger catches bypasses                  |
| `funnel-view.ts` today  | `time_in_stage_days` from latest **`contact_history` `status_change`**, not `lead_stage_history`  |

**Implication for D13:** switching to `lead_stage_history` is cleaner go-forward, but leads with only the backfill row (or no post-backfill transition) will have **unknown or misleading** days-in-stage unless you fall back to `created_at` / backfill timestamp.

**Key files:** `supabase/migrations/0071_lead_stage_history.sql`, `supabase/migrations/0073_stage_history_backfill_and_trigger.sql`, `pages/api/leads/[id]/funnel-view.ts`

---

## Conversation tab (D7) — phone-only leads

**Degrades to error state, not a friendly empty state.**

1. `LeadChatView` → `useLeadMessages` → `POST /api/leads/[id]/messages/sync`
2. Sync returns **404** `"No Chatwoot conversation linked to this lead"` when no conversation ID
3. UI shows **red error text**, not “no conversation” empty state
4. Pure NetGSM leads typically have `chatwoot_conversation_id = null` → **error path**

D7 default tab needs an explicit empty state before sync, or skip sync when no conversation.

**Key files:** `components/leads/LeadChatView.tsx`, `pages/api/leads/[id]/messages/sync.ts`, `hooks/useLeadMessages.ts`

---

## Team Panel (D25)

### Already computed in `lib/analytics/manager-panel.ts`

| Metric                                                               | Status                                                                |
| -------------------------------------------------------------------- | --------------------------------------------------------------------- |
| Per-rep: claimed, contacted leads, visits attended/failed, show rate | ✅                                                                    |
| Downpayments, deals signed (from `lead_stage_history`)               | ✅                                                                    |
| Single conversion rate (`dealsSigned / claimed`)                     | ✅                                                                    |
| Calls / messages / other from `contact_history`                      | ✅ (messages = `interaction_type === 'message'`, not `lead_messages`) |
| Task completion rate                                                 | ✅                                                                    |
| Summary trends (new leads, contacts, visits, deals)                  | ✅                                                                    |

### Net-new for typical D25 asks

| Metric                                                       | Status                                                                     |
| ------------------------------------------------------------ | -------------------------------------------------------------------------- |
| Four step conversion ratios (claimed→contacted→visited→deal) | ❌ only one ratio today                                                    |
| Outbound connect rate                                        | ❌                                                                         |
| Loss-reason breakdown                                        | ❌                                                                         |
| Stale at `yeni` > 7 days (aggregate)                         | ❌ (stale logic exists per-lead in `funnel-view.ts`, not in manager panel) |

### Pagination caps

- `fetchAllRows`: **1000 rows/page, max 10 pages = 10,000 rows per query**
- New heavy aggregations may need SQL/RPC rather than more in-memory paging

**Key file:** `lib/analytics/manager-panel.ts`, `pages/api/analytics/manager-panel.ts`

---

## Tasks revamp (D27)

### `/api/tasks` surface

| Method       | Behavior                                                                                                                |
| ------------ | ----------------------------------------------------------------------------------------------------------------------- |
| GET          | All tasks (managers) or `assigned_to = session.userId` (salespeople); ordered by `due_when`; **no server-side filters** |
| POST         | Manual task create                                                                                                      |
| PATCH `[id]` | `is_completed`, `notes` only                                                                                            |

### `auto_task_type` — implemented values

From `AUTO_TASK_TYPES` + `STAGE_AUTO_TASK` in `lib/tasks/auto-tasks.ts`:

- `nurture_reminder`
- `post_visit_nurture_reminder`
- `visit_reminder` (enum exists; not in stage map — may be visit-job created)
- `move_in_reminder`
- `visit_resolution`
- `failed_visit_followup`

Stage-triggered auto-create covers: `yeni`, `bilgi-verildi`, `aranacak`, `arandi`, `arandi-acmadi`, `bizi-aradi-konustuk`, `ziyaret`, `ziyaret-etmedi`, `ziyaret-etti`, `teklif-gonderildi`, `kapora-alindi`.

### Filtering

**Client-side only:** `filterTasksForListView` (role + manager assignee); `TaskListToolbar` has assignee dropdown only — no type/status/due filters.

**Key files:** `pages/api/tasks/index.ts`, `pages/api/tasks/[id].ts`, `lib/tasks/task-filters.ts`, `lib/tasks/auto-tasks.ts`

---

## General / cross-cutting — side panel refresh (D21)

**No dirty-state protection; limited overlap with poll refresh.**

| Behavior               | Finding                                                              |
| ---------------------- | -------------------------------------------------------------------- |
| Lead/details load      | One-shot fetch on open / `leadId` change via `useLeadDetail`         |
| Conversation poll      | 15s Chatwoot sync — updates **messages only**, not lead/details      |
| Dirty / unsaved guards | **None** in panel code                                               |
| Field edit UX          | `InlineEditField`: pencil → edit → explicit save (not blur autosave) |
| Optimistic updates     | `applyLeadPatch` / `applyDetailsPatch` merge after successful save   |

**D21 is mostly greenfield** for “protect edits during background refresh.” Panel doesn't blindly re-fetch lead fields on the 15s poll, but any future global refresh would overwrite without guards. Autosave-on-blur (D23) increases the need.

**Key files:** `hooks/useLeadDetail.ts`, `hooks/useLeadMessages.ts`, `components/leads/LeadDetailPanel.tsx`, `components/leads/InlineEditField.tsx`

---

## Quick reference matrix

| ID               | One-line answer                                                                         |
| ---------------- | --------------------------------------------------------------------------------------- |
| D16              | Outbound cleans stale funnel labels; Chatwoot can temporarily hold two until CRM pushes |
| D-OPEN-1         | CDR → `contact_history` only on matched lead                                            |
| D25 msg count    | `IS NOT NULL` excludes campaigns; not per-rep; not live-payload tested                  |
| D19 direction    | Derived for company-line only; not on DNI path                                          |
| D19 duration     | `0` works if sent; `null` if omitted — don't assume `0` for missed                      |
| D20 chokepoint   | `updateLeadRecord` works from webhook with `source: 'netgsm'`                           |
| D19 forward-only | Use `FUNNEL_STATUSES` order; comparator must be built                                   |
| D14 realtime     | Poll or new infra; no push today                                                        |
| D14 routing      | Assignee for chat only; CDR notifies nobody                                             |
| D14 search       | Trigram name+phone; rep sees own + unassigned                                           |
| D12 name         | Single `lead_name`; new column needed                                                   |
| D7 / D14 pins    | No persisted per-agent store                                                            |
| Write-back       | Yes, per-field Chatwoot push on PATCH                                                   |
| D2 / D13 contact | `last_contact_at` mostly manual-only today                                              |
| D2 / D13 days    | `lead_stage_history` exists; UI uses `contact_history`                                  |
| D7 conversation  | 404 error for call-only leads                                                           |
| D25 panel        | Basic team metrics exist; ratios / connect / loss / stale aggregate don't               |
| D27 tasks        | Minimal API; auto types implemented; filter client-side only                            |
| D21 refresh      | No dirty protection; poll is messages-only                                              |

---

## Related docs

- [NetGSM integration](./netgsm-integration.md) — CDR paths, company-line matching, duration fields
- [Engineering handoff](./engineering-handoff.md) — stage history chokepoint, Chatwoot sync
- `phase_documents/crm-salesperson-cockpit-implementation-plan.md` — spec decisions these answers gate
