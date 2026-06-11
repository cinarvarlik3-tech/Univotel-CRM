# NetGSM Integration — Connection Details & System Reference

**Last updated:** 2026-06-11  
**Production endpoint:** `POST https://panel.marketinguni.app/api/webhooks/netgsm`  
**Related:** [`runbook.md` §4 NetGSM](./runbook.md), [`engineering-handoff.md`](./engineering-handoff.md), [`engineering-onboarding.md`](./engineering-onboarding.md)

This document covers **every NetGSM touchpoint in Univotel CRM**: how calls become leads or call logs, how authentication works (including caveats), payload normalization, company-line CDR matching, DNI attribution, idempotency, logging, replay, and production troubleshooting.

---

## 1. What NetGSM does in this system

NetGSM is the **GSM voice call ingestion channel**. When a prospect calls a marketing virtual number (DNI) or the main santral line, NetGSM sends an HTTP POST to the CRM. The CRM:

1. Authenticates the request (static token in JSON body)
2. Normalizes Turkish field names (`arayan`, `aranan`, `sure`, `kimlik`)
3. Decides whether the event represents a **completed call worth processing**
4. **Either** logs the call on an **existing lead** (company-line CDR path) **or** creates a new lead with `lead_source = netgsm_call`
5. On **new lead** creation only: matches `aranan` to **`dni_numbers`** for marketing attribution and increments DNI counters
6. Writes **`webhook_logs`** for audit and optional replay

Two outcomes after a qualifying webhook:

| Path                 | When                                                                                                                         | Result                                                               |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| **Company-line CDR** | `scenario: cdr` and caller or callee is the company line (`+90 212 909 52 44`) and a lead exists for the other party's phone | `contact_history` call log; may **unarchive** lead — **no new lead** |
| **New lead**         | No company-line match, or no existing lead for that phone                                                                    | Full lead pipeline (dedupe, assign, SLA, DNI, attribution)           |

NetGSM is **not** used for WhatsApp, SMS, or outbound campaign delivery in this CRM.

---

## 2. NetGSM dashboard configuration (external)

### What must be configured in NetGSM

| Setting           | Requirement                                                                                      |
| ----------------- | ------------------------------------------------------------------------------------------------ |
| **HTTP POST URL** | `https://panel.marketinguni.app/api/webhooks/netgsm`                                             |
| **Method**        | `POST`                                                                                           |
| **Content-Type**  | `application/json`                                                                               |
| **Token in body** | JSON field `token` must equal CRM env `NETGSM_STATIC_TOKEN`                                      |
| **Event type**    | **CDR / call-end / santral dinleme** — HTTP notification **after hangup** with caller + duration |

### What does NOT work by itself

- **IVR “CRM Call Integration” function screen** — configuring CRM fields in the IVR UI does **not** replace binding **CDR / santral dinleme** HTTP POST on the call path.
- **Queue-only events** — ring/queue notifications without caller id are logged as **`skipped`**, not leads.
- **Pointing webhook at localhost** — NetGSM cannot reach `127.0.0.1`; use production URL or a tunnel for dev.

### Escalation

If curl smoke tests succeed but **live calls produce no HTTP traffic**, contact NetGSM support:

**teknikdestek@netgsm.com.tr**

Ask which menu enables **post-call CDR HTTP POST** for your santral / virtual numbers, and request a sample payload for your account.

---

## 3. CRM endpoint

| Item        | Value                                                                |
| ----------- | -------------------------------------------------------------------- |
| Route file  | `pages/api/webhooks/netgsm.ts`                                       |
| HTTP method | `POST` only (405 otherwise)                                          |
| Body parser | **Disabled** (`bodyParser: false`) — raw body read for JSON parse    |
| Middleware  | **Excluded** from session auth (`middleware.ts`)                     |
| Response    | **Always HTTP 200** after auth (even if processing throws — see §10) |

### Handler factory flow

```
POST /api/webhooks/netgsm
  → readRawBody
  → verify (token in JSON)
  → JSON.parse
  → runWithWebhookLog
       → claimWebhookLog (idempotency)
       → shouldSkipProcessing? → status=skipped
       → processNetGsm
            → handleCdrForExistingLead? → contact_history (+ unarchive) → return
            → else createLeadFromWebhook
       → finalizeWebhookLog (success | failed)
  → res.status(200)
```

Implementation: `lib/webhooks/create-webhook-handler.ts`, `lib/webhooks/run-with-webhook-log.ts`, `lib/webhooks/process-netgsm.ts`.

---

## 4. Authentication

### Mechanism

- **Type:** Shared static secret in JSON body field `token` (not HMAC header like Chatwoot).
- **Env var:** `NETGSM_STATIC_TOKEN` (Zod-validated in `lib/env.ts`).
- **Production:** Set via Cloudflare Wrangler secrets (`pnpm exec wrangler secret put NETGSM_STATIC_TOKEN`).
- **Local:** `.env.local` — same variable name.
- **Verification:** Timing-safe compare in `lib/webhooks/verify.ts` → `verifyNetGsmToken()`.

### Token field aliases

Normalization accepts: `token`, `TOKEN` (see `normalize-netgsm-payload.ts`).

### Critical caveats

| Caveat                               | Behavior                                                                          | Risk                                                                            |
| ------------------------------------ | --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| **Missing token passes HTTP verify** | In `pages/api/webhooks/netgsm.ts`, verify returns `true` when `!token`            | Unauthenticated requests can reach the processor if NetGSM omits `token`        |
| **Wrong token → HTTP 401**           | Before `webhook_logs` insert                                                      | No audit row; NetGSM may retry depending on their config                        |
| **Wrong token after skip check**     | `shouldSkipNetGsmLead` returns `true` → skipped path if token present but invalid | Edge case if token present in body but fails verify in route (401) vs processor |
| **Double verify**                    | Route verifies token; `processNetGsm` verifies again if token present             | Defense in depth when token is sent                                             |

**Recommendation for operators:** Always configure NetGSM to send `token`. Treat missing-token 200 responses as a configuration gap, not intentional public access.

---

## 5. Payload formats & field mapping

NetGSM sends **loosely typed JSON**. CRM schema: `NetGsmPayloadSchema = z.record(z.unknown())` (`types/webhooks.ts`) — any JSON object is accepted; business rules apply in normalization.

### Official CDR fields (primary)

| NetGSM field | Meaning                       | CRM internal      |
| ------------ | ----------------------------- | ----------------- |
| `arayan`     | Caller phone                  | `callerPhone`     |
| `aranan`     | Called virtual / trunk number | `calledNumber`    |
| `sure`       | Talk duration (seconds)       | `durationSeconds` |
| `kimlik`     | Unique call id                | `externalId`      |
| `scenario`   | Event type (e.g. `cdr`)       | `scenario`        |
| `token`      | Auth secret                   | `token`           |

### Supported aliases

**Caller (`arayan`):** `arayan`, `arayan_no`, `caller_num`, `source`; santral dinleme may use `customer_num` / `called` for inbound/hangup/outbound scenarios.

**Called (`aranan`):** `aranan`, `aranan_no`, `called_num`, `destination`, `incoming_number`, `trunk`.

**External id:** `arama_id`, `kimlik`, `asteriskId`, `unique_id`, `uniqueId`, `crm_id`, `filter`.

**Duration:** `sure`, `talktime`, `holdtime`, `duration`.

**Nested payloads:** `{ body: { ... } }` (AutomaticCall-style) is flattened before lookup.

Source: `lib/webhooks/normalize-netgsm-payload.ts`.

### Example — official CDR (from tests / Netsantral docs)

```json
{
  "bas": "2021-01-27 16:05:38",
  "kimlik": "18664123456",
  "arayan": "05321234567",
  "aranan": "85030xxxxx-queue-MusteriHizmetleri",
  "sure": 164,
  "scenario": "cdr",
  "timestamp": "1652080580926",
  "token": "YOUR_NETGSM_STATIC_TOKEN"
}
```

### Example — santral dinleme inbound

```json
{
  "pbx_num": "850304XXXX",
  "unique_id": "1428481992.3556",
  "scenario": "Inbound_call",
  "customer_num": "05329876543",
  "talktime": 45,
  "token": "YOUR_NETGSM_STATIC_TOKEN"
}
```

### Example — queue-only (no lead)

```json
{
  "queue_name": "850XXXXXXX-queue-Destek",
  "scenario": "Queue",
  "timestamp": "1652080580926"
}
```

---

## 6. Lead creation gate (`shouldCreateLead`)

Logic in `normalizeNetGsmPayload()`:

**Create lead when ANY of:**

1. `scenario` (lowercase) **`=== 'cdr'`** — typical production CDR, **or**
2. **Call outcome path:** caller phone present **AND** (`duration` present **OR** CDR **OR** hangup scenario) **AND** `externalId` present

**Hangup scenarios:** `hangup`, `*hangup` suffix.

**Do NOT enter the processor as a new lead when:**

- `scenario: Queue` (or similar) without caller + id + outcome → **`skipped`** in webhook_logs
- Missing `arayan` / resolved caller phone on a payload that passed the gate → processor logs error + Telegram; no lead
- Company-line CDR matches an existing lead → call log only (§7.1)

**Skip flag for webhook_logs:** `shouldSkipNetGsmLead()` mirrors `!shouldCreateLead` (and invalid token when token sent) → log status **`skipped`**, no processor run.

---

## 7. End-to-end processing

After `processNetGsm` passes validation and `shouldCreateLead`, processing branches on **company-line CDR matching** before any new lead is created.

```
normalizeNetGsmPayload
  → handleCdrForExistingLead (see §7.1)
       → matched? → write contact_history → return (webhook_logs success, no new lead)
  → buildNetGsmSourceDetails (channel: netgsm_call)
  → createLeadFromWebhook (see §7.2)
```

### 7.1 Company-line CDR path (existing lead)

**File:** `lib/webhooks/process-netgsm.ts` → `handleCdrForExistingLead()`

Runs when the normalized caller or callee matches the company line:

| Constant                          | Value               |
| --------------------------------- | ------------------- |
| `COMPANY_PHONE_NUMBER`            | `+90 212 909 52 44` |
| `COMPANY_PHONE_NUMBER_NORMALIZED` | `02129095244`       |

**Algorithm:**

1. Normalize `arayan` and `aranan` via `normalizePhone()`
2. If neither side is the company line → return `false` (fall through to new-lead path)
3. Resolve **lead phone** = the other party (not the company line)
4. Resolve **direction:** company is caller → `outbound`; company is callee → `inbound`
5. `findLeadByPhone(leadPhone)` — includes **archived** leads (`is_archived` filter not applied)
6. If no lead → return `false` (fall through to new-lead path)
7. If lead is archived → `unarchive_single_lead(uuid, manager_uuid: NULL)` (migration **0049** — audit note shows `system/CDR`)
8. Insert `contact_history` with:
   - `interaction_type: 'call'`
   - `interaction_source: 'netgsm'`
   - Turkish note, e.g. `15/05/2026 14.30'de aradı — 2 dk 5 sn` (Istanbul timezone; webhook receipt time — payload has no call timestamp)
   - `metadata`: direction, duration, caller, callee

**Does not run on this path:** new lead insert, assignment, SLA, DNI lookup/increment, `collected_data` write.

**Unarchive failure:** logged as warning; CDR write is still attempted.

### 7.2 New lead creation path

When company-line CDR does not match (or no lead exists for that phone):

```
createLeadFromWebhook
  → normalizePhone(arayan)
  → dedupe by phone (record duplicate if active lead exists)
  → insert leads (lead_source: netgsm_call)
  → insert lead_details
  → insert contact_history (see §7.3 — new-lead quirk)
  → buildCollectedDataRow + persistCollectedData (DNI lookup)
  → incrementDniLeadCount(aranan) when channel netgsm_call
  → assignLead + calculateSlaDeadline (see §7.5)
  → Telegram if unassigned / failures
```

### 7.3 `contact_history` — two behaviors

**Company-line CDR path (§7.1):** correct types — `interaction_type: 'call'`, `interaction_source: 'netgsm'`.

**New lead path** — known quirk in `lib/leads/create-lead.ts`:

```typescript
interaction_type: input.leadSource.includes('call') ? 'whatsapp_call' : 'message_received';
```

Because `leadSource` is `netgsm_call`, the **first** contact history row on new lead creation is stored as **`whatsapp_call`**, not `call`. Analytics or filters keyed on `interaction_type` should account for this on the create path only.

**Duplicate submission:** `interaction_type: 'duplicate_submission'`, `interaction_source: netgsm`.

### 7.4 `source_details` shape (new lead path only)

Built by `buildNetGsmSourceDetails()`:

| Field                  | Value                                                  |
| ---------------------- | ------------------------------------------------------ |
| `channel`              | `netgsm_call`                                          |
| `external_id`          | `kimlik` / `unique_id` / fallback `netgsm_{timestamp}` |
| `called_number`        | Raw `aranan` string                                    |
| `call_duration`        | Seconds                                                |
| `normalization_failed` | false after successful phone normalize                 |

### 7.5 SLA

**All lead sources** share the same SLA calculation in `lib/leads/sla.ts` (the `_leadSource` parameter is retained for call-site compatibility but **not used**):

| Setting           | Value                                                                                                                         |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Standard deadline | **60 minutes** from SLA start (`SLA_DEADLINE_MINUTES`)                                                                        |
| Peak season       | **30 minutes** when `PEAK_SEASON_ACTIVE = true` in `lib/constants.ts`                                                         |
| Business hours    | Counting starts 09:00–17:00 Istanbul only; leads before 09:00 defer to 09:00 same day; at/after 17:00 defer to 09:00 next day |
| `sla_status`      | `on_time` or `breached` only (`at_risk` removed in migration **0050**)                                                        |

NetGSM new leads get the same 60-minute SLA as WhatsApp and other sources — not a separate 5-minute window.

### 7.6 Deduplication

Same phone as existing **active** (non-archived) lead → **duplicate** path: no new lead; `contact_history` notes duplicate submission with `interaction_source: netgsm`.

**Archived leads are not dedup matches.** A returning caller may get a new lead — unless company-line CDR finds the archived lead first and unarchives it (§7.1).

---

## 8. DNI (Dynamic Number Insertion) integration

NetGSM **new lead creation** is the **only live path** that increments DNI stats without a browser session. Company-line CDR logging (§7.1) does **not** increment DNI or write `collected_data`.

### Data model

Table: `dni_numbers` (migration `0035`)

| Column                       | Purpose                                                                     |
| ---------------------------- | --------------------------------------------------------------------------- |
| `virtual_number`             | NetGSM virtual number (unique)                                              |
| `source`                     | Traffic source slug (`google-ads`, `meta-ads`, `organic`, site-specific, …) |
| `is_active`                  | Must be `true` for GTM list + matching                                      |
| `lead_count`, `last_lead_at` | Incremented on **new lead** create only (not company-line CDR path)         |

Admin UI: `/admin/dni-numbers` (**superadmin only**).

Public API for GTM: `GET /api/dni/numbers` — active rows only, **1 hour cache**.

### Matching algorithm

`lib/dni/normalize-virtual-number.ts` → `virtualNumbersMatch(a, b)`:

- Strip non-digits
- Normalize `0850…` → `90850…` (12-digit Turkey format)
- Compare digit strings

Used in:

- `lookupDniSource(calledNumber)` → sets `collected_data.utm_source` from DNI `source`, `utm_medium = virtual-number`
- `incrementDniLeadCount(calledNumber)` → bumps counter on matching row

### Attribution confidence (Phase 4)

When DNI matches:

| Field               | Value                                    |
| ------------------- | ---------------------------------------- |
| `source_confidence` | `inferred`                               |
| `path_lost_at`      | `lost_at_source`                         |
| GA4 enrichment      | **Not run** (no `ref_code` from browser) |

### DNI caveats

| Issue                     | Detail                                                                                                                                                                                                                                                                             |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`aranan` queue suffix** | CDR may send `850304567890-queue-MusteriHizmetleri`. Digit extraction usually keeps the number portion, but **format mismatches** (`850…` vs `+90850…` vs `0850…`) can fail match if admin stored a different format than NetGSM sends. **Always verify with a real CDR payload.** |
| **Inactive DNI rows**     | No attribution; `lead_count` not incremented                                                                                                                                                                                                                                       |
| **Cache lag**             | Deactivated numbers visible on marketing sites up to **1 hour**                                                                                                                                                                                                                    |
| **Placeholder seeds**     | Migrations seed `+90850000000x` as **inactive** until real NetGSM numbers configured                                                                                                                                                                                               |

### GTM ↔ NetGSM loop

```
Browser loads marketing site
  → GTM fetches GET /api/dni/numbers
  → Swaps displayed phone to virtual_number per source
Prospect calls virtual number
  → NetGSM CDR POST with aranan = that number
  → CRM matches dni_numbers → utm_source on collected_data
```

---

## 9. Idempotency & `webhook_logs`

### Idempotency key

`netgsmIdempotencyKey()` in `lib/webhooks/idempotency-key.ts`:

1. Prefer: `netgsm_{externalId}` when `kimlik` / `unique_id` present
2. Fallback: `netgsm_{callerPhone}_{scenario}_{duration}`

Duplicate keys → **silent no-op** (claim returns `duplicate`).

### Log row lifecycle

| Status    | Meaning                                                                                 |
| --------- | --------------------------------------------------------------------------------------- |
| `success` | Processor completed without throw — new lead, duplicate, **or** company-line CDR logged |
| `skipped` | Queue/ring-only, or `!shouldCreateLead` — **not replayable**                            |
| `failed`  | Processor threw — Telegram alert + **replay eligible**                                  |

**UI:** `/webhook-logs` (manager+). Pre-2026-05-26 UI filtered failed-only; successful NetGSM tests appear as `success`.

### Replay

`lib/webhooks/replay-webhook-log.ts`:

- **Only** `status = failed`
- Re-invokes `processNetGsm(stored payload)` — **does not re-run HTTP auth**
- Updates log to `success` or `failed`

Skipped CDR misconfigurations cannot be replayed; fix NetGSM binding and wait for next call (or manual curl).

### Missing idempotency key

If key is null, processor still runs but **without** log claim — error logged to console.

---

## 10. HTTP response & error behavior

| Condition                    | HTTP | webhook_logs           | Lead               |
| ---------------------------- | ---- | ---------------------- | ------------------ |
| Invalid JSON / verify throws | 401  | No row                 | No                 |
| Wrong token                  | 401  | No row                 | No                 |
| Missing token (caveat)       | 200  | Yes (if key derivable) | Maybe              |
| Skipped event                | 200  | `skipped`              | No                 |
| Success (new lead)           | 200  | `success`              | Yes (or duplicate) |
| Success (CDR on existing)    | 200  | `success`              | No — call log only |
| Processor throw              | 200  | `failed`               | No                 |

**Why always 200 after auth:** NetGSM may not retry on 5xx; CRM prefers logging + Telegram over failing the HTTP layer. Check logs, not HTTP status alone.

**Telegram alerts:**

- Validation failure (`NetGsmPayloadSchema` — effectively never fails on shape)
- Missing caller on CDR path
- Webhook processing failure (with log id)
- Lead creation failed after 3 retries

---

## 11. Environment & secrets

| Variable              | Required | Where                               |
| --------------------- | -------- | ----------------------------------- |
| `NETGSM_STATIC_TOKEN` | Yes      | Wrangler (prod), `.env.local` (dev) |

Related (not NetGSM-specific but used in same pipeline):

| Variable                    | Purpose                                |
| --------------------------- | -------------------------------------- |
| `SUPABASE_SERVICE_ROLE_KEY` | Lead insert, DNI queries, webhook_logs |
| `TELEGRAM_*`                | Failure alerts                         |

Verify prod secret:

```bash
pnpm exec wrangler secret list
# Should include NETGSM_STATIC_TOKEN
```

---

## 12. Production smoke tests

From any machine with the token:

### 12.1 New inbound call (DNI virtual number)

Creates a lead (unless phone dedupes against an active lead):

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

**Expect:** HTTP **200**, `webhook_logs.status=success`, new lead with `lead_source=netgsm_call`.

### 12.2 Company-line CDR (existing lead)

Logs a call on an existing lead — **no new lead**. Use a phone that already exists in `leads.lead_phone`:

```bash
TOKEN=$(grep '^NETGSM_STATIC_TOKEN=' .env.local | cut -d= -f2-)

curl -i -X POST https://panel.marketinguni.app/api/webhooks/netgsm \
  -H "Content-Type: application/json" \
  -d "{
    \"scenario\": \"cdr\",
    \"kimlik\": \"smoke-cdr-$(date +%s)\",
    \"arayan\": \"05554443322\",
    \"aranan\": \"02129095244\",
    \"sure\": 125,
    \"token\": \"$TOKEN\"
  }"
```

**Expect:** HTTP **200**, `webhook_logs.status=success`, new `contact_history` row with `interaction_type=call` for the matching lead (unarchives if lead was archived).

See also `test-webhooks.mjs` for a scripted sequence including this CDR case.

### SQL checks

```sql
SELECT id, status, event_type, created_at
FROM webhook_logs
WHERE source = 'netgsm'
ORDER BY created_at DESC
LIMIT 10;

-- After company-line CDR smoke test:
SELECT interaction_type, interaction_source, notes, created_at
FROM contact_history
WHERE lead_uuid = '<existing-lead-uuid>'
ORDER BY created_at DESC
LIMIT 5;
```

---

## 13. Troubleshooting decision tree

```
Live call → no webhook_logs row?
  ├─ curl smoke fails → token / URL / Cloudflare / CRM deploy
  └─ curl OK → NetGSM not POSTing on call path (CDR binding) → NetGSM support

webhook_logs row exists?
  ├─ status=skipped → Queue/ring event or missing kimlik+caller; check scenario in payload
  ├─ status=failed → /webhook-logs replay; read error_message; Telegram
  └─ status=success but no new lead
       ├─ Company-line CDR matched existing lead → check contact_history (interaction_type=call)
       ├─ Duplicate active phone → duplicate_submission in contact_history
       └─ Else → check application logs

Lead created but wrong/missing attribution?
  ├─ aranan in payload vs dni_numbers.virtual_number (format)
  ├─ dni_numbers.is_active = true?
  └─ queue suffix / digit normalization — compare raw payload in webhook_logs.payload

curl works, live calls don't?
  → §2 NetGSM dashboard — CDR HTTP not bound to that number's hangup event
```

---

## 14. Code reference map

| Concern                   | File                                                                                                                                         |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| API route                 | `pages/api/webhooks/netgsm.ts`                                                                                                               |
| Payload normalization     | `lib/webhooks/normalize-netgsm-payload.ts`                                                                                                   |
| Processor + CDR matching  | `lib/webhooks/process-netgsm.ts` → `handleCdrForExistingLead`, `writeCdrToContactHistory`                                                    |
| Company phone constants   | `lib/constants.ts` → `COMPANY_PHONE_NUMBER`, `COMPANY_PHONE_NUMBER_NORMALIZED`                                                               |
| Token verify              | `lib/webhooks/verify.ts`                                                                                                                     |
| Idempotency               | `lib/webhooks/idempotency-key.ts`                                                                                                            |
| Webhook log wrapper       | `lib/webhooks/run-with-webhook-log.ts`                                                                                                       |
| Replay                    | `lib/webhooks/replay-webhook-log.ts`                                                                                                         |
| Lead creation             | `lib/leads/create-lead.ts`                                                                                                                   |
| Archive / unarchive (CDR) | `lib/leads/archive.ts`; SQL `unarchive_single_lead` (migration **0049**)                                                                     |
| SLA                       | `lib/leads/sla.ts`                                                                                                                           |
| Source details            | `lib/leads/source-details.ts` → `buildNetGsmSourceDetails`                                                                                   |
| DNI lookup / increment    | `lib/dni/list-active-numbers.ts`                                                                                                             |
| DNI normalize             | `lib/dni/normalize-virtual-number.ts`                                                                                                        |
| Attribution               | `lib/attribution/build-collected-data.ts`                                                                                                    |
| Scripted webhook tests    | `test-webhooks.mjs`                                                                                                                          |
| Unit tests                | `__tests__/lib/netgsm-normalize.test.ts`, `__tests__/lib/dni-normalize.test.ts`, `__tests__/lib/verify.test.ts`, `__tests__/lib/sla.test.ts` |

---

## 15. Checklist — new environment or new virtual number

- [ ] `NETGSM_STATIC_TOKEN` set in Wrangler (prod) and matches NetGSM JSON `token`
- [ ] NetGSM HTTP POST URL = `https://panel.marketinguni.app/api/webhooks/netgsm`
- [ ] CDR / santral dinleme fires **after hangup** with `scenario`, `arayan`, `kimlik`, `sure`
- [ ] Superadmin activated DNI row with **exact** virtual number format from a real CDR `aranan`
- [ ] Smoke curl (§12.1) returns 200 + `webhook_logs.success` + new lead
- [ ] Company-line CDR curl (§12.2) logs `contact_history` on existing lead without creating duplicate
- [ ] Test live call produces log row (not just curl)
- [ ] GTM DNI tag loads `/api/dni/numbers` and shows new number (allow 1h cache after changes)
- [ ] Confirm `collected_data.utm_source` on test lead matches DNI `source`

---

## 16. Related database tables

| Table             | NetGSM role                                                                        |
| ----------------- | ---------------------------------------------------------------------------------- |
| `leads`           | `lead_source = netgsm_call` on new lead path; unarchived on company-line CDR       |
| `lead_details`    | Empty row on new lead create only                                                  |
| `contact_history` | CDR call logs (`call`); new-lead first contact (`whatsapp_call` quirk); duplicates |
| `collected_data`  | DNI-derived UTM + confidence (new lead path only)                                  |
| `webhook_logs`    | Full payload audit                                                                 |
| `dni_numbers`     | Virtual number → source mapping + metrics (increment on new lead only)             |

No NetGSM-specific tables — all data lands in shared lead pipeline tables.
