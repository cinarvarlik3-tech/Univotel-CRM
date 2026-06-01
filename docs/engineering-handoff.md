# Univotel CRM — Engineering Handoff

**Last updated:** 2026-05-28  
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

**Not built (by design):** Phase 5 automation rules, n8n orchestration, ElevenLabs voice, Chatwoot custom attributes → CRM auto-sync (labels only today).

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
  api/cron/         sla-alerts, task-overdue, campaign-resume, ga4-enrichment
  api/leads/        list (expanded filters), CRUD, archive, messages, request-rec, rec-hotel
  api/old-leads/    read-only list + detail + messages (manager+)
  api/campaigns/    manager campaigns
  api/dni/          public number list for GTM
  api/admin/dni-numbers/  superadmin CRUD
  leads/, old-leads/, campaigns/, webhook-logs/, properties/, ...

lib/
  leads/            create, assign, dedupe, SLA, archive, save-rec-hotel, parse-rec-hotel, chat sync
  webhooks/         processors, verify, normalize-netgsm-payload, webhook_logs, replay
  query/            filter-builder, split-filters, composite filters, supabase-query-types
  ui/               build-*-query-string, append-list-filter-params, list-filter-types
  chatwoot/         API client, label sync, messages
  campaigns/        segment, worker, WhatsApp template send
  attribution/      collected_data, confidence, GA4
  dni/              lookup, normalize, increment lead_count
  auth/             session, roles

supabase/migrations/   0001–0047 (47 files)
types/                 database.ts (generated), domain.ts, webhooks.ts
docs/                  runbook, onboarding, this file, netgsm-integration
```

After any migration: `pnpm gen:types`.

---

## 4. Database — migration snapshot

| Range     | Purpose                                                                                        |
| --------- | ---------------------------------------------------------------------------------------------- |
| 0001–0018 | Core CRM: salespeople, properties, leads, tasks, campaigns, webhook_logs                       |
| 0019–0032 | Analytics, archive, pg_cron, notifications                                                     |
| 0033–0037 | Superadmin, ref_sessions, dni_numbers, collected_data, GA4 cron                                |
| 0038–0040 | old_leads, old_lead_details, old_lead_messages                                                 |
| 0041      | lead_messages (live Chatwoot cache)                                                            |
| 0042–0044 | Property availability, room types, physical rooms                                              |
| 0045–0046 | lead_details rec fields (campus, room_category, rec_hotel jsonb); drop redundant gender column |
| 0047      | `search_old_leads_ids` RPC (fuzzy search on old leads)                                         |

**Lead lifecycle states:** Active (`is_deleted=false`, `is_archived=false`) → Archived → soft-deleted.

---

## 5. Roles and access

| Role          | Access                                                                            |
| ------------- | --------------------------------------------------------------------------------- |
| `salesperson` | Own + unassigned active leads; tasks; properties read; **My Leads** `/leads/mine` |
| `manager`     | All active + archived; campaigns; webhook-logs; old-leads; dashboard; analytics   |
| `superadmin`  | Manager + `/admin/dni-numbers`                                                    |

RLS enforces row access; API routes also check session role. Auth user UUID **must** match `salespeople.id`.

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

**Shipped 2026-05:** Tier 1 + Tier 2 filter expansion with shared query pipeline.

**UI:** `/leads` and `/old-leads` toolbars have collapsible sections (Pipeline open by default). Filters map to `filter[field][operator]=value` query params.

**Query layer:**

| Module                                 | Role                                                              |
| -------------------------------------- | ----------------------------------------------------------------- |
| `lib/query/filter-builder.ts`          | Parse/validate/apply filters (`eq`, `ilike`, `is`, `cs`, `ov`, …) |
| `lib/query/supabase-query-types.ts`    | Typed PostgREST builder shapes                                    |
| `lib/ui/append-list-filter-params.ts`  | Toolbar state → URL params                                        |
| `lib/query/apply-composite-filters.ts` | Old-lead `rec_hotel` TEXT empty-string handling                   |

**Active-only filters:** campus, room category, district preference, interested hotel (property dropdown).

**Old-leads-only:** manager+ access; fuzzy search requires migration **0047**.

**Campaign segments** reuse `FILTERABLE_COLUMNS` from `lib/constants.ts` — new whitelist fields work in segment JSON automatically.

See [`runbook.md` — Lead list filters](./runbook.md) for operator reference.

---

## 8. Hotel recommendation (Make.com)

**Status:** Live (property-level output only — no room type/price in callback).

| Step                                   | Component                                                                                 |
| -------------------------------------- | ----------------------------------------------------------------------------------------- |
| User fills Profile **Öneri Girdileri** | `student_gender`, `campus`, `budget_max`, `room_category`, optional `district_preference` |
| **Öneri Al**                           | `POST /api/leads/{id}/request-rec` → proxies to `MAKE_WEBHOOK_URL`                        |
| Make.com callback                      | `PATCH /api/leads/{id}/rec-hotel`                                                         |
| DB write                               | `lib/leads/save-rec-hotel.ts` (service role)                                              |
| UI display                             | `LeadRecHotel` + polling in `LeadRecommendationPanel`                                     |

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

**ESLint rule:** `@/lib/supabase/service` only importable from allowed `lib/` paths — not from `pages/api/`.

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

## 15. Document index

| Document                                                   | Use when                                  |
| ---------------------------------------------------------- | ----------------------------------------- |
| [`runbook.md`](./runbook.md)                               | Production incidents, curl tests, SQL     |
| [`netgsm-integration.md`](./netgsm-integration.md)         | NetGSM webhook, DNI, CDR, troubleshooting |
| [`engineering-onboarding.md`](./engineering-onboarding.md) | First-week orientation                    |
| [`phase_4_tests.md`](./phase_4_tests.md)                   | Attribution / GTM / DNI QA                |
| **This file**                                              | Handoff — current state snapshot          |

---

## 16. Escalation

| Topic                | Contact                    |
| -------------------- | -------------------------- |
| NetGSM CDR / payload | teknikdestek@netgsm.com.tr |
| Supabase             | status.supabase.com        |
| Cloudflare           | cloudflarestatus.com       |
