# NetGSM Integration — Connection Details & System Reference

**Last updated:** 2026-05-28  
**Production endpoint:** `POST https://panel.marketinguni.app/api/webhooks/netgsm`  
**Related:** [`runbook.md` §4 NetGSM](./runbook.md), [`engineering-handoff.md`](./engineering-handoff.md)

This document covers **every NetGSM touchpoint in Univotel CRM**: how calls become leads, how authentication works (including caveats), payload normalization, DNI attribution, idempotency, logging, replay, and production troubleshooting.

---

## 1. What NetGSM does in this system

NetGSM is the **GSM voice call ingestion channel**. When a prospect calls a marketing virtual number (DNI) or the main santral line, NetGSM sends an HTTP POST to the CRM. The CRM:

1. Authenticates the request (static token in JSON body)
2. Normalizes Turkish field names (`arayan`, `aranan`, `sure`, `kimlik`)
3. Decides whether the event represents a **completed call worth a lead**
4. Creates a lead with `lead_source = netgsm_call` and **5-minute SLA**
5. Matches `aranan` (called number) to **`dni_numbers`** for marketing attribution
6. Writes **`webhook_logs`** for audit and optional replay

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
       → processNetGsm → createLeadFromWebhook
       → finalizeWebhookLog (success | failed)
  → res.status(200)
```

Implementation: `lib/webhooks/create-webhook-handler.ts`, `lib/webhooks/run-with-webhook-log.ts`.

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

**Do NOT create lead when:**

- `scenario: Queue` (or similar) without caller + id + outcome
- Missing `arayan` / resolved caller phone on a CDR that passed gate
- Token mismatch inside processor (logged, no lead)

**Skip flag for webhook_logs:** `shouldSkipNetGsmLead()` mirrors `!shouldCreateLead` (and invalid token when token sent) → log status **`skipped`**, no processor run.

---

## 7. End-to-end lead pipeline

After `processNetGsm` approves the payload:

```
normalizeNetGsmPayload
  → buildNetGsmSourceDetails (channel: netgsm_call)
  → createLeadFromWebhook
       → normalizePhone(arayan)
       → dedupe by phone (record duplicate if exists)
       → insert leads (lead_source: netgsm_call)
       → insert lead_details
       → insert contact_history (see §7.1 quirk)
       → buildCollectedDataRow + persistCollectedData (DNI lookup)
       → incrementDniLeadCount(aranan) if channel netgsm_call
       → assignLead + SLA (5 min)
       → Telegram if unassigned / failures
```

### 7.1 Known quirk — `contact_history.interaction_type`

In `lib/leads/create-lead.ts`:

```typescript
interaction_type: input.leadSource.includes('call') ? 'whatsapp_call' : 'message_received';
```

Because `leadSource` is `netgsm_call`, first contact history row is stored as **`whatsapp_call`**, not a NetGSM-specific type. Analytics or filters keyed on interaction type should account for this.

### 7.2 `source_details` shape

Built by `buildNetGsmSourceDetails()`:

| Field                  | Value                                                  |
| ---------------------- | ------------------------------------------------------ |
| `channel`              | `netgsm_call`                                          |
| `external_id`          | `kimlik` / `unique_id` / fallback `netgsm_{timestamp}` |
| `called_number`        | Raw `aranan` string                                    |
| `call_duration`        | Seconds                                                |
| `normalization_failed` | false after successful phone normalize                 |

### 7.3 SLA

From `lib/constants.ts`:

| Source        | Deadline      | At-risk offset |
| ------------- | ------------- | -------------- |
| `netgsm_call` | **5 minutes** | 2 minutes      |

Peak season overrides apply via `isPeakSeasonActive()`.

### 7.4 Deduplication

Same phone as existing active lead → **duplicate** path: no new lead; `contact_history` notes duplicate submission with `interaction_source: netgsm`.

---

## 8. DNI (Dynamic Number Insertion) integration

NetGSM calls are the **only live path** that increments DNI stats without a browser session.

### Data model

Table: `dni_numbers` (migration `0035`)

| Column                       | Purpose                                                                     |
| ---------------------------- | --------------------------------------------------------------------------- |
| `virtual_number`             | NetGSM virtual number (unique)                                              |
| `source`                     | Traffic source slug (`google-ads`, `meta-ads`, `organic`, site-specific, …) |
| `is_active`                  | Must be `true` for GTM list + matching                                      |
| `lead_count`, `last_lead_at` | Incremented on successful NetGSM lead create                                |

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

| Status    | Meaning                                                       |
| --------- | ------------------------------------------------------------- |
| `success` | Lead pipeline completed (or processor returned without throw) |
| `skipped` | Queue/ring-only, or `!shouldCreateLead` — **not replayable**  |
| `failed`  | Processor threw — Telegram alert + **replay eligible**        |

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
| Success                      | 200  | `success`              | Yes (or duplicate) |
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

## 12. Production smoke test

From any machine with the token:

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

**Expect:**

- HTTP **200**
- New row in `webhook_logs`: `source=netgsm`, `status=success`, `event_type=cdr`
- New lead with `lead_source=netgsm_call` (unless phone dedupes)

**SQL check:**

```sql
SELECT id, status, event_type, created_at
FROM webhook_logs
WHERE source = 'netgsm'
ORDER BY created_at DESC
LIMIT 10;
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
  └─ status=success but no lead → duplicate phone; or processor returned early (check logs)

Lead created but wrong/missing attribution?
  ├─ aranan in payload vs dni_numbers.virtual_number (format)
  ├─ dni_numbers.is_active = true?
  └─ queue suffix / digit normalization — compare raw payload in webhook_logs.payload

curl works, live calls don't?
  → §2 NetGSM dashboard — CDR HTTP not bound to that number's hangup event
```

---

## 14. Code reference map

| Concern                | File                                                                                                            |
| ---------------------- | --------------------------------------------------------------------------------------------------------------- |
| API route              | `pages/api/webhooks/netgsm.ts`                                                                                  |
| Payload normalization  | `lib/webhooks/normalize-netgsm-payload.ts`                                                                      |
| Processor              | `lib/webhooks/process-netgsm.ts`                                                                                |
| Token verify           | `lib/webhooks/verify.ts`                                                                                        |
| Idempotency            | `lib/webhooks/idempotency-key.ts`                                                                               |
| Webhook log wrapper    | `lib/webhooks/run-with-webhook-log.ts`                                                                          |
| Replay                 | `lib/webhooks/replay-webhook-log.ts`                                                                            |
| Lead creation          | `lib/leads/create-lead.ts`                                                                                      |
| Source details         | `lib/leads/source-details.ts` → `buildNetGsmSourceDetails`                                                      |
| DNI lookup / increment | `lib/dni/list-active-numbers.ts`                                                                                |
| DNI normalize          | `lib/dni/normalize-virtual-number.ts`                                                                           |
| Attribution            | `lib/attribution/build-collected-data.ts`                                                                       |
| Tests                  | `__tests__/lib/netgsm-normalize.test.ts`, `__tests__/lib/dni-normalize.test.ts`, `__tests__/lib/verify.test.ts` |

---

## 15. Checklist — new environment or new virtual number

- [ ] `NETGSM_STATIC_TOKEN` set in Wrangler (prod) and matches NetGSM JSON `token`
- [ ] NetGSM HTTP POST URL = `https://panel.marketinguni.app/api/webhooks/netgsm`
- [ ] CDR / santral dinleme fires **after hangup** with `scenario`, `arayan`, `kimlik`, `sure`
- [ ] Superadmin activated DNI row with **exact** virtual number format from a real CDR `aranan`
- [ ] Smoke curl returns 200 + `webhook_logs.success`
- [ ] Test live call produces log row (not just curl)
- [ ] GTM DNI tag loads `/api/dni/numbers` and shows new number (allow 1h cache after changes)
- [ ] Confirm `collected_data.utm_source` on test lead matches DNI `source`

---

## 16. Related database tables

| Table             | NetGSM role                               |
| ----------------- | ----------------------------------------- |
| `leads`           | `lead_source = netgsm_call`               |
| `lead_details`    | Empty row on create                       |
| `contact_history` | First contact + duplicate notes           |
| `collected_data`  | DNI-derived UTM + confidence              |
| `webhook_logs`    | Full payload audit                        |
| `dni_numbers`     | Virtual number → source mapping + metrics |

No NetGSM-specific tables — all data lands in shared lead pipeline tables.
