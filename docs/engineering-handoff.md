# Univotel CRM — Engineering Handoff

**Last updated:** 2026-06-19  
**Production:** https://panel.marketinguni.app  
**Audience:** Engineers taking over development, on-call, or deployment.

This document describes the **current state of the codebase and production system**. For day-to-day incidents use [`runbook.md`](./runbook.md). For NetGSM-specific depth see [`netgsm-integration.md`](./netgsm-integration.md). For first-week orientation see [`engineering-onboarding.md`](./engineering-onboarding.md).

---

## 1. Product summary

Univotel CRM is an internal **student housing sales operations platform** (Turkey). It:

- Ingests leads from **Chatwoot** (WhatsApp / Instagram), **NetGSM** (GSM calls via CDR webhook), and **Meta WhatsApp** (voice calls + campaign delivery statuses)
- Normalizes identifiers, deduplicates, auto-assigns salespeople, tracks **SLA** and **tasks**
- Sends **Telegram** alerts to managers and agents
- Runs **WhatsApp template campaigns** (manager UI)
- Stores **marketing attribution** (REF, UTM, DNI, GA4) in `collected_data` parallel to `leads.source_details`
- Archives terminal leads after **80 days**
- Browses **historical Chatwoot imports** in read-only `old_leads` (~8.5k rows)
- Supports **live Conversation tab** on active leads (Chatwoot API cache, 15s poll)
- Supports **hotel recommendation** workflow (Make.com) with property-level results in `lead_details.rec_hotel`
- Provides **My Day** salesperson cockpit (`/my-day`) — counters, tasks, attention queue, personal performance
- Provides **manager analytics** on `/dashboard` — **Everyday**, **Marketing**, and **Loss Analysis** tabs (live-query dashboards with shared global date filter) plus an unchanged **Team panel** tab (range-scoped KPIs, daily trends, per-salesperson table)
- Provides **FMS** (`/fms/*`) — manager finance dashboard: contracted revenue, Univotel commission, partner/property drill-down, seasonal room prices (migrations `0096`–`0098`)
- Organizes active pipeline into **stage compartment pages** (nurture, visits, post-visit, downpayment, deal-signed, 24h-restricted, move-in, etc.) plus `/visits` and `/move-in` calendars
- Provides **PMS** (`/pms/*`) — property management: room inventory, placements (`lead_rooms`), operator write paths (migrations `0083`–`0091`)

**Not built (by design):** Phase 5 automation rules, n8n orchestration, ElevenLabs voice.

---

## 2. Runtime architecture

```
Marketing sites (GTM) ──GET /api/ref, /api/dni──┐
Chatwoot ──POST /api/webhooks/chatwoot──────────┤
NetGSM ───POST /api/webhooks/netgsm───────────┼──► Cloudflare Worker (OpenNext)
Meta ─────POST /api/webhooks/whatsapp-* ──────┤         │
Telegram ─POST /api/webhooks/telegram ────────┘         ▼
                                              Supabase Postgres + Auth
                                              pg_cron → POST /api/cron/*
```

| Layer           | Technology                                                                   |
| --------------- | ---------------------------------------------------------------------------- |
| UI + API        | Next.js 15 **Pages Router** on Cloudflare Workers (`@opennextjs/cloudflare`) |
| Database        | Supabase Postgres, RLS on most tables                                        |
| Auth            | Supabase Auth; session cookies via `middleware.ts`                           |
| Cron            | Supabase `pg_cron` + `pg_net` HTTP to CRM with `CRON_SECRET`                 |
| Package manager | **pnpm** 9 (`packageManager` in `package.json`)                              |

**Critical patterns:**

- Webhooks **await** processing before HTTP 200 (Worker isolate safety).
- **`lib/`** = business logic; **`pages/api/`** = thin handlers; **`components/`** = UI.
- **Service role** (`lib/supabase/service.ts`) for webhooks, cron, imports — **never** import from `pages/api/` directly (ESLint `no-restricted-imports`). Delegate to `lib/leads/`, `lib/jobs/`, etc.
- Session middleware excludes: `/api/webhooks/*`, `/api/cron/*`, `/api/ref/*`, `/api/dni/*`, `/api/health`.

---

## 3. Repository map (current)

```
pages/
  api/webhooks/     chatwoot, netgsm, whatsapp-calls, telegram
  api/cron/         sla-alerts, task-overdue, campaign-resume, ga4-enrichment, lead-message-notify, restriction-24h, visit/move-in/nurture crons
  api/leads/        list (expanded filters), CRUD, archive, messages, request-rec, rec-hotel, log-contact, advance-stage, activity, claim, visits
  api/my-day/       personal cockpit + performance metrics
  api/analytics/    everyday, marketing, loss-analysis, manager-panel, team-metrics, archive-summary, dni-performance (+ legacy MV index)
  api/fms/          dashboard, totals, lookups, partner/property drill-down, room-type-prices
  api/pms/          properties, rooms, unplaced, place, vacate, relocate, change-room, placement-note
  api/old-leads/    read-only list + detail + messages (manager+)
  api/campaigns/    manager campaigns
  api/visits/       visit calendar CRUD
  api/dni/          public number list for GTM
  api/admin/dni-numbers/  superadmin CRUD
  my-day.tsx, leads/* (stage compartments), visits/, move-in/, dashboard/, fms/, pms/, ...

lib/
  leads/            create, assign, dedupe, SLA, archive, save-rec-hotel, parse-rec-hotel, chat sync, filters
  my-day/           My Day + performance aggregations
  analytics/        everyday, marketing, loss-analysis payloads; manager-panel; overview-range; source-buckets
  finance/          FMS revenue rollup (`revenue.ts`), types, format helpers
  pms/              placement ops, queries, floor display, trigger error mapping
  webhooks/         processors, verify, normalize-netgsm-payload, webhook_logs, replay
  query/            filter-builder, split-filters, composite filters, supabase-query-types
  ui/               build-*-query-string, serialize-field-filters, lead-list-query
  chatwoot/         API client, label sync, custom attributes, messages
  campaigns/        segment, worker, WhatsApp template send
  attribution/      collected_data, confidence, GA4
  jobs/             cron runners (visit reminders, nurture alerts, etc.)
  dni/              lookup, normalize, increment lead_count
  auth/             session, roles

supabase/migrations/   0001–0098 (98 files)
types/                 database.ts (generated), domain.ts, webhooks.ts
docs/                  runbook, onboarding, this file, netgsm-integration
```

After any migration: `pnpm gen:types`.

---

## 4. Database — migration snapshot

| Range     | Purpose                                                                                                                                                                                            |
| --------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0001–0018 | Core CRM: salespeople, properties, leads, tasks, campaigns, webhook_logs                                                                                                                           |
| 0019–0032 | Analytics, archive, pg_cron, notifications                                                                                                                                                         |
| 0033–0037 | Superadmin, ref_sessions, dni_numbers, collected_data, GA4 cron                                                                                                                                    |
| 0038–0040 | old_leads, old_lead_details, old_lead_messages                                                                                                                                                     |
| 0041      | lead_messages (live Chatwoot cache)                                                                                                                                                                |
| 0042–0044 | Property availability, room types, physical rooms                                                                                                                                                  |
| 0045–0046 | lead_details rec fields (campus, room_category, rec_hotel jsonb); drop redundant gender column                                                                                                     |
| 0047      | `search_old_leads_ids` RPC (fuzzy search on old leads)                                                                                                                                             |
| 0048–0060 | Lead messaging, universities, deal_awaiting, funnel stages, loss_reason trigger, Chatwoot sync                                                                                                     |
| 0061      | `budget_tier` replaces `budget_min`; derived `budget_max`; Chatwoot `butce` sync                                                                                                                   |
| 0062–0073 | Major Update — funnel consolidation (`lost`), visits, boolean flags, auto-tasks, 24h restriction cron, `claimed_at`, `lead_stage_history`, message attribution                                     |
| 0074–0079 | Display names, lead pins, quick search RPC, team-panel RPCs, `home_property_id` on salespeople                                                                                                     |
| 0083–0091 | **PMS** — `room_types`, `rooms`, `lead_rooms`, placement triggers, reconcile cron, seed data; `0090` adds `operator` role + PMS RLS write policies                                                 |
| 0093–0095 | Partner access — `partners` table; `partner_id` FK on properties/salespeople; `partner_operator` role; `interested_property_ids` UUID[]; partner RLS policies; fix unassigned-lead RLS leak        |
| 0096–0098 | **FMS** — `lead_finance` ledger, `active_finance` view, `fms_revenue_breakdown()` / `fms_property_roomtype_breakdown()` RPCs; seasonal `room_type_prices`; auto-vacate on lost / drop-below-kapora |

**Lead lifecycle states:** Active (`is_deleted=false`, `is_archived=false`) → Archived → soft-deleted.

---

## 5. Roles and access

| Role               | Access                                                                                                                                                                                                                                                                                       |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `salesperson`      | Own + unassigned active leads; tasks; properties read; **My Day** `/my-day`; **My Leads** `/leads/mine`; stage compartment pages; PMS read-only                                                                                                                                              |
| `operator`         | Same as salesperson + **PMS write** (place, vacate, relocate, change-room); no FMS, dashboard, Hub, archive, My Day, or deal-awaiting                                                                                                                                                        |
| `manager`          | All active + archived; campaigns; webhook-logs; old-leads; **FMS** `/fms/*`; dashboard (Everyday / Marketing / Loss Analysis / Team panel tabs)                                                                                                                                              |
| `superadmin`       | Manager + `/admin/dni-numbers`                                                                                                                                                                                                                                                               |
| `partner_operator` | Full funnel stage pages (nurture → moved-in) scoped **exclusively to their partner's properties' leads** via RLS; PMS write scoped to own properties. No Hub, archive, My Day, dashboard, FMS, or deal-awaiting. Must have `salespeople.partner_id` set — DB CHECK constraint enforces this. |

RLS enforces row access; API routes also check session role. Auth user UUID **must** match `salespeople.id`.

### Partner access architecture

- **`partners` table** — UUID PK, one row per dormitory partner. Currently: Academic House.
- **`properties.partner_id`** — FK to `partners`; null means Univotel-owned.
- **`salespeople.partner_id`** — FK to `partners`; non-null required for `partner_operator` role (CHECK constraint).
- **`lead_details.interested_property_ids UUID[]`** — maintained by trigger from `interested_hotel TEXT[]`; used by `lead_partner_owner()` to compute attribution.
- **`lead_partner_owner()`** — SECURITY DEFINER function resolving which partner owns a lead: `purchased_room` property > most recent `visit` property > `interested_property_ids`. Later-stage signals always override earlier ones.
- **Route guard** — `AppShell` enforces an allowlist; blocked routes redirect to `/leads`. `search_leads_global` RPC raises an exception for partners. Assignment filters (`mineOnly`, `unassignedOnly`) are skipped for partner sessions — RLS is the sole scoping mechanism.

---

## 6. Inbound channels (summary)

| Channel        | Endpoint                            | Auth         | Lead source              | SLA       |
| -------------- | ----------------------------------- | ------------ | ------------------------ | --------- |
| Chatwoot WA/IG | `POST /api/webhooks/chatwoot`       | HMAC         | `whatsapp` / `instagram` | 30 min    |
| NetGSM calls   | `POST /api/webhooks/netgsm`         | Body `token` | `netgsm_call`            | **5 min** |
| Meta WA calls  | `POST /api/webhooks/whatsapp-calls` | Meta HMAC    | `whatsapp_call`          | 5 min     |
| Manual         | UI `/leads/new`                     | Session      | `manual`                 | 480 min   |

Full NetGSM detail: [`netgsm-integration.md`](./netgsm-integration.md).

---

## 7. Lead list filters (active + old leads)

**Shipped 2026-06:** Filter panel revamp — four sections mirroring lead detail tabs (Genel / Profil / Detay / Sistem), per-field **Değer / Dolu / Boş** modes, per-field fuzzy on text inputs.

**UI:** `/leads` and `/old-leads` toolbars share the same layout. Top bar: search, Filters toggle, sort, Apply, Clear. Filter panel sections are collapsible (Genel open by default). Pipeline view reuses applied state with funnel/deal-awaiting overrides.

**State model:** `types/filter.ts` → `LeadListFilterState.fieldFilters` (per-field mode + value). Serialized by `lib/ui/serialize-field-filters.ts`.

**Query layer:**

| Module                                   | Role                                                  |
| ---------------------------------------- | ----------------------------------------------------- |
| `lib/leads/filter-field-registry.ts`     | Field definitions by section (single source of truth) |
| `lib/ui/serialize-field-filters.ts`      | `fieldFilters` + Sistem date ranges → URL params      |
| `lib/ui/build-leads-query-string.ts`     | Active leads query builder                            |
| `lib/ui/build-old-leads-query-string.ts` | Old leads query builder                               |
| `lib/query/filter-builder.ts`            | Server-side parse/validate/apply                      |
| `lib/query/apply-composite-filters.ts`   | Old-lead `rec_hotel` TEXT empty-string handling       |

**Notable behaviors:**

- `parent_name` filter lives in **Profil** only (also shown on Genel side panel for editing)
- `funnel_status` filter in **Genel** only; ignored in pipeline columns
- Assignee filter: managers only
- Active leads use `budget_tier`; old leads use `budget_min` / `budget_max`
- Sistem section includes date-range shortcuts; Detay also has `created_at` operator filter (both can compose)

**Old-leads-only:** manager+ access.

**Campaign segments** reuse `FILTERABLE_COLUMNS` from `lib/constants.ts` — new whitelist fields work in segment JSON automatically.

See [`runbook.md` — Lead list filters](./runbook.md) for full field inventory and operator reference.

---

## 8. Hotel recommendation (Make.com)

**Status:** Live (property-level output only — no room type/price in callback).

| Step                                                | Component                                                                                                                                                   |
| --------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| User fills **Profil** + **Detay → Öneri Girdileri** | Profil: `student_gender`, `budget_tier`. Detay: `campus`, `room_category`, optional `district_preference`. `budget_max` derived from tier for Make payload. |
| **Öneri Al** (Detay tab)                            | `POST /api/leads/{id}/request-rec` → proxies to `MAKE_WEBHOOK_URL`                                                                                          |
| Make.com callback                                   | `PATCH /api/leads/{id}/rec-hotel`                                                                                                                           |
| DB write                                            | `lib/leads/save-rec-hotel.ts` (service role)                                                                                                                |
| UI display                                          | `LeadRecHotel` + polling in `LeadRecommendationPanel`                                                                                                       |

**Callback auth:** `Authorization: Bearer {CRON_SECRET}` or authenticated CRM session.

**Payload shape (current):**

```json
{
  "recommendations": [
    {
      "property_id": "uuid",
      "hotel_name": "string",
      "district": "string",
      "tags": []
    }
  ]
}
```

**Env:** `MAKE_WEBHOOK_URL`, `CRON_SECRET`.

---

## 9. Old leads (historical import)

| Item            | Detail                                                               |
| --------------- | -------------------------------------------------------------------- |
| Tables          | `old_leads`, `old_lead_details`, `old_lead_messages`                 |
| UI              | `/old-leads` (manager+); read-only                                   |
| Import          | `pnpm import:old-leads:write`, `pnpm import:old-lead-messages:write` |
| Gender backfill | `pnpm backfill:old-lead-gender:write` (infers from messages)         |
| Count           | ~8,520 leads; ~20% missing university                                |

Not connected to live webhooks, SLA, or archive pipeline.

---

## 10. Attribution (Phase 4)

| Mechanism | Storage                          | Notes                                              |
| --------- | -------------------------------- | -------------------------------------------------- |
| REF + UTM | `ref_sessions`, `collected_data` | Browser session from GTM                           |
| DNI       | `dni_numbers`                    | NetGSM `aranan` matched on call create             |
| GA4       | Async cron                       | Requires `ref_code`; **not** used for NetGSM calls |

Public APIs: `GET /api/ref/generate`, `GET /api/dni/numbers` (1h cache).

DNI admin: `/admin/dni-numbers` (superadmin). Numbers seeded inactive until real NetGSM virtual numbers configured.

---

## 11. Key environment variables

Validated in `lib/env.ts` (Zod — app fails fast if missing).

| Variable                                                               | Purpose                       |
| ---------------------------------------------------------------------- | ----------------------------- |
| `NEXT_PUBLIC_SUPABASE_*`                                               | Client + server Supabase      |
| `SUPABASE_SERVICE_ROLE_KEY`                                            | Webhooks, cron, imports       |
| `CHATWOOT_WEBHOOK_SECRET`, `CHATWOOT_API_TOKEN`, `CHATWOOT_ACCOUNT_ID` | Inbound + outbound Chatwoot   |
| `NETGSM_STATIC_TOKEN`                                                  | NetGSM JSON body `token`      |
| `WHATSAPP_*`                                                           | Meta webhooks + campaigns     |
| `TELEGRAM_*`                                                           | Alerts                        |
| `CRON_SECRET`                                                          | pg_cron callbacks (≥32 chars) |
| `MAKE_WEBHOOK_URL`                                                     | Hotel recommendation trigger  |
| `GOOGLE_SERVICE_ACCOUNT_JSON`, `GA4_PROPERTY_ID`                       | Optional GA4 enrichment       |

**Production secrets:** Cloudflare Wrangler (`pnpm exec wrangler secret list`).  
**Cron HTTP config:** Supabase `cron_settings` (`base_url`, `cron_secret`) must match `CRON_SECRET`.

---

## 12. Testing and quality gate

```bash
pnpm test          # Vitest — __tests__/lib/
pnpm build         # ESLint + TypeScript (must pass before deploy)
pnpm cf:deploy     # OpenNext build + wrangler deploy
```

**ESLint rule:** `@/lib/supabase/service` only importable from allowed `lib/` paths (including `lib/analytics/`, `lib/my-day/`) — not from `pages/api/`.

**No E2E Playwright suite.** Manual integration checklists in `docs/phase_4_tests.md`.

---

## 13. Deployment

- **Manual CLI** — no GitHub Actions deploy pipeline
- Worker name: `univotel-crm` (`wrangler.jsonc`)
- Post-deploy: `curl https://panel.marketinguni.app/api/health`
- Convention: deploy from `main` after tests pass

---

## 14. Known quirks / tech debt

| Item                               | Detail                                                                                |
| ---------------------------------- | ------------------------------------------------------------------------------------- |
| NetGSM missing token               | HTTP verify passes when `token` absent; processor may still run                       |
| NetGSM `aranan` queue suffix       | e.g. `85030xxx-queue-MusteriHizmetleri` may break DNI match                           |
| NetGSM CDR vs IVR                  | IVR “CRM Call Integration” screen ≠ HTTP CDR webhook                                  |
| `contact_history.interaction_type` | NetGSM leads get `whatsapp_call` because `leadSource.includes('call')`                |
| `webhook_logs` replay              | **Failed** rows only; `skipped` not replayable                                        |
| Always HTTP 200 after auth         | Processing errors logged + Telegram; NetGSM won't retry on 5xx                        |
| Gender on active leads             | Single field `student_gender`; list API returns raw details (not `lead_details_safe`) |
| Phase 5 automation                 | Not implemented                                                                       |

---

## 15. Manager analytics, FMS & My Day

### `/dashboard` (manager / superadmin)

Four tabs on **one route** (`pages/dashboard/index.tsx`) — local React state only, no per-tab URLs:

| Tab                    | Purpose                                                                                     | API (lazy — fetched only when tab is active) |
| ---------------------- | ------------------------------------------------------------------------------------------- | -------------------------------------------- |
| **Everyday** (default) | Top KPI cards, funnel (snapshot pie + median time-in-stage), activity, visits               | `GET /api/analytics/everyday`                |
| **Marketing**          | Six source-attribution cards + two pies; ad-spend placeholder section                       | `GET /api/analytics/marketing`               |
| **Loss Analysis**      | Lost-by-reason / stages-before-loss pies, loss-over-time (rate ⇄ count), lost-by-source bar | `GET /api/analytics/loss-analysis`           |
| **Team panel**         | Unchanged — salesperson selector, range buttons, KPIs, trend charts, team table             | `GET /api/analytics/manager-panel`           |

**Container controls** (above tab content; apply to the three analytics tabs only — **not** Team panel):

- **Global date filter** — `Today \| This Week \| This Month \| All Time \| Custom` (default **All Time** = pass-through to section/widget filters)
- **Reset** — restores global to All Time
- **Calculation notes toggle** — `localStorage` key `univotel-analytics-calc-notes` (default on)

**Time-filter precedence:** global (when not All Time) → section → widget (Activity/Visits line charts). **Snapshot-exempt:** Unclaimed Leads card and Leads-by-Funnel-Stage pie always show current state.

**Data layer:** all metrics computed in `lib/analytics/everyday.ts`, `marketing.ts`, `loss-analysis.ts` — **not** in React components. Shared helpers: `lib/analytics/overview-shared.ts`, `overview-range.ts`, `source-buckets.ts`.

**Marketing wiring (2026-06):** NetGSM Call / WhatsApp DM / Instagram DM / Other wired from `lead_source`. **Meta Ads + Google Ads** UI ships but reads **0** until paid-source resolver lands. **DNI is scrapped** for analytics — one shared phone number; phone leads are unconditionally NetGSM Call.

**Legacy:** `GET /api/analytics` (materialized views) still exists and `mv_refresh` cron still runs every 5 min — used by `archive-summary` / legacy consumers, **not** the dashboard UI.

Team panel credit rules mirror My Day performance (`lib/my-day/performance.ts`): stage transitions credit `changed_by`, visits credit `created_by`, contacts credit `salesperson_id`. Operational detail: [`runbook.md` — Dashboard tabs](./runbook.md).

### FMS (`/fms/*`)

Manager-only finance module. Revenue from `lead_finance` / `active_finance` via Postgres RPCs. UI: `components/finance/*`, `hooks/useFms.ts`, `lib/finance/revenue.ts`. See [`runbook.md` — FMS dashboard](./runbook.md).

### My Day

| Surface   | API                                              | Data                                                 | Access    |
| --------- | ------------------------------------------------ | ---------------------------------------------------- | --------- |
| `/my-day` | `GET /api/my-day`, `GET /api/my-day/performance` | Self-scoped counters, tasks, attention queue, funnel | all staff |

---

## 16. Document index

| Document                                                   | Use when                                  |
| ---------------------------------------------------------- | ----------------------------------------- |
| [`runbook.md`](./runbook.md)                               | Production incidents, curl tests, SQL     |
| [`netgsm-integration.md`](./netgsm-integration.md)         | NetGSM webhook, DNI, CDR, troubleshooting |
| [`engineering-onboarding.md`](./engineering-onboarding.md) | First-week orientation                    |
| [`phase_4_tests.md`](./phase_4_tests.md)                   | Attribution / GTM / DNI QA                |
| **This file**                                              | Handoff — current state snapshot          |

---

## 17. Escalation

| Topic                | Contact                    |
| -------------------- | -------------------------- |
| NetGSM CDR / payload | teknikdestek@netgsm.com.tr |
| Supabase             | status.supabase.com        |
| Cloudflare           | cloudflarestatus.com       |
