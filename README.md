# Univotel CRM — Phase 1

Lead management CRM for Univotel. Phase 1 scaffold with Supabase backend, webhook ingestion, and minimal testing UI.

## Prerequisites

- Node.js 20+
- pnpm 9+
- [Supabase CLI](https://supabase.com/docs/guides/cli)
- Docker (for local Supabase)

## Setup

```bash
pnpm install
cp .env.example .env.local
# Fill in Supabase keys in .env.local (see Environment below)

# One-time: authenticate Supabase CLI for gen:types
pnpm exec supabase login

pnpm gen:types
pnpm dev
```

### Environment

Use **`.env.local`** for local secrets (Next.js and `pnpm gen:types` both read it).

Required for the app:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `CRON_SECRET` (min 32 chars)

Optional but recommended:

- `SUPABASE_PROJECT_ID` — if omitted, `gen:types` derives it from `NEXT_PUBLIC_SUPABASE_URL`

### Generate TypeScript types

After schema changes in Supabase:

```bash
pnpm gen:types
```

Uses the **project-local** Supabase CLI (`node_modules/.bin/supabase`), not a global install.
Requires `pnpm exec supabase login` once per machine.

## Auth Users

Create Supabase Auth users in the dashboard matching seed salesperson emails. Set each user's UUID to match the seed `salespeople.id` values in `supabase/seed.sql`.

## Development

```bash
pnpm dev
```

Open http://localhost:3000

## Testing

```bash
pnpm test
pnpm build
```

## Webhook endpoints

| URL                            | Source                                    |
| ------------------------------ | ----------------------------------------- |
| `/api/webhooks/chatwoot`       | Chatwoot (`marketinguni.app`)             |
| `/api/webhooks/whatsapp-calls` | Meta WA — `calls` + `statuses`            |
| `/api/webhooks/netgsm`         | NetGSM CDR / santral dinleme              |
| `/api/webhooks/telegram`       | Telegram bot commands (`/start`, `/link`) |

Production base: `https://panel.marketinguni.app`

Set `CHATWOOT_BASE_URL=https://marketinguni.app` and `CHATWOOT_WEBHOOK_SECRET` to match Chatwoot dashboard (same value in Wrangler secret and Chatwoot webhook signing secret).

**Chatwoot subscriptions:** enable `conversation_created`, `message_created`, and `conversation_updated`. Lead creation runs on the first two (incoming messages only) and on `conversation_updated` when a thread reopens to `open` without an existing CRM lead.

**Two-way Chatwoot sync:** set `CHATWOOT_API_TOKEN` (or `CHATWOOT_PERSONAL_ACCESS_TOKEN`), `CHATWOOT_ACCOUNT_ID`, `CHATWOOT_SYNC_ENABLED=true`, `CHATWOOT_ASSIGNEE_SYNC_ENABLED=true`, and `CHATWOOT_LABEL_SYNC_ENABLED=true`. Run `pnpm exec tsx scripts/sync-chatwoot-agents.ts` once to map agents.

- **Inbound:** `conversation_updated` label changes map to CRM funnel/stage/persona/source fields (see `getLabelFieldTargets` in `lib/constants.ts`). Assignee changes update CRM `assigned_to` when assignee sync is on.
- **Outbound:** Manager CRM reassign pushes to Chatwoot (including unassign). CRM funnel/stage and `lead_details` label fields push full label set to Chatwoot. Auto-assign on new Chatwoot leads pushes CRM assignee when Chatwoot has no assignee on the payload.
- **Echo guard:** `CHATWOOT_SYNC_ECHO_WINDOW_MS` (default 10s) prevents webhook loops after CRM-originated writes.
- **Audit:** `chatwoot_sync_log` table (migration 0023) records outbound/inbound sync outcomes.

**Cloudflare:** webhook handlers **await** processing before returning HTTP 200 so lead inserts are not dropped when the worker isolate exits.

NetGSM: send `token` in JSON body matching `NETGSM_STATIC_TOKEN`. CDR payloads use `arayan`, `aranan`, `sure`, `kimlik` (see Netsantral docs).

### Phase 2 migrations

Apply in order before deploying Phase 2 code:

```bash
pnpm db:migrate   # through 0025 cron_settings table
pnpm gen:types
```

| Migration | Purpose                                                                             |
| --------- | ----------------------------------------------------------------------------------- |
| `0018`    | `notifications` table + RLS                                                         |
| `0019`    | Backfill SLA / overdue / unassigned alerts (Turkish terminal slugs)                 |
| `0020`    | Fix MV `won_count` → `sozlesme-imzalandi`; fix `active_lead_count_reconcile` cron   |
| `0021`    | Midnight UTC `campaign_daily_reset` pg_cron                                         |
| `0022`    | Chatwoot assignee sync columns                                                      |
| `0023`    | Chatwoot two-way label sync + `chatwoot_sync_log`                                   |
| `0024`    | pg_cron + pg_net HTTP jobs for SLA alerts, task overdue, campaign resume            |
| `0025`    | `cron_settings` table (replaces `ALTER DATABASE` config blocked on hosted Supabase) |

**Meta (before campaigns):** In Meta App dashboard, subscribe the **`statuses`** field on the same webhook URL as `calls` (`/api/webhooks/whatsapp-calls`).

**Env (Phase 2):** `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_API_TOKEN` (Wrangler secrets in production).

**Cron (pg_cron + pg_net):** Migrations `0024`–`0025` schedule three jobs every 5 minutes. Each job POSTs to a CRM API route with `Authorization: Bearer <CRON_SECRET>`. After applying migrations, insert config once in the Supabase SQL editor (secrets are not in git):

```sql
INSERT INTO cron_settings (key, value) VALUES
  ('base_url', 'https://panel.marketinguni.app'),
  ('cron_secret', 'paste-your-generated-secret-here-no-angle-brackets')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
```

Generate a secret with `openssl rand -base64 32`. Use the **same value** in Wrangler (`pnpm exec wrangler secret put CRON_SECRET`) and `.env.local`.

`CRON_SECRET` must match in all three places: `cron_settings`, Wrangler, and `.env.local`.

Manager UI: `/notifications`, `/campaigns`, `/webhook-logs`.

### Telegram alerts

Env: `TELEGRAM_BOT_TOKEN`, `TELEGRAM_MANAGER_CHAT_IDS`, optional `TELEGRAM_WEBHOOK_SECRET`.

1. Create bot via [@BotFather](https://t.me/BotFather) and set `TELEGRAM_BOT_TOKEN`.
2. Each manager sends `/start` to the bot → copy Chat ID into `TELEGRAM_MANAGER_CHAT_IDS`.
3. Salespeople link task alerts: `/link their@email.com` (maps `salespeople.telegram_chat_id`).
4. Register webhook (production + local preview need public URL):

```bash
pnpm telegram:setup-webhook
```

Webhook URL: `https://panel.marketinguni.app/api/webhooks/telegram`

**Test (manager session):** `POST /api/notifications/test`

**Alert types:** unassigned leads, SLA breaches, task overdue, webhook failures, campaign paused/failed, plus system errors from Chatwoot/NetGSM/WhatsApp processors.

## Webhook Testing (curl)

### Chatwoot (signed)

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

Unsigned requests return **401**. After a successful POST, check Supabase `webhook_logs` and `leads`.

### Health check

```bash
curl http://localhost:3000/api/health
```

## NetGSM

NetGSM webhooks are processed via `lib/webhooks/process-netgsm.ts` (CDR normalization + lead creation). Contact teknikdestek@netgsm.com.tr for payload changes.

## Deployment (Cloudflare Workers)

Local CLI only (no GitHub CI). ISR cache uses R2 bucket `univotel-crm-isr-cache`.

### One-time (Cloudflare account)

```bash
pnpm install
pnpm exec wrangler login
pnpm exec wrangler r2 bucket create univotel-crm-isr-cache
```

Copy `.dev.vars.example` → `.dev.vars` for local preview, or set secrets for production:

```bash
# Repeat for each variable in .dev.vars.example (values are prompted)
pnpm exec wrangler secret put NEXT_PUBLIC_SUPABASE_URL
pnpm exec wrangler secret put SUPABASE_SERVICE_ROLE_KEY
# ... etc.
```

### Phase 1 — workers.dev

1. Set `NEXT_PUBLIC_APP_URL` to your worker URL (e.g. `https://univotel-crm.<subdomain>.workers.dev`) before or right after first deploy.
2. Build and deploy:

```bash
pnpm cf:deploy
```

If deploy fails on **“Populating remote R2 incremental cache”** with `503 Service Unavailable`, use `pnpm cf:deploy` (deploys the worker via Wrangler and skips R2 pre-upload). Optional: `pnpm cf:deploy:with-cache` retries full OpenNext deploy including cache warm-up.

3. Smoke test: `curl https://univotel-crm.<subdomain>.workers.dev/api/health`

### Phase 2 — custom domain `panel.marketinguni.app`

1. In Cloudflare dashboard: **Workers & Pages** → **univotel-crm** → **Settings** → **Domains & Routes** → add custom domain.
2. Update secret: `pnpm exec wrangler secret put NEXT_PUBLIC_APP_URL` → `https://panel.marketinguni.app`
3. Point Chatwoot / Meta webhooks at `https://panel.marketinguni.app/api/webhooks/...`

### Local production preview

```bash
cp .dev.vars.example .dev.vars   # fill values
pnpm cf:preview
```
