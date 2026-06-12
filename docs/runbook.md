# Univotel CRM — Production Runbook

Last updated: 2026-06-11. This document describes **what the running system does now** and **how to fix it when something breaks**. For design history, see implementation docs; this is operational reference only.

---

## 1. System Overview

Univotel CRM ingests leads from Chatwoot (WhatsApp/Instagram), NetGSM (phone calls), and Meta WhatsApp calls, stores them in Supabase Postgres, assigns them to salespeople, tracks SLA and tasks, sends Telegram alerts to managers and agents, runs WhatsApp campaigns, and archives terminal leads after **80 days**. **Phase 4** adds first-click attribution: REF codes and UTM from marketing sites, Dynamic Number Insertion (DNI) for call source tracking, a `collected_data` table written in parallel with `leads.source_details`, and async GA4 Data API session enrichment. **Old leads (historical import):** one-time bulk import from a Chatwoot SQL dump (`readable_database.sql`) into read-only `old_leads` / `old_lead_details` (migrations `0038`–`0039`), plus one-time message import into `old_lead_messages` (`0040`) — browsable at `/old-leads` with a read-only **Conversation** tab (manager/superadmin only). **Active lead chat (live):** Messages are continuously synced into `lead_messages` via the Chatwoot `message_created` webhook. Opening **Conversation** on an active lead slide-over additionally calls the Chatwoot Application API to backfill history and re-syncs every **15s** while the tab stays open (requires `CHATWOOT_API_TOKEN` + `CHATWOOT_ACCOUNT_ID`). Old leads are not wired to live webhooks or the active SLA/archive pipeline. The UI and API run on Cloudflare Workers (OpenNext). Scheduled jobs run in **Supabase pg_cron** (HTTP callbacks to the CRM for most jobs; archive/reconcile remain SQL-only).

| Service                            | What it does                                                                 | If it goes down                                                                 |
| ---------------------------------- | ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| `panel.marketinguni.app`           | CRM UI + all `/api/*` routes                                                 | Nothing works — no UI, no webhooks, no cron callbacks, no REF/DNI for GTM       |
| Supabase (Postgres + Auth)         | Database, RLS, pg_cron, pg_net HTTP jobs                                     | Total outage — auth, data, all crons stop                                       |
| Cloudflare Workers                 | Hosts Next.js app                                                            | Same as panel URL down                                                          |
| Chatwoot (`marketinguni.app`)      | WhatsApp/IG inbox; sends webhooks to CRM                                     | New message leads stop; existing CRM data OK                                    |
| NetGSM                             | GSM call CDR webhooks                                                        | New call leads stop; DNI `lead_count` stops incrementing                        |
| Meta WhatsApp API                  | Call + status webhooks; campaign template sends; Meta `referral` on messages | Call leads + campaigns stop; WhatsApp full attribution (REF/ad fields) degraded |
| Google Analytics 4 + Data API      | Session enrichment via `ref_code` custom dimension                           | Leads still created; `ga4_enriched` stays false after 4 attempts                |
| GTM on univotel.com + side domains | REF generation, DNI swap, GA4 events                                         | No REF/UTM on site; call/message attribution lossy or unknown                   |
| Telegram Bot API                   | Manager alerts + salesperson task alerts                                     | **CRM keeps working** — alerts silently fail                                    |

**Lead lifecycle (three states):**

| State          | `is_deleted` | `is_archived` | Visible in `/leads` | Visible in `/leads/archived` |
| -------------- | ------------ | ------------- | ------------------- | ---------------------------- |
| Active         | `false`      | `false`       | Yes                 | No                           |
| Archived       | `false`      | `true`        | No                  | Yes (managers only)          |
| Deleted (soft) | `true`       | any           | No                  | No                           |

**Roles:**

| Role          | Access                                                                                                                                                                                                            |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `salesperson` | Assigned + unassigned active leads (incl. **Conversation** tab — live Chatwoot sync per open lead); own tasks; read-only properties; **My Day** `/my-day`; **My Leads** at `/leads/mine`; stage compartment pages |
| `manager`     | All active leads, archived leads, dashboard, campaigns, webhook logs, notifications; **My Leads** for personally assigned subset; **Old leads** at `/old-leads` (read-only historical imports)                    |
| `superadmin`  | Everything `manager` has + **DNI numbers admin** (`/admin/dni-numbers`); same manager-level data access via RLS                                                                                                   |

`/leads/my` is an alias that redirects to `/leads/mine`. Salespeople cannot access archived routes or `/old-leads` (API 403, UI redirect).

---

## 2. Environment & Access

### Production URLs

| Resource             | URL                                                                      |
| -------------------- | ------------------------------------------------------------------------ |
| CRM (production)     | https://panel.marketinguni.app                                           |
| Health check         | https://panel.marketinguni.app/api/health                                |
| Chatwoot             | https://marketinguni.app                                                 |
| Supabase dashboard   | https://supabase.com/dashboard → project from `NEXT_PUBLIC_SUPABASE_URL` |
| Cloudflare dashboard | https://dash.cloudflare.com → Workers → `univotel-crm`                   |

### Where credentials live (no secrets in this doc)

| Secret / config                                                             | Location                                                                                           |
| --------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| All app secrets (Supabase keys, webhook secrets, Telegram, Meta, cron, GA4) | **Cloudflare Wrangler secrets** — list with `pnpm exec wrangler secret list`                       |
| GA4 service account JSON                                                    | Wrangler secret `GOOGLE_SERVICE_ACCOUNT_JSON` (never commit)                                       |
| GA4 property ID                                                             | Wrangler secret `GA4_PROPERTY_ID` (numeric, from GA4 Admin → Property settings)                    |
| Local dev                                                                   | `.env.local` (copy from `.env.example`)                                                            |
| Cloudflare local preview                                                    | `.dev.vars` (copy from `.dev.vars.example`)                                                        |
| pg_cron HTTP job config                                                     | Supabase **`cron_settings`** table (`base_url`, `cron_secret`) — set via SQL editor, not in git    |
| Auth users                                                                  | Supabase Dashboard → Authentication → Users (UUID must match `salespeople.id`)                     |
| GTM containers                                                              | Google Tag Manager (external) — `univotel.com` + side domains; not in this repo                    |
| NetGSM virtual numbers                                                      | NetGSM account — mapped in `dni_numbers` table via superadmin UI                                   |
| Chatwoot SQL dump (old leads import)                                        | Local file `readable_database.sql` (gitignored) — export from Chatwoot Postgres; not in repo       |
| Chatwoot API (active lead live chat)                                        | Wrangler: `CHATWOOT_API_TOKEN`, `CHATWOOT_ACCOUNT_ID`, `CHATWOOT_BASE_URL` — same as assignee sync |

### Connect to Supabase SQL

1. Open Supabase Dashboard → your project → **SQL Editor**
2. Or use connection string from Dashboard → Settings → Database (service role for admin queries)
3. Run read queries freely; avoid destructive writes without backup

### Verify Telegram bot token

```bash
# Replace TOKEN with value from wrangler secret (do not commit)
curl "https://api.telegram.org/bot<TOKEN>/getMe"
```

Expect `"ok":true`. If false, regenerate via @BotFather and update Wrangler secret `TELEGRAM_BOT_TOKEN`.

### Verify cron secret alignment

`CRON_SECRET` must match in **three places**:

1. Wrangler: `pnpm exec wrangler secret list` (name only; value not shown)
2. Local: `.env.local` → `CRON_SECRET=...`
3. Supabase SQL:

```sql
SELECT key, left(value, 8) || '...' AS value_preview FROM cron_settings;
```

Generate new secret: `openssl rand -base64 32`

---

## 3. Deployment

Deploy is **manual from local CLI** — no GitHub CI pipeline.

### Deploy app (Cloudflare Workers)

```bash
cd "/path/to/Univotel CRM"
pnpm install
pnpm run cf:deploy
```

If deploy fails on R2 cache upload (`503`), the default `cf:deploy` script already skips R2 pre-upload. Alternative with cache warm-up:

```bash
pnpm run cf:deploy:with-cache
```

**Smoke test after deploy:**

```bash
curl -s https://panel.marketinguni.app/api/health | jq .
```

Expect: `{"data":{"status":"ok","timestamp":"..."}}`

### Run database migrations

```bash
pnpm db:migrate          # runs: supabase db push
pnpm gen:types           # regenerates types/database.ts from remote schema
```

Migrations are in `supabase/migrations/` numbered `0001`–`0073`. Apply in order.

| Range         | Phase                                                                                                                                |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `0026`–`0032` | Phase 3 — archive fields, nightly archive, analytics MVs, 80-day cutoff                                                              |
| `0033`–`0037` | Phase 4 — superadmin role, `ref_sessions`, `dni_numbers`, `collected_data`, GA4 enrichment cron                                      |
| `0038`–`0039` | Old leads — `old_leads`, `old_lead_details`, unique `chatwoot_conversation_id` for idempotent import                                 |
| `0040`        | Old lead messages — `old_lead_messages` (historical dump import; read-only)                                                          |
| `0041`        | Active lead messages — `lead_messages` (on-demand Chatwoot API sync + real-time webhook sync)                                        |
| `0042`–`0046` | Property inventory, hotel recommendation fields on `lead_details`                                                                    |
| `0047`        | `search_old_leads_ids` RPC (fuzzy search on old leads)                                                                               |
| `0048`–`0061` | Universities, deal_awaiting, SLA business hours, lead message notify cron, budget_tier, Chatwoot sync                                |
| `0062`–`0073` | Major Update — funnel consolidation (`lost`), visits, boolean flags, auto-tasks, 24h restriction, `claimed_at`, `lead_stage_history` |
| `0049`        | contact_history types — adds `call`, `message_start`, `chatwoot` source; updates `unarchive_single_lead`                             |

**Phase 4 post-migration checks:**

```sql
-- Tables exist
SELECT to_regclass('public.ref_sessions'),
       to_regclass('public.dni_numbers'),
       to_regclass('public.collected_data');

-- superadmin role constraint
SELECT conname FROM pg_constraint
WHERE conrelid = 'salespeople'::regclass AND conname LIKE '%role%';

-- Seed DNI rows (inactive until real numbers configured)
SELECT source, is_active, virtual_number FROM dni_numbers ORDER BY source;
```

Then run `pnpm gen:types` to refresh `types/database.ts`.

**Old leads post-migration checks (after `0038`–`0039`):**

```sql
-- Tables exist
SELECT to_regclass('public.old_leads'),
       to_regclass('public.old_lead_details');

-- RLS policies (manager/superadmin SELECT only)
SELECT tablename, policyname FROM pg_policies
WHERE tablename IN ('old_leads', 'old_lead_details');

-- Unique conversation index (idempotent import)
SELECT indexname FROM pg_indexes
WHERE tablename = 'old_leads' AND indexname = 'idx_old_leads_chatwoot_conv_unique';
```

**Message tables post-migration checks (after `0040`–`0041`):**

```sql
SELECT to_regclass('public.old_lead_messages'),
       to_regclass('public.lead_messages');

SELECT tablename, policyname FROM pg_policies
WHERE tablename IN ('old_lead_messages', 'lead_messages');
```

**Property inventory + hotel recommendation (after `0042`–`0046`):**

Migrations add property availability/rooms, `lead_details` recommendation inputs (`campus`, `room_category`, `district_preference`, `rec_hotel` jsonb), and consolidate gender onto `student_gender` (`0046` drops redundant `lead_details.gender`).

```sql
SELECT to_regclass('public.properties'),
       to_regclass('public.property_room_types'),
       to_regclass('public.property_rooms');

-- rec_hotel is jsonb on active lead_details
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'lead_details'
  AND column_name IN ('campus', 'room_category', 'district_preference', 'rec_hotel', 'student_gender');
```

Then run `pnpm gen:types`. Requires Wrangler secret / `.env.local`: `MAKE_WEBHOOK_URL` (Make.com scenario webhook for **Öneri Al**).

**Old leads fuzzy search (migration `0047`):**

```sql
SELECT proname FROM pg_proc WHERE proname = 'search_old_leads_ids';
```

Without `0047`, **Fuzzy search** on `/old-leads` returns 500 from `GET /api/old-leads`.

**One-time old leads import (local CLI, not cron):**

Requires migrations `0038`–`0039`, `.env.local` with Supabase service role + `CHATWOOT_BASE_URL`, and Chatwoot dump at `readable_database.sql` (or `--dump path`).

```bash
# Dry-run (default) — prints stats + sample rows, writes skipped rows to import-old-leads-skipped.json
pnpm import:old-leads

# Optional flags: --limit N, --sample N, --batch-size 500, --skip-file path
pnpm import:old-leads -- --limit 100

# Insert into Supabase (fails if old_leads already has rows)
pnpm import:old-leads:write
```

Import merges multiple Chatwoot conversations per phone or Instagram handle into one row (primary = most recently updated conversation). Skipped conversations (no phone/handle) are logged to `import-old-leads-skipped.json`. Re-import requires truncating both tables first (see Section 5).

**One-time old lead messages import (after leads import, migration `0040`):**

Requires `old_leads` populated, same dump file, and migrations `0038`–`0040`.

```bash
# Dry-run — expect ~79k messages mapped for ~8.5k leads
pnpm import:old-lead-messages

# Insert (fails if old_lead_messages already has rows)
pnpm import:old-lead-messages:write
```

Maps messages by `chatwoot_conversation_id` (primary + `import_meta.merged_conversation_ids`). Agent names on outbound bubbles come from Chatwoot `users` in the dump. Private agent notes are stored but hidden in UI.

**One-time old lead gender backfill (after messages import):**

Infers `old_lead_details.student_gender` from inbound message keywords (`lib/import/extract-gender.ts`). Only updates rows where `student_gender IS NULL` — safe to re-run.

```bash
# Dry-run — review sample matches before writing
pnpm backfill:old-lead-gender

# Optional cap for spot-check
pnpm backfill:old-lead-gender -- --limit 100

# Apply updates
pnpm backfill:old-lead-gender:write
```

Expect a **low fill rate** compared to university — many conversations never mention gender. Null after backfill means unknown, not an error.

Apply migration `0047` before using **Fuzzy search** on old leads (`search_old_leads_ids` RPC). Without it, fuzzy mode returns a 500 from the API.

**Active lead chat (`0041`) — no bulk import:**

Messages stream in real-time via `message_created` webhooks. They are also backfilled from the Chatwoot API when a user opens **Conversation** on `/leads` (see Section 10). Apply migration `0041` only; no CLI backfill required unless you add a custom script later.

**After migration, verify pg_cron jobs exist:**

```sql
SELECT jobname, schedule, command FROM cron.job ORDER BY jobname;
```

**Set cron HTTP config (once, or after secret rotation):**

```sql
INSERT INTO cron_settings (key, value) VALUES
  ('base_url', 'https://panel.marketinguni.app'),
  ('cron_secret', 'paste-your-CRON_SECRET-here')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
```

### Rollback app

```bash
git revert HEAD          # or checkout last known-good commit
pnpm run cf:deploy
```

Cloudflare keeps previous Worker versions in dashboard (Workers → univotel-crm → Deployments) — you can roll back there without git.

### Rollback database

Supabase does not auto-rollback migrations. Options:

1. Write a forward migration that reverses the change
2. Restore from Supabase point-in-time backup (Dashboard → Database → Backups) — **causes downtime**

### Downtime

Deploy replaces the Worker atomically — typically **seconds**, no maintenance window. Database migrations on large tables may lock briefly; run off-peak.

### Production branch

No enforced branch in repo. Convention: deploy from `main` after local test (`pnpm test && pnpm build`).

---

## 4. Webhooks

All webhooks **await processing** before returning HTTP 200 (Cloudflare isolate safety). Failed processing is logged to `webhook_logs` and may trigger Telegram `webhook_failure` alert.

**Middleware:** Session refresh middleware does **not** run on `/api/webhooks/*`, `/api/cron/*`, `/api/ref/*`, `/api/dni/*`, or `/api/health` (see `middleware.ts`). Webhooks use HMAC/static tokens only. This also avoids `self is not defined` errors when testing webhooks on local `pnpm dev`.

Base URL: `https://panel.marketinguni.app`

### Chatwoot

| Field         | Value                                                                                      |
| ------------- | ------------------------------------------------------------------------------------------ |
| URL           | `POST /api/webhooks/chatwoot`                                                              |
| Source        | Chatwoot → Settings → Integrations → Webhooks                                              |
| Subscriptions | `conversation_created`, `message_created`, `conversation_updated`                          |
| Auth          | HMAC-SHA256 header `X-Chatwoot-Signature` + `X-Chatwoot-Timestamp` (max age **5 minutes**) |
| Secret env    | `CHATWOOT_WEBHOOK_SECRET`                                                                  |

**Test (signed curl):**

```bash
SECRET='your-chatwoot-webhook-secret'
TS=$(date +%s)
BODY='{"event":"message_created","id":1,"channel":"Channel::Whatsapp","meta":{"sender":{"phone_number":"+905551234567","name":"Test"}},"message":{"id":2},"conversation":{"id":99}}'
SIG=$(printf '%s' "$TS.$BODY" | openssl dgst -sha256 -hmac "$SECRET" | awk '{print "sha256="$2}')

curl -X POST https://panel.marketinguni.app/api/webhooks/chatwoot \
  -H "Content-Type: application/json" \
  -H "X-Chatwoot-Timestamp: $TS" \
  -H "X-Chatwoot-Signature: $SIG" \
  -d "$BODY"
```

**On failure:** `/webhook-logs` UI or Supabase `webhook_logs` (`status=failed`). See **Webhook logs (UI)** below.

**Replay:** Manager/superadmin → `/webhook-logs` → **Replay** on `failed` rows only, or `POST /api/webhook-logs/{uuid}/replay` with manager/superadmin session.

**Lead creation rules:** Incoming messages only (skips `message_type=outgoing`). Duplicate phone → `duplicate_submission` in contact history, no new lead.

**Message sync & history:** Both incoming and outgoing messages are synced to `lead_messages` (`0041`) via webhook. A `message_start` entry is written to `contact_history` if it's a new conversation (≥4h gap since last chatwoot source interaction).

**Payload validation:** Zod schema accepts `null` on `sender`/`contact` fields (e.g. `identifier`, `name`) — common on outbound agent messages. Invalid payloads log to `webhook_logs` as failed and may Telegram-alert managers; they do **not** block live chat (Conversation tab uses Chatwoot API, not this webhook).

**Phase 4 attribution:** Chatwoot reads `additional_attributes.referral` (`ref_code`, `ad_id`, `campaign_id`, etc.). On create, CRM looks up `ref_sessions` by `ref_code` for UTM/referral_domain, writes `collected_data` + updates `source_details`, and queues GA4 enrichment when `ref_code` is present. Requires Meta **`referral` webhook field** subscribed in Meta Developer Console for REF to arrive in payload.

---

### WhatsApp (Meta) — calls + statuses

| Field      | Value                                                                                                               |
| ---------- | ------------------------------------------------------------------------------------------------------------------- |
| URL        | `GET` + `POST /api/webhooks/whatsapp-calls`                                                                         |
| Source     | Meta App Dashboard → Webhooks                                                                                       |
| GET verify | Query params `hub.mode=subscribe`, `hub.verify_token`, `hub.challenge` — token must match `WHATSAPP_WEBHOOK_SECRET` |
| POST auth  | Header `x-hub-signature-256` HMAC over raw body                                                                     |
| Secret env | `WHATSAPP_WEBHOOK_SECRET`                                                                                           |
| API env    | `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_API_TOKEN`                                                                    |

**On failure:** `/webhook-logs`, source `whatsapp_calls`.

**Replay:** Same as Chatwoot via `/webhook-logs`.

---

### NetGSM

| Field          | Value                                                                                                     |
| -------------- | --------------------------------------------------------------------------------------------------------- |
| URL            | `POST /api/webhooks/netgsm`                                                                               |
| Source         | NetGSM santral dinleme / **CDR** HTTP POST (not the IVR “CRM Call Integration” function screen alone)     |
| Auth           | JSON body field `token` must match `NETGSM_STATIC_TOKEN` (Wrangler in prod; `.env.local` for local dev)   |
| Payload fields | `arayan`, `aranan`, `sure`, `kimlik` (aliases supported — see `lib/webhooks/normalize-netgsm-payload.ts`) |

**CDR matching (Company Line):** If `scenario: "cdr"` and the call involves `COMPANY_PHONE_NUMBER` (+90 212 909 52 44), the CRM searches for an existing lead by phone (including archived leads).

- If found: Unarchives the lead (if archived) and writes a `call` entry to `contact_history` (e.g., "15/05/2026 14.30'de aradı — 2 dk 5 sn"). Does **not** create a new lead.
- If not found or not company line: Falls through to normal lead creation.

**Lead creation rules:** CRM creates a lead when (and not matched by CDR above):

- `scenario: "cdr"` (typical CDR payload), **or**
- Inbound/hangup-style event with `customer_num` or `arayan`, plus `unique_id` / `kimlik`, plus duration (`sure` / `talktime`)

Events such as `Queue` / ring-only without caller id are logged as **`skipped`** (no lead). Wrong token → **401** and **no** `webhook_logs` row.

**Phase 4 attribution:** `aranan` (called virtual number) is matched against `dni_numbers.virtual_number`; `lead_count` and `last_lead_at` increment on the matching row. `collected_data.source_confidence = inferred`, `path_lost_at = lost_at_source` (no browser session).

**Prod smoke test (curl):**

```bash
TOKEN=$(grep '^NETGSM_STATIC_TOKEN=' .env.local | cut -d= -f2-)

curl -i -X POST https://panel.marketinguni.app/api/webhooks/netgsm \
  -H "Content-Type: application/json" \
  -d "{
    \"scenario\": \"cdr\",
    \"kimlik\": \"smoke-$(date +%s)\",
    \"arayan\": \"05321234567\",
    \"aranan\": \"850300000000\",
    \"sure\": 30,
    \"token\": \"$TOKEN\"
  }"
```

Expect **HTTP 200** and a new `webhook_logs` row with `source=netgsm`, `status=success`. If curl works but a **live phone call** produces no new log row, NetGSM is not firing HTTP POST on that call path (fix santral dinleme / CDR event binding in NetGSM — not CRM code).

**On failure:** `/webhook-logs` or SQL (`source=netgsm`). Check `failed` vs `skipped` vs no row at all.

**Replay:** Same replay flow (failed rows only).

---

### Telegram (bot commands)

| Field            | Value                                                                                               |
| ---------------- | --------------------------------------------------------------------------------------------------- |
| URL              | `POST /api/webhooks/telegram`                                                                       |
| Commands         | `/start`, `/link email@univotel.com` (links salesperson Telegram to CRM profile)                    |
| Auth             | Header `X-Telegram-Bot-Api-Secret-Token` if `TELEGRAM_WEBHOOK_SECRET` is set; otherwise accepts all |
| Register webhook | `pnpm telegram:setup-webhook`                                                                       |

**On failure:** Check Wrangler logs; bot commands stop but CRM core unaffected.

---

### Webhook log statuses

`received` → `processing` → `success` | `failed` | `skipped`

Idempotency keys prevent duplicate processing (e.g. `chatwoot_{conversationId}_{messageId}`).

### Webhook logs (UI)

| Field  | Value                                                                  |
| ------ | ---------------------------------------------------------------------- |
| Route  | `/webhook-logs` (sidebar: **Webhook Logs** — manager + **superadmin**) |
| API    | `GET /api/webhook-logs?limit=50` (all statuses; not failed-only)       |
| Replay | `POST /api/webhook-logs/{id}/replay` — **failed** rows only            |
| SQL    | Full audit when UI is empty but DB has rows (see Section 5)            |

Salespeople are redirected to `/leads`. Pre-2026-05-26 deploy only listed `status=failed`, so successful NetGSM `cdr` tests looked like “no logs”.

---

### Public attribution endpoints (GTM / marketing sites)

Called from browser JavaScript on **univotel.com** and side domains. No auth. CORS enforced — unlisted origins get **403** (GTM fails silently; no REF generated).

| Field                | Value                                                                                                                                                           |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| REF generate         | `GET /api/ref/generate?utm_source=...&utm_medium=...&utm_campaign=...&utm_content=...&landing_page=...&referral_domain=...`                                     |
| REF response         | `{ "ref": "UV-XXXX" }` — stored in browser `sessionStorage` as `uv_ref` by GTM                                                                                  |
| DNI list             | `GET /api/dni/numbers`                                                                                                                                          |
| DNI response         | `[{ "source": "google-ads", "virtual_number": "+90850..." }, ...]` — active rows only                                                                           |
| DNI cache            | `Cache-Control: public, max-age=3600` (1 hour)                                                                                                                  |
| CORS allowed origins | `https://univotel.com`, `https://www.univotel.com`, `https://ituyurt.com`, `https://galatasarayyurt.com`, `https://kampushan.com`, `https://academic-house.com` |

**REF → UTM flow:**

1. GTM calls `/api/ref/generate` on page load → row inserted in `ref_sessions` ( **no expiry** — rows kept indefinitely)
2. Visitor clicks WhatsApp → Meta/Chatwoot webhook includes `ref_code`
3. CRM merges `ref_sessions` UTM into `collected_data` at lead creation
4. GA4 enrichment runs asynchronously (Section 7, Section 8)

**New side domain checklist:** Add origin to `lib/cors/allowed-origins.ts` → deploy CRM → then publish GTM on that domain.

**Test REF (from allowed origin in browser console on univotel.com):**

```javascript
fetch('https://panel.marketinguni.app/api/ref/generate?utm_source=test&utm_medium=cpc')
  .then((r) => r.json())
  .then(console.log);
```

**Verify ref_sessions row:**

```sql
SELECT ref_code, utm_source, utm_medium, referral_domain, created_at
FROM ref_sessions
ORDER BY created_at DESC
LIMIT 5;
```

---

## 5. Common Problems & Fixes

### Lead not created; webhook_logs shows `success`

**Cause:** Phone deduplication — same `lead_phone` or `parent_phone` already exists as active lead.

**Check:**

```sql
SELECT uuid, lead_name, lead_phone, parent_phone, funnel_status, is_archived
FROM leads
WHERE lead_phone = '05321234567' OR parent_phone = '05321234567';
```

**Fix:** If same person, expected — check `contact_history` for `duplicate_submission`. If different person, phone normalization issue — compare stored format (`05xxxxxxxxx`) vs incoming.

---

### Lead not created; webhook_logs shows `failed`

**Check:**

```sql
SELECT id, source, status, error_message, payload, created_at
FROM webhook_logs
WHERE status = 'failed'
ORDER BY created_at DESC
LIMIT 10;
```

**Fix:** Manager/superadmin → Replay from `/webhook-logs`. If signature errors, verify webhook secret in Wrangler matches provider dashboard.

---

### SLA alerts not arriving in Telegram

**Cause:** pg_cron not firing, `CRON_SECRET` mismatch, or invalid bot token.

**Check cron run history:**

```sql
SELECT jobname, status, start_time, end_time, return_message
FROM cron.job_run_details
ORDER BY start_time DESC
LIMIT 20;
```

**Check breached leads exist:**

```sql
SELECT uuid, lead_phone, lead_name, sla_status, sla_deadline, funnel_status
FROM leads
WHERE sla_status = 'breached'
  AND is_deleted = false
  AND is_archived = false
  AND funnel_status NOT IN ('sozlesme-imzalandi', 'lost');
```

**Check Telegram bot:**

```bash
curl "https://api.telegram.org/bot<TOKEN>/getMe"
```

**Fix:** Align `CRON_SECRET` in Wrangler, `.env.local`, and `cron_settings`. Re-insert `cron_settings` if needed (Section 3). Refresh bot token via BotFather if `getMe` fails.

---

### SLA status stuck at `on_time` but deadline passed

**Cause:** `sla_update` pg_cron not running, or lead has `last_contact_at` set (resets to `on_time`), or lead is terminal/archived.

**Check:** Cron job `sla_update` in `cron.job_run_details`. SLA cron runs every **5 minutes**.

**Note:** Any contact (including manual note) sets `last_contact_at` → SLA shows `on_time` until next breach logic cycle without contact.

---

### Task overdue alerts missing

**Cause:** Salesperson has no `telegram_chat_id` (never ran `/link`), or throttle window active.

**Check:**

```sql
SELECT t.id, t.task_type, t.due_when, t.is_late, sp.full_name, sp.telegram_chat_id
FROM tasks t
JOIN salespeople sp ON sp.id = t.assigned_to
WHERE t.is_completed = false AND t.is_late = true
ORDER BY t.due_when ASC
LIMIT 20;
```

**Fix:** Salesperson sends `/link their@email.com` to the bot. Manager escalation fires when task is **60+ minutes** overdue.

---

### Lead visible in active list but should be archived

**Cause:** Not yet 80 days in terminal status, or nightly job backlog (100/batch).

**Check eligibility:**

```sql
SELECT uuid, lead_name, funnel_status,
       COALESCE(last_contact_at, updated_at) AS archive_clock,
       NOW() - COALESCE(last_contact_at, updated_at) AS age
FROM leads
WHERE is_deleted = false
  AND is_archived = false
  AND funnel_status = 'lost'
ORDER BY archive_clock ASC
LIMIT 20;
```

Eligible when `age > interval '80 days'`. Manual archive: manager → lead detail → **Archive lead**.

---

### active_lead_count wrong on salesperson

**Cause:** Counter drift after failed archive/reassign.

**Manual reconcile:**

```sql
UPDATE salespeople s
SET active_lead_count = sub.cnt
FROM (
  SELECT assigned_to AS id, COUNT(*) AS cnt
  FROM leads
  WHERE is_deleted = false
    AND is_archived = false
    AND assigned_to IS NOT NULL
  GROUP BY assigned_to
) sub
WHERE s.id = sub.id;

UPDATE salespeople s
SET active_lead_count = 0
WHERE NOT EXISTS (
  SELECT 1 FROM leads l
  WHERE l.assigned_to = s.id
    AND l.is_deleted = false
    AND l.is_archived = false
);
```

Nightly job `active_lead_count_reconcile` runs at **03:15 UTC** automatically.

---

### Chatwoot assignee/labels not syncing

**Check env (Wrangler secrets):** `CHATWOOT_SYNC_ENABLED`, `CHATWOOT_ASSIGNEE_SYNC_ENABLED`, `CHATWOOT_LABEL_SYNC_ENABLED`, `CHATWOOT_API_TOKEN`, `CHATWOOT_ACCOUNT_ID`.

**Check sync log:**

```sql
SELECT * FROM chatwoot_sync_log
ORDER BY created_at DESC
LIMIT 20;
```

**Fix agent mapping:** `pnpm exec tsx scripts/sync-chatwoot-agents.ts` (maps Chatwoot agents to `salespeople` by email/name).

**Echo guard:** CRM ignores inbound webhooks within **10 seconds** (`CHATWOOT_SYNC_ECHO_WINDOW_MS`, default 10000ms) after CRM-originated writes to prevent loops.

---

### Campaign paused unexpectedly

**Cause:** Daily WhatsApp send quota hit — pause at **950 messages/day** per campaign.

**Check:**

```sql
SELECT id, status, daily_send_count, paused_at FROM campaigns ORDER BY updated_at DESC;
```

**Fix:** Resets at **00:00 UTC** via `campaign_daily_reset` cron. Or resume manually from `/campaigns` UI.

---

### NetGSM curl works but live call creates no lead / no log

**Cause:** CRM endpoint and token are fine; NetGSM does not POST on real calls (CDR/santral dinleme not bound to that number’s call path, or only Queue/ring events without `cdr` + `arayan` + `kimlik`).

**Check:**

```sql
SELECT status, event_type, payload->>'scenario' AS scenario, created_at
FROM webhook_logs
WHERE source = 'netgsm'
  AND created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC;
```

**Fix:** In NetGSM, enable **call-end / CDR** HTTP notification to `https://panel.marketinguni.app/api/webhooks/netgsm` with `token` in JSON. “CRM Call Integration” IVR function settings alone do not replace CDR webhook. Ask NetGSM support which menu fires POST after hangup. Compare payload to Section 4 NetGSM smoke curl.

---

### Webhook logs UI empty but SQL has rows

**Cause:** Old UI filtered `?status=failed` only; successful NetGSM/Chatwoot tests show as `success` in DB.

**Check:**

```sql
SELECT status, source, COUNT(*) FROM webhook_logs
GROUP BY status, source ORDER BY source, status;
```

**Fix:** Deploy latest app (lists last 50 logs of any status). Or query SQL directly.

---

### Local `pnpm dev` — webhook returns 500 HTML (`self is not defined`)

**Cause:** Next.js middleware ran on webhook routes in dev; webpack chunk expects browser `self`.

**Fix:** Use latest `middleware.ts` (webhook paths excluded). `rm -rf .next`, restart `pnpm dev`. Test: `curl -X POST http://localhost:3000/api/webhooks/netgsm ...` should return **200** or **401**, not HTML error page.

---

### `/webhook-logs` redirects to `/leads`

**Cause:** Logged in as `salesperson`, or pre-fix build where only `role=manager` was allowed (superadmin redirected).

**Fix:** Log in as **manager** or **superadmin**. Deploy commit with `isManagerOrAbove` for webhook logs.

---

### Duplicate leads from WhatsApp messages (historical note)

**Current code:** Message leads are created from **Chatwoot** webhooks only. Meta `/api/webhooks/whatsapp-calls` handles **`calls`** and campaign **`statuses`** — not chat messages. Duplicate message leads from “Meta + Chatwoot” are **not** expected with the current processor unless a second integration duplicates Chatwoot traffic.

---

### REF not generated on univotel.com (CORS or GTM)

**Cause:** Origin not in allow list, GTM tag missing/blocked, ad blocker, or CRM down.

**Check:** Browser DevTools → Network → `/api/ref/generate` (403 = CORS; no request = GTM/ad blocker).

**Fix:** Confirm origin in `lib/cors/allowed-origins.ts` and redeploy. Verify GTM container published. Accept that ad-blocked visitors get no REF (expected lossy behavior).

---

### WhatsApp lead missing UTM / `source_confidence` not `full`

**Cause:** Meta `referral` field not subscribed, REF not in webhook payload, or REF never generated on site.

**Check:**

```sql
SELECT cd.ref_code, cd.utm_source, cd.utm_medium, cd.source_confidence, cd.path_lost_at,
       cd.ga4_enriched, cd.ga4_fetch_attempts
FROM collected_data cd
JOIN leads l ON l.uuid = cd.lead_uuid
WHERE l.created_at > NOW() - INTERVAL '24 hours'
ORDER BY l.created_at DESC
LIMIT 10;
```

Cross-check `ref_sessions` for the REF:

```sql
SELECT * FROM ref_sessions WHERE ref_code = 'UV-XXXX';
```

**Fix:** Subscribe Meta `referral` webhook field. Confirm GTM REF tag fires. If `ref_code` present but UTM null, REF may not exist in `ref_sessions` (wrong code or never generated).

---

### GA4 enrichment stuck (`ga4_enriched = false`)

**Cause:** GA4 credentials missing/wrong, custom dimension `ref_code` not configured, GA4 delayed writing events, or cron not running.

**Check pending rows:**

```sql
SELECT lead_uuid, ref_code, ga4_fetch_attempts, ga4_enriched, created_at
FROM collected_data
WHERE ga4_enriched = false AND ref_code IS NOT NULL
ORDER BY created_at DESC
LIMIT 20;
```

**Check:** Wrangler secrets `GOOGLE_SERVICE_ACCOUNT_JSON`, `GA4_PROPERTY_ID`. Service account must be **Viewer** on GA4 property. Cron job `ga4-enrichment` in `cron.job_run_details`.

**Expected after 4 failed attempts:** `ga4_fetch_attempts = 4`, `ga4_enriched = false`, `path_lost_at = lost_at_session`, `source_confidence = inferred` — **not** a Telegram alert (acceptable loss).

**Fix:** Align GA4 setup; replay is automatic via cron every 5 min until success or give-up.

---

### DNI wrong number on site or `lead_count` not incrementing

**Cause:** Inactive DNI row, browser cache (1 h), phone format mismatch, or call to non-virtual number.

**Check:**

```sql
SELECT source, virtual_number, is_active, lead_count, last_lead_at
FROM dni_numbers
ORDER BY source;
```

**Fix:** Superadmin → `/admin/dni-numbers` → activate correct number. After deactivation, expect up to **1 hour** before all browsers see change (cache). NetGSM CDR `aranan` must match stored `virtual_number` (normalization handles `0850` vs `+90850`).

---

### `collected_data` row missing for new lead

**Cause:** Lead created before Phase 4 deploy, duplicate phone path (no second insert), or lead creation failed after `leads` insert.

**Check:**

```sql
SELECT l.uuid, l.created_at, l.lead_source,
       EXISTS (SELECT 1 FROM collected_data cd WHERE cd.lead_uuid = l.uuid) AS has_collected_data
FROM leads l
WHERE l.created_at > NOW() - INTERVAL '7 days'
ORDER BY l.created_at DESC
LIMIT 20;
```

**Note:** Pre-Phase 4 leads intentionally have **no** `collected_data` — only `source_details` JSONB. No backfill.

---

### Chatwoot webhook validation failed (Telegram alert)

**Cause:** Webhook JSON did not match `ChatwootPayloadSchema` (historically `sender.identifier: null` on outbound messages). Processing stops for that event; lead creation from that webhook is skipped.

**Check:**

```sql
SELECT id, event_type, status, error_message, created_at
FROM webhook_logs
WHERE source = 'chatwoot' AND status = 'failed'
ORDER BY created_at DESC
LIMIT 10;
```

**Fix:** Deploy latest app (schema accepts nullable sender fields). Replay from `/webhook-logs` if the underlying event still matters. **Note:** Outgoing `message_created` webhooks are intentionally not used for lead creation; Conversation UI uses Chatwoot API sync instead.

---

### Active lead Conversation tab empty or "Failed to sync messages"

**Cause:** Migration `0041` not applied, missing Chatwoot API secrets, or lead has no `chatwoot_conversation_id`.

**Check:**

```sql
SELECT uuid, lead_name, chatwoot_conversation_id, source_details->>'chatwoot_url' AS url
FROM leads
WHERE uuid = '<lead-uuid>';

SELECT COUNT(*) FROM lead_messages WHERE lead_uuid = '<lead-uuid>';

SELECT to_regclass('public.lead_messages');
```

**Check env:** `CHATWOOT_API_TOKEN`, `CHATWOOT_ACCOUNT_ID` in Wrangler (and `.env.local` for dev).

**Fix:** Apply `0041`, ensure API token can read conversations in Chatwoot, open **Conversation** tab (triggers `POST /api/leads/{id}/messages/sync`). Link conversation via webhook or set `chatwoot_conversation_id` on the lead row.

---

### Old leads page empty or `/old-leads` returns 403

**Cause:** User is `salesperson` (manager/superadmin only), migrations `0038`–`0039` not applied, or import not run.

**Check:**

```sql
SELECT COUNT(*) AS old_lead_count FROM old_leads;
SELECT COUNT(*) AS detail_count FROM old_lead_details;
```

**Fix:** Apply migrations `0038`–`0039`, run `pnpm import:old-leads:write` (Section 3). Log in as manager or superadmin.

---

### Old leads import fails: "old_leads already has N rows"

**Cause:** Import script refuses to run when table is non-empty (one-time bulk load).

**Check:**

```sql
SELECT COUNT(*) FROM old_leads;
```

**Fix:** To re-import from scratch (destructive):

```sql
TRUNCATE old_lead_details;
TRUNCATE old_leads;
```

Then re-run `pnpm import:old-leads:write`. Always dry-run first with `pnpm import:old-leads`.

---

### Old leads import skipped many conversations

**Cause:** Contact had no normalizable phone and no Instagram handle in dump.

**Check:** Review `import-old-leads-skipped.json` (default path in repo root; gitignored if configured).

**Fix:** Expected for incomplete Chatwoot contacts. No CRM action unless dump export is stale — re-export `readable_database.sql` from Chatwoot Postgres.

---

## 6. Database — Reference Queries

### Active lead count

```sql
SELECT COUNT(*) FROM leads
WHERE is_deleted = false AND is_archived = false;
```

### Leads created in last 24 hours

```sql
SELECT uuid, lead_name, lead_phone, lead_source, funnel_status, created_at
FROM leads
WHERE created_at > NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC;
```

### SLA breaches (active pipeline)

```sql
SELECT uuid, lead_phone, lead_name, lead_source, sla_deadline, sla_status, assigned_to
FROM leads
WHERE sla_status = 'breached'
  AND is_deleted = false
  AND is_archived = false
ORDER BY sla_deadline ASC;
```

### Archived leads count

```sql
SELECT archive_reason, COUNT(*) FROM archived_leads GROUP BY archive_reason;
```

### Archive consistency check (should return 0 rows each)

```sql
-- Flag set but no snapshot
SELECT uuid FROM leads
WHERE is_archived = true
  AND NOT EXISTS (SELECT 1 FROM archived_leads al WHERE al.uuid = leads.uuid);

-- Snapshot exists but flag not set
SELECT al.uuid FROM archived_leads al
JOIN leads l ON l.uuid = al.uuid
WHERE l.is_archived = false;
```

### Failed webhooks

```sql
SELECT id, source, status, error_message, retry_count, created_at
FROM webhook_logs
WHERE status = 'failed'
ORDER BY created_at DESC
LIMIT 20;
```

### Unassigned active leads

```sql
SELECT uuid, lead_name, lead_phone, lead_source, created_at
FROM leads
WHERE assigned_to IS NULL
  AND is_deleted = false
  AND is_archived = false
ORDER BY created_at DESC;
```

### Notifications (recent manager alerts)

```sql
SELECT alert_type, message, is_resolved, created_at
FROM notifications
ORDER BY created_at DESC
LIMIT 20;
```

### Attribution summary (Phase 4)

```sql
SELECT channel, source_confidence, path_lost_at,
       COUNT(*) AS lead_count,
       SUM(CASE WHEN ga4_enriched THEN 1 ELSE 0 END) AS ga4_enriched_count
FROM collected_data
GROUP BY channel, source_confidence, path_lost_at
ORDER BY channel, source_confidence;
```

### collected_data for a lead

```sql
SELECT cd.*, l.lead_phone, l.lead_source, l.created_at
FROM collected_data cd
JOIN leads l ON l.uuid = cd.lead_uuid
WHERE cd.lead_uuid = '<lead_uuid>';
```

### Compare source_details vs collected_data (parity check)

```sql
SELECT l.uuid,
       l.source_details->>'ref_code' AS sd_ref,
       cd.ref_code AS cd_ref,
       l.source_details->>'utm_source' AS sd_utm,
       cd.utm_source AS cd_utm,
       l.source_details->>'source_confidence' AS sd_confidence,
       cd.source_confidence AS cd_confidence
FROM leads l
JOIN collected_data cd ON cd.lead_uuid = l.uuid
WHERE l.created_at > NOW() - INTERVAL '7 days'
ORDER BY l.created_at DESC
LIMIT 20;
```

### Pending GA4 enrichment

```sql
SELECT lead_uuid, ref_code, ga4_fetch_attempts, created_at
FROM collected_data
WHERE ga4_enriched = false AND ref_code IS NOT NULL AND ga4_fetch_attempts < 4
ORDER BY created_at ASC;
```

### Old leads count

```sql
SELECT COUNT(*) FROM old_leads;
```

### Old leads by channel

```sql
SELECT lead_source, message_from, COUNT(*) AS cnt
FROM old_leads
GROUP BY lead_source, message_from
ORDER BY cnt DESC;
```

### Old leads with merged conversations (import_meta)

```sql
SELECT uuid, lead_name, lead_phone, chatwoot_conversation_id,
       source_details->'import_meta'->>'merged_count' AS merged_count
FROM old_leads
WHERE (source_details->'import_meta'->>'merged_count')::int > 0
ORDER BY created_at DESC
LIMIT 20;
```

### Search old lead by phone or handle

```sql
SELECT uuid, lead_name, lead_phone, lead_source, funnel_status, created_at
FROM old_leads
WHERE lead_phone ILIKE '%0532%' OR lead_name ILIKE '%test%'
ORDER BY created_at DESC
LIMIT 20;
```

### Old lead message count

```sql
SELECT COUNT(*) FROM old_lead_messages;

SELECT lead_uuid, COUNT(*) AS msg_count
FROM old_lead_messages
GROUP BY lead_uuid
ORDER BY msg_count DESC
LIMIT 10;
```

### Active lead message count (live cache)

```sql
SELECT COUNT(*) FROM lead_messages;

SELECT lead_uuid, COUNT(*) AS msg_count
FROM lead_messages
GROUP BY lead_uuid
ORDER BY msg_count DESC
LIMIT 10;
```

---

## 7. Cron Jobs

All times **UTC**. Turkey (TRT) = UTC+3 → 03:00 UTC = 06:00 TRT.

| Job name                      | Schedule (UTC) | Type                                   | What it does                                                             |
| ----------------------------- | -------------- | -------------------------------------- | ------------------------------------------------------------------------ |
| `sla_update`                  | `*/5 * * * *`  | SQL                                    | Updates `leads.sla_status` (`on_time` / `breached`; business hours only) |
| `task_overdue_check`          | `*/5 * * * *`  | SQL                                    | Sets `tasks.is_late = true` where overdue                                |
| `mv_refresh`                  | `*/5 * * * *`  | SQL                                    | Refreshes 4 materialized views (analytics Overview tab)                  |
| `sla-alerts`                  | `*/5 * * * *`  | HTTP → `/api/cron/sla-alerts`          | Telegram SLA breach alerts to managers                                   |
| `task-overdue`                | `*/5 * * * *`  | HTTP → `/api/cron/task-overdue`        | Telegram task alerts to salespeople + manager escalation                 |
| `campaign-resume`             | `*/5 * * * *`  | HTTP → `/api/cron/campaign-resume`     | Resumes paused campaigns under daily quota                               |
| `ga4-enrichment`              | `*/5 * * * *`  | HTTP → `/api/cron/ga4-enrichment`      | GA4 Data API retries for `collected_data` (attempts 2–4)                 |
| `lead-message-notify`         | `* * * * *`    | HTTP → `/api/cron/lead-message-notify` | Telegram inbound message alerts to salespeople                           |
| `restriction-24h`             | `*/15 * * * *` | HTTP → `/api/cron/restriction-24h`     | Sets `is_24h_restricted` when last inbound message > 24h old             |
| `campaign_daily_reset`        | `0 0 * * *`    | SQL                                    | Resets `daily_send_count`, unpauses campaigns at midnight UTC            |
| `nightly-archive`             | `0 3 * * *`    | SQL                                    | Archives up to **100** eligible terminal leads                           |
| `active_lead_count_reconcile` | `15 3 * * *`   | SQL                                    | Recounts `salespeople.active_lead_count`                                 |

**Check last runs:**

```sql
SELECT jobname, status, start_time, end_time, return_message
FROM cron.job_run_details
ORDER BY start_time DESC
LIMIT 30;
```

**List scheduled jobs:**

```sql
SELECT jobid, jobname, schedule, command FROM cron.job ORDER BY jobname;
```

---

## 8. Business Rules & Timings (Quick Reference)

### SLA deadlines (minutes from lead `created_at`)

Set at lead creation in `lib/leads/sla.ts`. Status updated by pg_cron every 5 min.

| Lead source     | Deadline (min)                 | At-risk offset in code (min)\* |
| --------------- | ------------------------------ | ------------------------------ |
| `netgsm_call`   | **5**                          | 2                              |
| `whatsapp_call` | **5**                          | 2                              |
| `whatsapp`      | **30**                         | 5                              |
| `instagram`     | **30**                         | 5                              |
| `form`          | **60**                         | 15                             |
| `manual`        | **480** (8 h)                  | 30                             |
| Unknown source  | **480** (falls back to manual) | 30                             |

\* **At-risk in production SQL uses fixed 5 minutes before deadline**, not the per-source offset in TypeScript. Condition: `sla_deadline < NOW() + INTERVAL '5 minutes'`.

**Peak season override:** `PEAK_SEASON_ACTIVE = false` in `lib/constants.ts`. When set to `true`, all sources get **30 min** deadline before deploy.

**SLA excluded for:** deleted leads, archived leads, `deal_awaiting`, terminal funnel statuses (`sozlesme-imzalandi`, `lost`).

**SLA reset:** If `last_contact_at IS NOT NULL`, cron sets `sla_status = on_time` regardless of deadline.

### SLA breach alerts

| Setting   | Value                                                                |
| --------- | -------------------------------------------------------------------- |
| Trigger   | pg_cron `sla-alerts` every **5 min**                                 |
| Condition | `sla_status = 'breached'`, active, non-terminal                      |
| Throttle  | **10 minutes** per lead (`NOTIFICATION_THROTTLE_MINUTES.sla_breach`) |
| Channel   | Telegram → `TELEGRAM_MANAGER_CHAT_IDS`                               |

### Task overdue alerts

| Setting                    | Value                                                           |
| -------------------------- | --------------------------------------------------------------- |
| Mark late                  | When `due_when < NOW()` (SQL cron + HTTP job, both every 5 min) |
| Salesperson alert throttle | **30 minutes** per task                                         |
| Manager escalation         | Task **60+ minutes** past `due_when`                            |
| Requires                   | Salesperson `telegram_chat_id` (via `/link email`)              |

### Other alert throttles

| Alert type        | Throttle                                    |
| ----------------- | ------------------------------------------- |
| `unassigned_lead` | 5 min (on lead create, no assignee in pool) |
| `webhook_failure` | 5 min                                       |
| `campaign_paused` | 5 min                                       |
| `campaign_failed` | 5 min                                       |

### Lead assignment algorithm

Runs on every new lead (`lib/leads/assign.ts`):

1. Pool: active salespeople (`is_active=true`, `role=salesperson'`)
2. Filter: `active_lead_count < max_active_leads` (default **40** in seed) AND within Istanbul shift window (`shift_start`–`shift_end`, supports overnight shifts)
3. Optional narrow by lead `language` (if any agent matches)
4. Optional narrow by preferred hotel in `assigned_hotels` (if any agent matches)
5. Pick lowest `active_lead_count`, then lowest lifetime `lead_count`
6. Random tie-break among tied agents
7. If pool empty → `assigned_to = NULL` + manager `unassigned_lead` Telegram alert

Shift timezone: **Europe/Istanbul**.

### Phone deduplication

- Normalizes to Turkish `05xxxxxxxxx`
- Matches `lead_phone` OR `parent_phone` on active leads (`is_deleted=false`, `is_archived=false`)
- Duplicate → no new lead; `contact_history` entry `duplicate_submission`

### Terminal funnel statuses

`sozlesme-imzalandi` (won), `lost` (consolidated lost/nurture — migration 0062 remapped legacy `ilgilenmiyor` / `ziyaret-ama-almayacak`)

Excluded from: SLA updates. `active_lead_count` reconcile counts all non-archived assigned leads (no funnel exclusion as of 0062).

### Auto-archive (Phase 3)

| Setting          | Value                                                                                   |
| ---------------- | --------------------------------------------------------------------------------------- |
| Schedule         | Daily **03:00 UTC** (`nightly-archive`)                                                 |
| Wait time        | **80 days** in terminal status (`lost` only for nightly auto-archive since 0062)        |
| Clock starts     | `COALESCE(last_contact_at, updated_at)`                                                 |
| Batch size       | **100 leads/night** (oldest first; backlog clears over multiple nights)                 |
| Won mapping      | Manual archive only for `sozlesme-imzalandi` → `archive_reason = won` (no nightly auto) |
| Lost mapping     | `lost` → `archive_reason = lost` (nightly cron)                                         |
| Auto loss_reason | Uses existing `leads.loss_reason`, else **`sure-asildi`**                               |
| Manual archive   | Manager anytime via lead detail → no wait required                                      |
| Unarchive        | Manager via `/leads/archived/{uuid}` → restores to active lists                         |

### Campaign limits

| Setting               | Value                                                      |
| --------------------- | ---------------------------------------------------------- |
| Batch size            | 50 leads per worker pass                                   |
| Daily pause threshold | **950** WhatsApp sends                                     |
| Send retry backoff    | 1s, 5s, 30s                                                |
| Orphan recovery       | Rows stuck in `sending` > **2 minutes** reset to `pending` |
| Daily reset           | **00:00 UTC**                                              |

### Pagination

Default list page size: **50**. Max: **100**.

### Webhook internal retries

`RETRY_DELAYS_MS = [0, 5000, 15000]` — used in webhook processing retry logic.

### Attribution (Phase 4)

**Tables:**

| Table            | Purpose                                                       |
| ---------------- | ------------------------------------------------------------- |
| `ref_sessions`   | REF → UTM mapping from GTM; **no expiry**, no cleanup cron    |
| `dni_numbers`    | Virtual NetGSM numbers per traffic source; superadmin-managed |
| `collected_data` | One row per lead (Phase 4+); mirrors `source_details` columns |

**Write rules:**

- New leads: insert `leads` + `collected_data` + sync `source_details` JSONB (same keys/values)
- Pre-Phase 4 leads: `source_details` only — **no backfill** to `collected_data`
- `ref_sessions` rows are **never deleted** after webhook lookup (supports GA4 retries and replay)

**Attribution paths:**

| Path                           | channel                  | Typical `source_confidence` | Typical `path_lost_at` |
| ------------------------------ | ------------------------ | --------------------------- | ---------------------- |
| Site → WhatsApp (REF + GA4 OK) | `whatsapp`               | `full`                      | `full`                 |
| Meta Click-to-WhatsApp ad      | `whatsapp`               | `full`                      | `full`                 |
| NetGSM call via DNI number     | `netgsm_call`            | `inferred`                  | `lost_at_source`       |
| IG organic DM (no referral)    | `instagram` / `whatsapp` | `lossy`                     | `lost_at_channel`      |
| No source signal               | any                      | `unknown`                   | `unknown`              |

**GA4 enrichment:**

| Setting          | Value                                                                                                              |
| ---------------- | ------------------------------------------------------------------------------------------------------------------ |
| Max attempts     | **4**                                                                                                              |
| Attempt 1–2      | Immediately after lead create (`waitUntil` in webhook worker)                                                      |
| Attempts 3–4     | pg_cron `ga4-enrichment` every **5 min** (delays: 5 min, then 10 min after prior attempt)                          |
| GA4 query        | Event `ref_generated` + custom dimension `ref_code`                                                                |
| Give-up state    | `ga4_enriched = false`, `ga4_fetch_attempts = 4`, `path_lost_at = lost_at_session`, `source_confidence = inferred` |
| Alert on give-up | **None** (expected loss, not an error)                                                                             |

**DNI:**

| Setting          | Value                                                                  |
| ---------------- | ---------------------------------------------------------------------- |
| Public API cache | **1 hour** (`/api/dni/numbers`)                                        |
| Deactivate lag   | Up to 1 h before browsers stop showing old number                      |
| `lead_count`     | Incremented on NetGSM lead create when `aranan` matches active DNI row |
| Admin UI         | `/admin/dni-numbers` (superadmin only) — deactivate, never delete      |

**External setup (not in CRM code):**

| Platform                                      | Required for                                   |
| --------------------------------------------- | ---------------------------------------------- |
| GTM on univotel.com + side domains            | REF, DNI swap, GA4 events, cross-domain linker |
| GA4 custom dimension `ref_code` (event scope) | GA4 enrichment lookup                          |
| GA4 cross-domain + unwanted referral config   | Session continuity from side domains           |
| Meta `referral` webhook field                 | REF/ad fields on WhatsApp message webhooks     |
| NetGSM virtual numbers (one per source)       | DNI call attribution                           |

Integration test checklist: `docs/phase_4_tests.md`.

### Old leads (historical import)

**Tables:**

| Table              | Purpose                                                                     |
| ------------------ | --------------------------------------------------------------------------- |
| `old_leads`        | Historical Chatwoot conversations; mirrors `leads` schema (no unique phone) |
| `old_lead_details` | Extended profile per old lead (university extracted from messages)          |

**Behavior:**

| Setting             | Value                                                                                        |
| ------------------- | -------------------------------------------------------------------------------------------- |
| Access              | **Read-only** — manager/superadmin via RLS; salespeople redirected from `/old-leads`         |
| UI                  | `/old-leads` — list + slide-over; tabs **Details** \| **Conversation** (read-only thread)    |
| API                 | `GET /api/old-leads`, `GET /api/old-leads/{uuid}`, `GET /api/old-leads/{uuid}/messages`      |
| Import (leads)      | `pnpm import:old-leads` / `pnpm import:old-leads:write` (Section 3)                          |
| Import (messages)   | `pnpm import:old-lead-messages` / `pnpm import:old-lead-messages:write` (after leads import) |
| Dump source         | `readable_database.sql` — Chatwoot Postgres export (gitignored)                              |
| Dedup on import     | Groups by normalized phone or Instagram handle; merges multiple conversations per contact    |
| DB idempotency      | Unique partial index on `chatwoot_conversation_id` (migration `0039`)                        |
| `lead_phone` values | Turkish mobile, international phone, or Instagram handle (no active-pipeline dedup)          |
| `source_details`    | Chatwoot URL + `import_meta.merged_conversation_ids`; `source_confidence = unknown`          |
| Not integrated with | SLA crons, assignment, webhooks, archive, `collected_data`, campaigns, Telegram alerts       |
| Re-import (leads)   | `TRUNCATE old_lead_details; TRUNCATE old_leads;` then `import:old-leads:write`               |
| Re-import (msgs)    | `TRUNCATE old_lead_messages;` then `import:old-lead-messages:write`                          |
| Messages table      | `old_lead_messages` — migration `0040`; agent names from dump `users` at import time         |

**Expanded `lead_source` values (schema only — import currently sets `whatsapp` or `instagram`):**

`google-ads`, `meta-ads`, `google-maps`, `sahibinden` — reserved for future enrichment; not set by current import script.

### Active lead chat (live sync)

**Tables:**

| Table           | Purpose                                                                 |
| --------------- | ----------------------------------------------------------------------- |
| `lead_messages` | Cache of Chatwoot messages per active lead; synced on Conversation open |

**Behavior:**

| Setting         | Value                                                                                                     |
| --------------- | --------------------------------------------------------------------------------------------------------- |
| Access          | Same RLS as `leads` — salesperson (assigned + unassigned pool), manager, superadmin                       |
| UI              | `/leads` slide-over → **Conversation** tab                                                                |
| Webhook sync    | `message_created` webhooks automatically upsert to `lead_messages` in real-time                           |
| UI Sync trigger | `POST /api/leads/{id}/messages/sync` when tab opens (backfills history)                                   |
| Poll while open | Every **15s** re-sync same lead only via API; stops when tab closes or user switches lead                 |
| Data source     | Webhooks (real-time) + Chatwoot Application API (`listConversationMessages`)                              |
| Requires        | `CHATWOOT_API_TOKEN`, `CHATWOOT_ACCOUNT_ID`, lead `chatwoot_conversation_id` (or URL in `source_details`) |
| Private notes   | Stored if returned by API; excluded from UI (`is_private = false` filter)                                 |
| Bubbles         | Inbound left (lead name), outbound right (agent name from Chatwoot sender / agents list)                  |
| Not integrated  | Does not create leads, does not update funnel; webhooks still handle lead creation separately             |

### Lead list filters (active + old leads)

Both `/leads` and `/old-leads` use the same dynamic filter pipeline: UI toolbar state → query string (`filter[field][operator]=value`) → `GET /api/leads` or `GET /api/old-leads` → `parseFilterParams` → whitelist validation → split root vs details embed → PostgREST filters.

**Query layer (shared code):**

| Module                                                                   | Role                                                                                                                |
| ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------- |
| `lib/query/filter-builder.ts`                                            | Parses `filter[field][op]=value`; operators: `eq`, `neq`, `gt`, `gte`, `lt`, `lte`, `ilike`, `in`, `is`, `cs`, `ov` |
| `lib/query/supabase-query-types.ts`                                      | Typed PostgREST query-builder shapes for filter helpers (no `any`)                                                  |
| `lib/query/filter-field-config.ts`                                       | Per-column metadata (leads vs details table, ilike vs eq, array ops)                                                |
| `lib/query/apply-embedded-filters.ts`                                    | Applies filters on embedded `lead_details` / `old_lead_details` paths                                               |
| `lib/query/split-filters.ts`                                             | Splits root-table vs embedded detail filters                                                                        |
| `lib/query/apply-composite-filters.ts`                                   | Old-lead `rec_hotel` TEXT empty-string handling via `composite=old_rec_hotel_present\|old_rec_hotel_absent`         |
| `types/filter.ts`                                                        | `LeadListFilterState`, `FieldFilterState`, per-field mode (`match` / `filled` / `empty`)                            |
| `lib/leads/filter-field-registry.ts`                                     | Single source of truth: field id, section, control kind, table                                                      |
| `lib/ui/serialize-field-filters.ts`                                      | Maps `fieldFilters` + Sistem date ranges → query params                                                             |
| `lib/ui/build-leads-query-string.ts` / `build-old-leads-query-string.ts` | Builds full list API URLs                                                                                           |
| `lib/ui/lead-list-query.ts` / `old-lead-list-query.ts`                   | Maps toolbar state → query builders                                                                                 |
| `components/leads/filter/FilterFieldControl.tsx`                         | Per-field control (mode toggle + value input)                                                                       |
| `components/leads/filter/FilterModeToggle.tsx`                           | Değer / Dolu / Boş tri-state                                                                                        |
| `components/leads/LeadListToolbar.tsx` / `OldLeadListToolbar.tsx`        | Top bar + collapsible filter panel                                                                                  |

**Legacy (still present, no longer primary path):** `lib/ui/append-list-filter-params.ts`, `lib/ui/list-filter-types.ts` — superseded by `serialize-field-filters.ts` for active/old lead lists.

**UI layout (shipped 2026-06):** Filter panel mirrors lead detail tabs — collapsible sections **Genel**, **Profil**, **Detay**, **Sistem** (Genel open by default). **Outside** the panel: search (name/phone), Filters toggle, sort, Apply, Clear.

| Top bar control | Behavior                                                               |
| --------------- | ---------------------------------------------------------------------- |
| Search          | `search=` param — trigram RPC on name + phone only (not field filters) |
| Sort            | Dropdown; Clear resets to `created_at`                                 |
| Apply           | Commits draft toolbar state to list/pipeline query                     |
| Clear           | Resets filters, search, and sort                                       |

**Per-field filter modes (all registry fields):**

| Mode     | UI label | Query effect                                        |
| -------- | -------- | --------------------------------------------------- |
| `match`  | Değer    | Operator + value (eq, ilike, date comparison, etc.) |
| `filled` | Dolu     | `filter[field][is]=not.null`                        |
| `empty`  | Boş      | `filter[field][is]=null`                            |

Text fields support an optional **per-field fuzzy** checkbox: fuzzy → `ilike` with `%term%`; exact → `eq`. There is **no** global fuzzy checkbox in the filter panel (archived leads list still has its own fuzzy toggle for search).

**Presence / array / university:**

- Assignee match: `eq` on salesperson id, or `__unassigned__` → `filter[assigned_to][is]=null`. **Managers only** in UI.
- `dorm_awaiting`: multiselect OR via overlap (`ov`)
- `interested_hotel`, `room_type`: contains (`cs`) with single value when in match mode
- `university`: searchable combobox; fuzzy defaults on

**Sistem date-range shortcuts** (in addition to per-field `created_at` operator in Detay):

| Range                | Column            |
| -------------------- | ----------------- |
| Created from/to      | `created_at`      |
| SLA from/to          | `sla_deadline`    |
| Last contact from/to | `last_contact_at` |
| Move-in from/to      | `move_in`         |

Both Detay `created_at` comparison **and** Sistem created from/to can be active simultaneously — they compose as separate filters.

**Active leads (`/leads`) — filter sections (registry):**

| Section | Fields                                                                                                                                                               |
| ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Genel   | funnel_status, persona_type, student_gender, parent_phone, student_stage, special_state, dorm_awaiting, deal_awaiting, notes                                         |
| Profil  | parent_name, university, school_shortname, uni_year, budget_tier, language, room_type, interested_hotel (property dropdown)                                          |
| Detay   | loss_reason, created_at (date/datetime + operators), assigned_to (managers), message_from, move_in                                                                   |
| Sistem  | sla_status, lead_source, is_organic, lead_score, nationality, preferred_district, campus, room_category, district_preference, rec_hotel presence + date ranges above |

**Pipeline view (`/leads` toggle):** Uses same applied filter state via `buildLeadsQueryString` with overrides — strips `funnel_status`, forces `deal_awaiting=false`, shows hint when funnel filter is active. Gender and all other filters apply normally.

**Deal Awaiting page (`/deal-awaiting`):** Always scopes to `deal_awaiting=true`; field hidden from toolbar.

**Old leads (`/old-leads`) — same four sections minus active-only fields:**

No `deal_awaiting`, `notes`, `budget_tier`, `school_shortname`, or `sla_status`. Uses `budget_min` / `budget_max` (number filters) instead of `budget_tier`. Has hotel rec uses composite filter (TEXT column — empty string counts as absent). Manager+ access.

**Campaign segments:** `FILTERABLE_COLUMNS` whitelist is derived from `LEAD_LIST_FILTER_FIELDS`; new list filters are automatically valid in campaign segment JSON unless UI is updated separately.

**Adding a filter field:** Update `lib/constants.ts` (`LEAD_LIST_FILTER_FIELDS` / `OLD_*`), `lib/leads/filter-field-registry.ts`, `lib/query/filter-field-config.ts` (ilike/array metadata), and `__tests__/lib/build-leads-query-string.test.ts`.

### Funnel View (active lead slide-over tab)

The **Funnel View** tab (`components/leads/FunnelView.tsx`) fetches `GET /api/leads/{id}/funnel-view` and renders three sections:

| Section           | What it shows                                                                                        |
| ----------------- | ---------------------------------------------------------------------------------------------------- |
| Pipeline strip    | All funnel stages in order; current stage highlighted; amber ring when lead is stale                 |
| Stats row         | Missing critical fields count · salesperson's lead distribution · hotel rec status / Öneri Al button |
| Activity timeline | Merged feed of chat messages, CDR call logs, tasks, and status changes — sorted newest first         |

**Distribution scope:** Always shows the distribution of leads assigned to the lead's own salesperson (`assigned_to`), regardless of whether the viewer is a manager or salesperson.

**Full screen:** Expand button (top-right of Funnel View section) stretches the slide-over to fill the viewport by overriding `SheetContent` width via dynamic className. State is local React — resets when slide-over closes.

#### Stale warning thresholds — ⚠️ placeholder values, needs product owner decision

A lead is considered **stale** when `last_contact_at` is older than the threshold for its current funnel stage. Stale leads show an amber ring on the pipeline strip node and a tooltip suffix `'X gündür görüşülmedi'`.

**Current state:** All thresholds are set to **7 days** as a placeholder. This has not been reviewed or approved by the product owner.

**To update:** Edit `STALE_THRESHOLDS_BY_STAGE` in `lib/constants.ts` — one value per funnel stage. No other code changes needed.

```ts
// lib/constants.ts
export const STALE_THRESHOLDS_BY_STAGE: Readonly<Record<string, number>> = {
  yeni: 7, // ← change to decided value
  aranacak: 7,
  arandi: 7,
  'arandi-acmadi': 7,
  'bizi-aradi-konustuk': 7,
  ziyaret: 7,
  'ziyaret-etmedi': 7,
  'ziyaret-etti': 7,
  'teklif-gonderildi': 7,
  'kapora-alindi': 7,
  'sozlesme-imzalandi': 7,
  'ziyaret-ama-almayacak': 7,
  ilgilenmiyor: 7,
};
```

Stale check is based on `leads.last_contact_at` only — not on how long the lead has been in its current stage. A lead contacted yesterday is never stale even if it has been in the same stage for 30 days.

---

### Hotel recommendation (active leads)

Make.com workflow returns up to three property matches; results are stored on `lead_details.rec_hotel` (jsonb).

| Step | What happens                                                                                                                                                                              |
| ---- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1    | User fills **Profil**: `student_gender`, `budget_tier` (derives `budget_max` for Make). User fills **Detay → Öneri Girdileri**: `campus`, `room_category`, optional `district_preference` |
| 2    | **Öneri Al** in lead slide-over **Detay** tab (`LeadRecommendationPanel`) → `POST /api/leads/{id}/request-rec`                                                                            |
| 3    | CRM proxies payload to `MAKE_WEBHOOK_URL` (Make.com scenario)                                                                                                                             |
| 4    | Make.com callback → `PATCH /api/leads/{id}/rec-hotel` with `recommendations[]`                                                                                                            |
| 5    | UI polls lead detail and renders cards via `LeadRecommendationPanel`                                                                                                                      |

**Auth on callback:** `PATCH /api/leads/{id}/rec-hotel` accepts `Authorization: Bearer {CRON_SECRET}` (Make.com) **or** any authenticated CRM session.

**Service-role write path:** DB upsert runs in `lib/leads/save-rec-hotel.ts` (not in the API route directly). ESLint restricts `@/lib/supabase/service` to `lib/leads/`, `lib/jobs/`, etc. — API routes must delegate to those modules.

**Required env:** `MAKE_WEBHOOK_URL`, `CRON_SECRET` (for Make callback bearer token).

**Schema (migrations `0042`–`0046`):** `properties.is_available`, `property_room_types`, `property_rooms`, `lead_details` rec fields; `student_gender` is the single gender field (legacy `lead_details.gender` removed in `0046`).

**If Öneri Al fails:** Check `MAKE_WEBHOOK_URL` in Wrangler; verify lead has required profile fields; check Make.com scenario logs; confirm callback URL points to `https://panel.marketinguni.app/api/leads/{uuid}/rec-hotel` with correct bearer token.

---

## 9. Emergency Procedure

Work top to bottom. Do not skip steps.

### Step 1 — Is the app reachable?

```bash
curl -s -o /dev/null -w "%{http_code}" https://panel.marketinguni.app/api/health
```

- **000 / timeout:** Cloudflare or DNS issue → Cloudflare dashboard → Workers → `univotel-crm` → check deployment status and custom domain `panel.marketinguni.app`
- **503:** Supabase unreachable from Worker → Step 2
- **200:** App layer OK → problem is likely webhooks, crons, or data → Step 3+

### Step 2 — Is Supabase up?

1. Open Supabase Dashboard → project status (not paused, not over quota)
2. SQL Editor: `SELECT 1;`
3. If paused: resume project or upgrade plan

### Step 3 — Are webhooks flowing?

```sql
SELECT source, status, COUNT(*)
FROM webhook_logs
WHERE created_at > NOW() - INTERVAL '1 hour'
GROUP BY source, status;
```

- No rows in last hour during business hours → check Chatwoot/NetGSM/Meta webhook URLs point to `https://panel.marketinguni.app/api/webhooks/...`
- Many `failed` → Section 5 replay + check Wrangler secrets
- REF/DNI from marketing sites failing → check CORS allow list + `/api/health`; verify `ref_sessions` / `dni_numbers` tables exist (migrations `0033`–`0037`)
- Old leads UI empty → verify `old_leads` row count (migrations `0038`–`0039`, Section 3 import)
- Active lead chat empty → migration `0041`, Chatwoot API secrets, `chatwoot_conversation_id` on lead (Section 5)

### Step 4 — Are crons running?

```sql
SELECT jobname, status, start_time, return_message
FROM cron.job_run_details
WHERE start_time > NOW() - INTERVAL '1 hour'
ORDER BY start_time DESC;
```

- No recent rows → pg_cron extension issue or project paused
- `failed` on HTTP jobs → check `cron_settings` base_url and cron_secret

### Step 5 — Is Telegram working?

```bash
curl "https://api.telegram.org/bot<TOKEN>/getMe"
```

Manager test (logged in as manager in browser):

```bash
curl -X POST https://panel.marketinguni.app/api/notifications/test \
  -H "Cookie: <session-cookie-from-browser>"
```

Or use CRM UI while logged in as manager.

### Step 6 — Recent deploy regression?

```bash
git log -3 --oneline
```

Roll back Worker (Section 3). If DB migration caused issue, check Supabase migration history and restore from backup if critical.

### Escalation contacts

- NetGSM payload issues: teknikdestek@netgsm.com.tr
- Supabase outage: status.supabase.com
- Cloudflare outage: cloudflarestatus.com

---

## 10. Manager UI Routes

| Route                   | Purpose                                                                 | Access                    |
| ----------------------- | ----------------------------------------------------------------------- | ------------------------- |
| `/my-day`               | Personal salesperson cockpit (counters, tasks, attention, performance)  | all roles                 |
| `/dashboard`            | Analytics — **Overview** + **Team panel** tabs (see below)              | manager, superadmin       |
| `/leads`                | Active lead list                                                        | all roles (scoped by RLS) |
| `/leads/hub`            | Lead hub / unclaimed pool                                               | all roles                 |
| `/leads/expecting-call` | Expecting callback compartment                                          | all roles                 |
| `/leads/nurture`        | Nurture-stage compartment                                               | all roles                 |
| `/leads/post-visit`     | Post-visit nurture compartment                                          | all roles                 |
| `/leads/24h-restricted` | Chatwoot 24h window restricted leads                                    | all roles                 |
| `/leads/downpayment`    | Downpayment-stage compartment                                           | all roles                 |
| `/leads/deal-signed`    | Signed-deal compartment                                                 | all roles                 |
| `/leads/moved-in`       | Moved-in leads                                                          | all roles                 |
| `/visits`               | Cross-property visit calendar (Month/Week/Day/List, drag-to-reschedule) | all roles                 |
| `/move-in`              | Move-in date calendar (Month/Week/Day/List, drag-to-reschedule)         | all roles                 |
| `/leads/mine`           | Leads assigned to current user                                          | all roles                 |
| `/leads/my`             | Redirect alias → `/leads/mine`                                          | all roles                 |
| `/leads/archived`       | Archived leads                                                          | manager, superadmin       |
| `/leads/new`            | Manual lead entry                                                       | authenticated             |
| `/leads/{uuid}`         | Redirect → `/leads?selected={uuid}` (slide-over panel)                  | scoped by RLS             |
| `/tasks`                | Task list                                                               | scoped by RLS             |
| `/campaigns`            | WhatsApp campaigns                                                      | manager, superadmin       |
| `/notifications`        | Manager alert inbox                                                     | manager, superadmin       |
| `/webhook-logs`         | Webhook audit + replay                                                  | manager, superadmin       |
| `/admin/dni-numbers`    | DNI virtual number admin                                                | **superadmin only**       |
| `/old-leads`            | Historical Chatwoot imports (read-only)                                 | manager, superadmin       |
| `/team`                 | Salespeople list                                                        | manager, superadmin       |
| `/properties`           | Property inventory                                                      | authenticated             |
| `/settings`             | Theme, **language (TR/EN)**, sign out                                   | authenticated             |

### Calendar views (`/visits` & `/move-in`)

Both calendars render through one reusable component, `components/calendar/CalendarBoard.tsx`
(views split into `MonthView` / `WeekView` / `DayView` / `AgendaView`, event chip in
`EventChip.tsx`, theming + date math in `calendar-utils.ts`). Callers map their rows into
`CalendarEvent`s and supply filter groups + handlers.

| Aspect             | `/visits`                                         | `/move-in`                                     |
| ------------------ | ------------------------------------------------- | ---------------------------------------------- |
| Event type         | Timed (`scheduled_date`)                          | All-day (`lead_details.move_in`)               |
| Default view       | Week                                              | Month                                          |
| Accent             | scheduled→blue, attended→green, failed→red        | pending→blue, moved-in→green                   |
| Filters            | Status + Property + search                        | Status (pending/moved-in) + search             |
| Draggable          | `scheduled` visits owned by user or any (manager) | `pending` move-ins (locked once moved in)      |
| Reschedule persist | `PATCH /api/visits/{id}` `{ scheduled_date }`     | `PATCH /api/lead-details/{uuid}` `{ move_in }` |
| Click              | Opens `LeadDetailPanel` (`?selected={uuid}`)      | Opens `LeadDetailPanel` (`?selected={uuid}`)   |

- **Drag-to-reschedule** always routes through a confirm dialog ("moving X from Y to Z");
  cancel reverts (no write), confirm persists and updates local state so the move propagates.
- `PATCH /api/visits/[id]` now has **two modes**: resolve (`{ status: attended|failed }`,
  auto-advances funnel when in `ziyaret`) and reschedule (`{ scheduled_date }`, restricted to
  manager or the lead's assigned salesperson; does **not** change funnel status).
  Reschedule logic lives in `rescheduleVisit()` (`lib/leads/visit-ops.ts`).
- Visit scheduling from the calendar uses `ScheduleVisitButton` (lead picker → existing
  `VisitScheduleDialog`); move-in dates are still set per-lead, not created free-form.

### Dashboard tabs (manager analytics)

`/dashboard` has two tabs:

| Tab            | Data source                                                                                  | Notes                                               |
| -------------- | -------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| **Overview**   | Materialized views (`mv_*`), refreshed every 5 min by `mv_refresh` cron                      | `GET /api/analytics`                                |
| **Team panel** | Live tables — `leads.claimed_at`, `contact_history`, `visits`, `lead_stage_history`, `tasks` | `GET /api/analytics/manager-panel` (no MV, no cron) |

**Team panel behavior:**

| Setting       | Value                                                                                                                           |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Access        | manager / superadmin only (API 403 otherwise)                                                                                   |
| Query params  | `range=this_week \| this_month \| last_30_days` (default `this_month`); optional `salesperson={uuid}`                           |
| Scoping       | KPI cards + daily trend charts follow the salesperson selector (or table row click); team table always shows everyone           |
| Trend buckets | Istanbul calendar days (`lib/analytics/trend-buckets.ts`)                                                                       |
| Credit rules  | Same as My Day performance: stage transitions credit `changed_by`, visits credit `created_by`, contacts credit `salesperson_id` |
| Conversion    | `deals signed / claimed` per salesperson (claims = `claimed_at` in range)                                                       |
| Query safety  | Bulk fetches paged at 1000 rows, hard cap 10 pages per table per request                                                        |
| Code          | `lib/analytics/manager-panel.ts` (service role), `components/analytics/ManagerPanel.tsx`, `hooks/useManagerPanel.ts`            |

If the Team panel shows zeros for older periods: `lead_stage_history` and `claimed_at` only exist since migrations `0070`–`0073` — backfill (`0073`) covers current statuses only, so per-stage credit before that deploy is incomplete (expected, not a bug).

### My Day cockpit (all roles)

| Setting | Value                                                                                                                    |
| ------- | ------------------------------------------------------------------------------------------------------------------------ |
| Route   | `/my-day` (sidebar first item)                                                                                           |
| API     | `GET /api/my-day`, `GET /api/my-day/performance?range=this_week\|this_month`                                             |
| Scope   | Self-scoped to logged-in salesperson only                                                                                |
| Tabs    | **Today** (counters, tasks, attention queue, mini funnel) · **Performance** (conversion funnel, visits, activity, tasks) |
| Code    | `lib/my-day/aggregations.ts`, `lib/my-day/performance.ts`, `components/my-day/*`, `pages/my-day.tsx`                     |

Opening a lead from My Day sets `?selected=` slide-over via local state (same `LeadDetailPanel` as `/leads`).

### UI locale (Turkish / English)

- **Default:** Turkish (`tr`) on first visit when no preference is stored.
- **Toggle:** **Settings** → **Language** → Türkçe or English. English remains fully supported.
- **Persistence:** Browser `localStorage` key `univotel-locale` (same pattern as `univotel-theme` for dark mode).
- **Scope:** Menus, labels, buttons, table headers, empty states, and enum display labels. **Not translated:** lead names, notes, chat message bodies, universities, hotel names, webhook payloads, Telegram/cron alert text.
- **Code:** `lib/i18n/messages/{en,tr}.ts`, `components/layout/LocaleProvider.tsx`, `hooks/useTranslation.ts`. New UI strings need keys in **both** catalogs.

Attribution detail API (for lead detail panels): `GET /api/leads/{uuid}/attribution` → full `collected_data` row (manager/superadmin). Returns **404** for pre-Phase 4 leads with no `collected_data`.

Old lead detail API: `GET /api/old-leads/{uuid}` → full `old_leads` row + `old_lead_details` (manager/superadmin). Read-only — no PATCH/POST routes.

**Active lead slide-over** (`/leads` with `?selected=`): tabs **Overview**, **Profile** (incl. hotel **Öneri Al** + recommendation cards), **Conversation** (live Chatwoot sync), **Funnel View** (pipeline strip, stats row, merged activity timeline), **History** (CRM audit log), **Activity** (merged event feed), **Actions** (managers). Quick-action bar: log contact, create task, stage advance. **Old lead slide-over:** **Details**, **Conversation** (dump import).

| API                                  | Method | Purpose                                                                    |
| ------------------------------------ | ------ | -------------------------------------------------------------------------- |
| `GET /api/analytics`                 | GET    | Manager Overview tab (materialized views)                                  |
| `GET /api/analytics/manager-panel`   | GET    | Manager Team panel — team metrics + daily trends (`range`, `salesperson`)  |
| `GET /api/my-day`                    | GET    | Personal cockpit counters, tasks, attention queue                          |
| `GET /api/my-day/performance`        | GET    | Self-scoped performance metrics (`range=this_week\|this_month`)            |
| `GET /api/leads/{id}/messages`       | GET    | Paginated read from `lead_messages` (load older)                           |
| `POST /api/leads/{id}/messages/sync` | POST   | Fetch from Chatwoot API + upsert cache; called when Conversation tab opens |
| `POST /api/leads/{id}/request-rec`   | POST   | Proxy hotel recommendation request to Make.com (`MAKE_WEBHOOK_URL`)        |
| `PATCH /api/leads/{id}/rec-hotel`    | PATCH  | Make.com callback — upserts `lead_details.rec_hotel` via `save-rec-hotel`  |
| `GET /api/leads/{id}/funnel-view`    | GET    | Pipeline data, stats, and merged activity timeline for Funnel View tab     |
| `GET /api/leads/{id}/activity`       | GET    | Merged activity timeline for Activity tab                                  |
| `POST /api/leads/{id}/log-contact`   | POST   | Log manual contact (also auto-completes nurture tasks)                     |
| `POST /api/leads/{id}/advance-stage` | POST   | Quick stage advance from contextual actions                                |
| `POST /api/leads/{id}/claim`         | POST   | Claim unassigned lead (sets `claimed_at`)                                  |
| `GET /api/old-leads/{uuid}/messages` | GET    | Paginated read from `old_lead_messages`                                    |
| `GET /api/old-leads/{uuid}`          | GET    | Old lead detail (manager/superadmin)                                       |

Live sync poll interval while Conversation tab is open: **15s** (`LEAD_CHAT_SYNC_POLL_MS` in `lib/constants.ts`).

---

## 11. Useful CLI Commands

```bash
# Local dev (if odd errors: rm -rf .next && pnpm dev)
pnpm dev

# Tests + production build check before deploy
pnpm test
pnpm build          # runs ESLint; must pass before cf:deploy

# Cloudflare production deploy (runs opennext build + wrangler deploy)
pnpm cf:deploy

# Type generation after migration
pnpm gen:types

# Telegram webhook registration
pnpm telegram:setup-webhook

# Chatwoot agent → CRM salesperson mapping
pnpm exec tsx scripts/sync-chatwoot-agents.ts

# Old leads import (Chatwoot SQL dump → old_leads)
pnpm import:old-leads              # dry-run
pnpm import:old-leads:write        # insert (requires empty old_leads table)

# Old lead messages import (dump → old_lead_messages; requires old_leads + 0040)
pnpm import:old-lead-messages      # dry-run
pnpm import:old-lead-messages:write

# List Wrangler secrets (names only)
pnpm exec wrangler secret list

# Set a secret
pnpm exec wrangler secret put CRON_SECRET
pnpm exec wrangler secret put GOOGLE_SERVICE_ACCOUNT_JSON
pnpm exec wrangler secret put GA4_PROPERTY_ID

# Local Cloudflare preview
pnpm cf:preview
```

**Deploy build failures (ESLint):**

| Error                                                   | Cause                                                   | Fix                                                               |
| ------------------------------------------------------- | ------------------------------------------------------- | ----------------------------------------------------------------- |
| `Service role client may only be imported from lib/...` | `pages/api/*` imports `@/lib/supabase/service` directly | Move DB logic to `lib/leads/`, `lib/jobs/`, etc.; keep route thin |
| `@typescript-eslint/no-explicit-any` in `lib/query/*`   | Untyped Supabase query-builder generics                 | Use `lib/query/supabase-query-types.ts`                           |

---

## 12. Adding to This Runbook

After every production incident, add one entry to **Section 5** using this format:

```markdown
### Short problem title

**Cause:** ...
**Check:** `sql or bash command`
**Fix:** ...
```

Keep commands copy-paste ready. Do not paste secrets into this file.
