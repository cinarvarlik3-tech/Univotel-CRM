# Univotel CRM — Production Runbook

Last updated: 2026-05-25. This document describes **what the running system does now** and **how to fix it when something breaks**. For design history, see implementation docs; this is operational reference only.

---

## 1. System Overview

Univotel CRM ingests leads from Chatwoot (WhatsApp/Instagram), NetGSM (phone calls), and Meta WhatsApp calls, stores them in Supabase Postgres, assigns them to salespeople, tracks SLA and tasks, sends Telegram alerts to managers and agents, runs WhatsApp campaigns, and archives terminal leads after **80 days**. **Phase 4** adds first-click attribution: REF codes and UTM from marketing sites, Dynamic Number Insertion (DNI) for call source tracking, a `collected_data` table written in parallel with `leads.source_details`, and async GA4 Data API session enrichment. **Old leads (historical import):** one-time bulk import from a Chatwoot SQL dump (`readable_database.sql`) into read-only `old_leads` / `old_lead_details` (migrations `0038`–`0039`), plus one-time message import into `old_lead_messages` (`0040`) — browsable at `/old-leads` with a read-only **Conversation** tab (manager/superadmin only). **Active lead chat (live):** opening **Conversation** on an active lead slide-over calls the Chatwoot Application API for that lead only, caches messages in `lead_messages` (`0041`), and re-syncs every **15s** while the tab stays open (requires `CHATWOOT_API_TOKEN` + `CHATWOOT_ACCOUNT_ID`; no cron, no background sync for other leads). Old leads are not wired to live webhooks or the active SLA/archive pipeline. The UI and API run on Cloudflare Workers (OpenNext). Scheduled jobs run in **Supabase pg_cron** (HTTP callbacks to the CRM for most jobs; archive/reconcile remain SQL-only).

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

| Role          | Access                                                                                                                                                                                         |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `salesperson` | Assigned + unassigned active leads (incl. **Conversation** tab — live Chatwoot sync per open lead); own tasks; read-only properties; **My Leads** at `/leads/mine`                             |
| `manager`     | All active leads, archived leads, dashboard, campaigns, webhook logs, notifications; **My Leads** for personally assigned subset; **Old leads** at `/old-leads` (read-only historical imports) |
| `superadmin`  | Everything `manager` has + **DNI numbers admin** (`/admin/dni-numbers`); same manager-level data access via RLS                                                                                |

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

Migrations are in `supabase/migrations/` numbered `0001`–`0041`. Apply in order.

| Range         | Phase                                                                                                |
| ------------- | ---------------------------------------------------------------------------------------------------- |
| `0026`–`0032` | Phase 3 — archive fields, nightly archive, analytics MVs, 80-day cutoff                              |
| `0033`–`0037` | Phase 4 — superadmin role, `ref_sessions`, `dni_numbers`, `collected_data`, GA4 enrichment cron      |
| `0038`–`0039` | Old leads — `old_leads`, `old_lead_details`, unique `chatwoot_conversation_id` for idempotent import |
| `0040`        | Old lead messages — `old_lead_messages` (historical dump import; read-only)                          |
| `0041`        | Active lead messages — `lead_messages` (on-demand Chatwoot API sync when Conversation tab opens)     |

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

**Active lead chat (`0041`) — no bulk import:**

Messages load from Chatwoot API when a user opens **Conversation** on `/leads` (see Section 10). Apply migration `0041` only; no CLI backfill required unless you add a custom script later.

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

**On failure:** `/webhook-logs` (manager UI) shows `status=failed`. Also check Supabase `webhook_logs`.

**Replay:** Manager → `/webhook-logs` → failed row → **Replay**, or `POST /api/webhook-logs/{uuid}/replay` with manager session.

**Lead creation rules:** Incoming messages only (skips `message_type=outgoing`). Duplicate phone → `duplicate_submission` in contact history, no new lead.

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

| Field          | Value                                                    |
| -------------- | -------------------------------------------------------- |
| URL            | `POST /api/webhooks/netgsm`                              |
| Source         | NetGSM santral / CDR webhook                             |
| Auth           | JSON body field `token` must match `NETGSM_STATIC_TOKEN` |
| Payload fields | `arayan`, `aranan`, `sure`, `kimlik`                     |

**Phase 4 attribution:** `aranan` (called virtual number) is matched against `dni_numbers.virtual_number`; `lead_count` and `last_lead_at` increment on the matching row. `collected_data.source_confidence = inferred`, `path_lost_at = lost_at_source` (no browser session).

**On failure:** `/webhook-logs`, source `netgsm`.

**Replay:** Same replay flow.

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

**Fix:** Manager → Replay from UI. If signature errors, verify webhook secret in Wrangler matches provider dashboard.

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
  AND funnel_status NOT IN ('sozlesme-imzalandi', 'ziyaret-ama-almayacak', 'ilgilenmiyor');
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
  AND funnel_status IN ('sozlesme-imzalandi', 'ziyaret-ama-almayacak', 'ilgilenmiyor')
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
    AND funnel_status NOT IN ('sozlesme-imzalandi', 'ziyaret-ama-almayacak', 'ilgilenmiyor')
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
    AND l.funnel_status NOT IN ('sozlesme-imzalandi', 'ziyaret-ama-almayacak', 'ilgilenmiyor')
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

### Duplicate leads from WhatsApp messages (Chatwoot + Meta API both active)

**Cause:** Both the WhatsApp (Meta) API and Chatwoot are connected and configured to deliver messages. Every incoming WhatsApp message that creates a lead is created twice — once from the WhatsApp webhook and once from Chatwoot.

**Note:** This cannot be solved by disabling WhatsApp's message delivery, because then WhatsApp won't send messages to Chatwoot. That would make debugging and log checking harder.

**Possible direction (not implemented):** Remove the WhatsApp API integration, forgoing the WhatsApp call lead creation feature. More on this at a later date.

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

| Job name                      | Schedule (UTC) | Type                               | What it does                                                  |
| ----------------------------- | -------------- | ---------------------------------- | ------------------------------------------------------------- |
| `sla_update`                  | `*/5 * * * *`  | SQL                                | Updates `leads.sla_status` (on_time / at_risk / breached)     |
| `task_overdue_check`          | `*/5 * * * *`  | SQL                                | Sets `tasks.is_late = true` where overdue                     |
| `mv_refresh`                  | `*/5 * * * *`  | SQL                                | Refreshes 4 materialized views (analytics dashboard)          |
| `sla-alerts`                  | `*/5 * * * *`  | HTTP → `/api/cron/sla-alerts`      | Telegram SLA breach alerts to managers                        |
| `task-overdue`                | `*/5 * * * *`  | HTTP → `/api/cron/task-overdue`    | Telegram task alerts to salespeople + manager escalation      |
| `campaign-resume`             | `*/5 * * * *`  | HTTP → `/api/cron/campaign-resume` | Resumes paused campaigns under daily quota                    |
| `ga4-enrichment`              | `*/5 * * * *`  | HTTP → `/api/cron/ga4-enrichment`  | GA4 Data API retries for `collected_data` (attempts 2–4)      |
| `campaign_daily_reset`        | `0 0 * * *`    | SQL                                | Resets `daily_send_count`, unpauses campaigns at midnight UTC |
| `nightly-archive`             | `0 3 * * *`    | SQL                                | Archives up to **100** eligible terminal leads                |
| `active_lead_count_reconcile` | `15 3 * * *`   | SQL                                | Recounts `salespeople.active_lead_count`                      |

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

**SLA excluded for:** deleted leads, archived leads, terminal funnel statuses (`sozlesme-imzalandi`, `ziyaret-ama-almayacak`, `ilgilenmiyor`).

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

`sozlesme-imzalandi` (won), `ziyaret-ama-almayacak` (lost), `ilgilenmiyor` (lost/nurture)

Excluded from: SLA updates, `active_lead_count`, assignment pool counts.

### Auto-archive (Phase 3)

| Setting          | Value                                                                   |
| ---------------- | ----------------------------------------------------------------------- |
| Schedule         | Daily **03:00 UTC** (`nightly-archive`)                                 |
| Wait time        | **80 days** in terminal status                                          |
| Clock starts     | `COALESCE(last_contact_at, updated_at)`                                 |
| Batch size       | **100 leads/night** (oldest first; backlog clears over multiple nights) |
| Won mapping      | `sozlesme-imzalandi` → `archive_reason = won`                           |
| Lost mapping     | `ziyaret-ama-almayacak`, `ilgilenmiyor` → `archive_reason = lost`       |
| Auto loss_reason | Uses existing `leads.loss_reason`, else **`sure-asildi`**               |
| Manual archive   | Manager anytime via lead detail → no wait required                      |
| Unarchive        | Manager via `/leads/archived/{uuid}` → restores to active lists         |

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
| Sync trigger    | `POST /api/leads/{id}/messages/sync` when tab opens; **not** called from list or cron                     |
| Poll while open | Every **15s** re-sync same lead only; stops when tab closes or user switches lead                         |
| Data source     | Chatwoot Application API (`listConversationMessages`) — not webhook, not SQL dump                         |
| Requires        | `CHATWOOT_API_TOKEN`, `CHATWOOT_ACCOUNT_ID`, lead `chatwoot_conversation_id` (or URL in `source_details`) |
| Private notes   | Stored if returned by API; excluded from UI (`is_private = false` filter)                                 |
| Bubbles         | Inbound left (lead name), outbound right (agent name from Chatwoot sender / agents list)                  |
| Not integrated  | Does not create leads, does not update funnel; webhooks still handle lead creation separately             |

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

| Route                | Purpose                                                | Access                    |
| -------------------- | ------------------------------------------------------ | ------------------------- |
| `/dashboard`         | Analytics (materialized views, refreshed every 5 min)  | manager, superadmin       |
| `/leads`             | Active lead list                                       | all roles (scoped by RLS) |
| `/leads/mine`        | Leads assigned to current user                         | all roles                 |
| `/leads/my`          | Redirect alias → `/leads/mine`                         | all roles                 |
| `/leads/archived`    | Archived leads                                         | manager, superadmin       |
| `/leads/new`         | Manual lead entry                                      | authenticated             |
| `/leads/{uuid}`      | Redirect → `/leads?selected={uuid}` (slide-over panel) | scoped by RLS             |
| `/tasks`             | Task list                                              | scoped by RLS             |
| `/campaigns`         | WhatsApp campaigns                                     | manager, superadmin       |
| `/notifications`     | Manager alert inbox                                    | manager, superadmin       |
| `/webhook-logs`      | Webhook audit + replay                                 | manager, superadmin       |
| `/admin/dni-numbers` | DNI virtual number admin                               | **superadmin only**       |
| `/old-leads`         | Historical Chatwoot imports (read-only)                | manager, superadmin       |
| `/team`              | Salespeople list                                       | manager, superadmin       |
| `/properties`        | Property inventory                                     | authenticated             |

Attribution detail API (for lead detail panels): `GET /api/leads/{uuid}/attribution` → full `collected_data` row (manager/superadmin). Returns **404** for pre-Phase 4 leads with no `collected_data`.

Old lead detail API: `GET /api/old-leads/{uuid}` → full `old_leads` row + `old_lead_details` (manager/superadmin). Read-only — no PATCH/POST routes.

**Active lead slide-over** (`/leads` with `?selected=`): tabs **Overview**, **Profile**, **Conversation** (live Chatwoot sync), **History** (CRM audit log), **Actions** (managers). **Old lead slide-over:** **Details**, **Conversation** (dump import).

| API                                  | Method | Purpose                                                                    |
| ------------------------------------ | ------ | -------------------------------------------------------------------------- |
| `GET /api/leads/{id}/messages`       | GET    | Paginated read from `lead_messages` (load older)                           |
| `POST /api/leads/{id}/messages/sync` | POST   | Fetch from Chatwoot API + upsert cache; called when Conversation tab opens |
| `GET /api/old-leads/{uuid}/messages` | GET    | Paginated read from `old_lead_messages`                                    |
| `GET /api/old-leads/{uuid}`          | GET    | Old lead detail (manager/superadmin)                                       |

Live sync poll interval while Conversation tab is open: **15s** (`LEAD_CHAT_SYNC_POLL_MS` in `lib/constants.ts`).

---

## 11. Useful CLI Commands

```bash
# Local dev
pnpm dev

# Tests
pnpm test

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
