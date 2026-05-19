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

## Webhook Testing (curl)

### Chatwoot (unsigned — expect 401)

```bash
curl -X POST http://localhost:3000/api/webhooks/chatwoot \
  -H "Content-Type: application/json" \
  -d '{"event":"message_created"}'
```

### Health check

```bash
curl http://localhost:3000/api/health
```

## NetGSM

The NetGSM processor is a stub pending CDR field documentation from teknikdestek@netgsm.com.tr.

## Deployment

See Phase 1 Implementation doc for Cloudflare Workers deploy checklist.
