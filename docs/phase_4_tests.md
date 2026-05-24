# Univotel CRM — Phase 4 Integration Test Tracker

> Tests in this file require **real external services** — they cannot be run with mocks.
> Each test documents what real data is needed, what to check, and what pass/fail looks like.
> Mark status as `[ ]` pending, `[x]` passed, `[!]` failed.

---

## Prerequisites Before Any Test

Before running any test below, confirm the following are in place:

- [ ] Migrations 0033–0037 applied on Supabase production
- [ ] `GOOGLE_SERVICE_ACCOUNT_JSON` set as Wrangler secret
- [ ] `GA4_PROPERTY_ID` set as Wrangler secret
- [ ] `ref_code` custom dimension created in GA4 (event scope)
- [ ] At least one active row in `dni_numbers` table
- [ ] GTM container published on univotel.com with all Phase 4 tags
- [ ] Meta `referral` webhook field subscribed (Emre)
- [ ] NetGSM webhook URL pointing to `panel.marketinguni.app/api/webhooks/netgsm`

---

## 1. REF Endpoint

### T1.1 — REF generation from browser

**How to test:** Open `https://univotel.com?utm_source=google&utm_medium=cpc&utm_campaign=test` in a browser with no ad blocker.

**What to check:**

- Network tab in DevTools shows a GET request to `panel.marketinguni.app/api/ref/generate`
- Response contains `{ "ref": "UV-XXXX" }`
- `sessionStorage.getItem('uv_ref')` returns the REF code in the browser console
- A row exists in `ref_sessions` table in Supabase with matching ref_code and UTM values

**Pass:** REF generated, stored in sessionStorage, row in ref_sessions with correct utm_source=google, utm_medium=cpc.
**Fail:** Network request fails, 403 CORS error, ref_sessions row missing or UTM values wrong.

---

### T1.2 — REF not regenerated on same session

**How to test:** Navigate to a second page on univotel.com in the same tab.

**What to check:**

- No second request to /api/ref/generate in Network tab
- sessionStorage still contains the same REF from T1.1

**Pass:** Single REF per session.
**Fail:** New REF generated on every page.

---

### T1.3 — CORS rejection from unlisted origin

**How to test:** Run in browser console from any site NOT in the allowed origins list:

```javascript
fetch('https://panel.marketinguni.app/api/ref/generate?utm_source=test')
  .then((r) => console.log(r.status))
  .catch((e) => console.log('blocked:', e));
```

**Pass:** CORS error in console, request blocked.
**Fail:** Request succeeds from unlisted origin.

---

### T1.4 — REF generation from side domain

**How to test:** Visit `https://ituyurt.com` and check Network tab.

**What to check:**

- Request to /api/ref/generate includes `referral_domain=ituyurt.com`
- ref_sessions row has referral_domain populated

**Pass:** referral_domain correctly captured.
**Fail:** referral_domain missing or wrong.

---

## 2. Dynamic Number Insertion (DNI)

### T2.1 — Google Ads visitor sees Google Ads virtual number

**How to test:** Open `https://univotel.com?utm_source=google&utm_medium=cpc` and inspect the phone number displayed on the page.

**What to check:**

- Displayed number matches the `google-ads` row in `dni_numbers` table
- Network tab shows request to `/api/dni/numbers`

**Pass:** Correct virtual number displayed.
**Fail:** Default number shown, or wrong number displayed.

---

### T2.2 — Organic visitor sees organic virtual number

**How to test:** Open `https://univotel.com` with no UTM parameters.

**What to check:** Number displayed matches `organic` row in `dni_numbers`.

**Pass:** Organic number shown.
**Fail:** Any other number or no swap.

---

### T2.3 — DNI cache behavior

**How to test:** Load the page, note the number. In Supabase, toggle `is_active = false` on one entry. Reload the page within 1 minute.

**What to check:** Old number still shown (cache is valid).

**Pass:** Cache respected — no immediate change.
**Fail:** Number changes instantly, suggesting cache not working.

---

### T2.4 — DNI lead_count increment

**How to test:** Call the NetGSM virtual number assigned to `google-ads`. Wait for CDR webhook.

**What to check:**

- Lead created in CRM
- `dni_numbers` row for `google-ads` has `lead_count` incremented by 1
- `last_lead_at` updated

**Pass:** lead_count correct.
**Fail:** lead_count unchanged after verified call.

---

## 3. WhatsApp Message — Full Attribution Path

### T3.1 — REF arrives in WA Cloud API payload

**Prerequisite:** Meta `referral` webhook field must be subscribed.

**How to test:**

1. Open `https://univotel.com?utm_source=google&utm_medium=cpc` in a real browser (not incognito — need sessionStorage).
2. Wait for REF to be generated (check sessionStorage for `uv_ref`).
3. Click the "Mesaj at" button — this opens WhatsApp with the dynamic link.
4. Send any message from WhatsApp.

**What to check in Supabase:**

- New lead created
- `collected_data` row exists for the lead
- `collected_data.ref_code` matches the REF from sessionStorage
- `collected_data.utm_source = 'google'`
- `collected_data.utm_medium = 'cpc'`
- `collected_data.source_confidence = 'full'`
- `collected_data.channel = 'whatsapp'`
- `webhook_logs` shows successful Chatwoot `conversation_created` event

**Pass:** All fields populated correctly, source_confidence = full.
**Fail:** ref_code missing, UTM null, source_confidence not full.

---

### T3.2 — GA4 enrichment completes

**How to test:** After T3.1, wait up to 15 minutes.

**What to check:**

- `collected_data.ga4_enriched = true`
- `collected_data.ga4_session_id` is not null
- `collected_data.ga4_enriched_at` has a timestamp
- `collected_data.path_lost_at = 'full'`

**Pass:** GA4 enrichment succeeded within 15 minutes.
**Fail:** ga4_enriched still false after 15 min — check ga4_fetch_attempts (should be > 1 if retrying).

**Debug queries:**

```sql
SELECT ref_code, ga4_enriched, ga4_fetch_attempts, ga4_enriched_at, path_lost_at
FROM collected_data
WHERE ref_code = 'UV-XXXX';
```

---

### T3.3 — GA4 retry on delayed session

**How to test:** Send a WA message immediately after page load (before GA4 has written the session). Check ga4_fetch_attempts over time.

**What to check:**

- ga4_fetch_attempts increments: 0 → 1 → 2 → eventually enriched
- Final state: ga4_enriched = true (may take up to 15 min)

**Pass:** Retries occur, eventual enrichment succeeds.
**Fail:** ga4_fetch_attempts stays at 0, or hits 4 without enrichment on a known-good session.

---

### T3.4 — GA4 enrichment gives up after 4 attempts

**How to test:** Simulate by creating a lead with a REF that does not exist in GA4 (e.g., manually insert a ref_sessions row with a fake REF, then trigger a webhook with that REF).

**What to check:**

- ga4_fetch_attempts reaches 4
- ga4_enriched remains false
- path_lost_at = 'lost_at_session'
- source_confidence = 'inferred'
- No Telegram alert fired (this is not an error condition)

**Pass:** Graceful give-up after 4 attempts, correct field values.
**Fail:** Keeps retrying beyond 4, or throws an error, or fires Telegram alert.

---

## 4. NetGSM Call — Lossy Attribution Path

### T4.1 — Inbound GSM call creates lead with source attribution

**How to test:** Call the NetGSM virtual number assigned to `google-ads` from a real mobile phone.

**What to check:**

- CDR webhook arrives at `/api/webhooks/netgsm`
- `webhook_logs` row created with status = success
- Lead created with:
  - `lead_source = 'netgsm_call'`
  - `lead_phone` = normalized calling number
- `collected_data` row:
  - `called_number` = the virtual number called
  - `source_confidence = 'inferred'`
  - `path_lost_at = 'lost_at_source'`
  - `utm_source` = null (no session data)
  - `channel = 'netgsm_call'`

**Pass:** Lead created, source inferred from virtual number, path_lost_at correct.
**Fail:** Lead not created, called_number missing, source_confidence = unknown instead of inferred.

**Debug:**

```sql
SELECT arayan_no, aranan_no, arama_id FROM webhook_logs
WHERE source = 'netgsm' ORDER BY created_at DESC LIMIT 5;
```

---

### T4.2 — NetGSM payload field verification

**How to test:** Same as T4.1. Check the raw payload in webhook_logs.

**What to check in webhook_logs.payload:**

- `arayan_no` field present and in 05xx format
- `aranan_no` field present — should match a virtual number in dni_numbers
- `arama_id` field present and unique
- `sure` field — verify if call duration is included (may or may not be present)
- `token` field matches NETGSM_STATIC_TOKEN

**Pass:** All expected fields present.
**Fail:** Missing fields — update NetGsmPayloadSchema accordingly.

> **Note:** `sure` (call duration) is not confirmed in NetGSM documentation. This test verifies whether it arrives. If absent, `call_duration` in collected_data stays null and that is acceptable.

---

## 5. Meta Ads → WhatsApp — Full Attribution

### T5.1 — Click-to-WhatsApp ad attribution

**Prerequisite:** An active Meta Ads campaign with Click-to-WhatsApp objective.

**How to test:** Click a real Meta ad on Instagram or Facebook from a test device. Send a WhatsApp message.

**What to check in collected_data:**

- `ad_id` populated
- `campaign_id` populated
- `placement` populated (instagram_feed, facebook_feed etc.)
- `source_confidence = 'full'`
- `path_lost_at = 'full'`
- `utm_source` = null (this path does not go through univotel.com)
- `ref_code` = null

**Pass:** Meta referral object fully populated, source_confidence = full.
**Fail:** ad_id null — Meta `referral` webhook field not subscribed. Check with Emre.

---

## 6. Cross-Domain Tracking

### T6.1 — Side domain to univotel.com session continuity

**How to test:**

1. Visit `https://ituyurt.com` in a real browser.
2. Click any backlink to univotel.com.
3. Check Network tab on univotel.com page load.

**What to check:**

- URL contains `_gl=` parameter when arriving at univotel.com
- GA4 treats both pages as the same session (verify in GA4 DebugView)
- ref_sessions row created with `referral_domain = 'ituyurt.com'`

**Pass:** `_gl` parameter present, single GA4 session spans both domains.
**Fail:** `_gl` missing, new session started on univotel.com, referral_domain missing.

---

### T6.2 — Side domain cross-domain lead attribution

**How to test:** Complete T6.1, then click "Mesaj at" on univotel.com and send a WA message.

**What to check in collected_data:**

- `referral_domain = 'ituyurt.com'`
- `utm_medium = 'organic'` (assuming organic traffic to ituyurt)
- `source_confidence = 'full'`

**Pass:** Full cross-domain attribution captured.
**Fail:** referral_domain null, session broken at domain boundary.

---

## 7. superadmin Role

### T7.1 — superadmin can access dni_numbers

**How to test:** Log in as a superadmin user. Navigate to `/admin/dni-numbers`.

**What to check:**

- Page loads and shows dni_numbers table
- Can toggle is_active
- Can add a new number
- lead_count is correct

**Pass:** Full CRUD works for superadmin.
**Fail:** 403 on page load, or CRUD operations fail.

---

### T7.2 — Manager cannot access dni_numbers

**How to test:** Log in as a manager user. Navigate to `/admin/dni-numbers`.

**Pass:** Redirected or 403 shown.
**Fail:** Page loads for manager — RLS not enforced.

---

### T7.3 — superadmin sees all leads

**How to test:** Log in as superadmin. Navigate to /leads.

**What to check:** All leads visible (same as manager behavior).

**Pass:** All leads visible.
**Fail:** Only own leads or no leads visible.

---

## 8. my_leads for Manager

### T8.1 — Manager sees own assigned leads at /leads/my

**How to test:** Assign a lead to a manager account. Log in as that manager. Navigate to /leads/my.

**What to check:** Lead appears in the list.

**Pass:** Lead visible.
**Fail:** Empty list or 403.

---

## 9. End-to-End Attribution Summary

After completing T3.1, T3.2, T4.1, T5.1 — run this query to verify the attribution table is correctly populated across all paths:

```sql
SELECT
  channel,
  source_confidence,
  path_lost_at,
  COUNT(*) as lead_count,
  SUM(CASE WHEN ga4_enriched THEN 1 ELSE 0 END) as ga4_enriched_count
FROM collected_data
GROUP BY channel, source_confidence, path_lost_at
ORDER BY channel, source_confidence;
```

**Expected results after all tests:**

| channel     | source_confidence | path_lost_at   | Notes           |
| ----------- | ----------------- | -------------- | --------------- |
| whatsapp    | full              | full           | T3.1 + T3.2     |
| netgsm_call | inferred          | lost_at_source | T4.1            |
| whatsapp    | full              | full           | T5.1 (Meta Ads) |

---

## 10. Regression Tests

These existing Phase 1–3 behaviors must still work after Phase 4 deploy.

### T10.1 — Chatwoot webhook still creates leads

**How to test:** Send a WhatsApp message to the Univotel number from a new phone number (not previously in the system).

**Pass:** Lead appears in CRM within 30 seconds.
**Fail:** No lead created.

---

### T10.2 — SLA alerts still fire

**How to test:** Create a lead manually. Do not contact it. Wait for SLA breach (5 min for call source, 30 min for message source).

**Pass:** Telegram alert received.
**Fail:** No alert after breach time.

---

### T10.3 — source_details JSONB still written

**How to test:** After T3.1, check the leads row directly.

```sql
SELECT source_details FROM leads
WHERE uuid = '<lead_uuid_from_T3.1>';
```

**Pass:** source_details contains same data as collected_data row.
**Fail:** source_details null or diverges from collected_data.

---

## Known Acceptable Failures

These are not bugs — they are expected LOSSY behavior:

| Scenario                                            | Expected behavior                                                                     |
| --------------------------------------------------- | ------------------------------------------------------------------------------------- |
| Ad blocker blocks GTM                               | REF not generated, source_confidence = unknown. Acceptable.                           |
| Visitor generates REF but messages after long delay | ref_sessions row still available (no expiry). UTM attached if REF lookup succeeds.    |
| WA call (not message)                               | No session data possible. source_confidence = unknown. Acceptable.                    |
| IG organic → WA message                             | No Meta referral object. source_confidence = lossy or unknown. Acceptable.            |
| GA4 takes > 15 min to write session                 | ga4_fetch_attempts = 4, enrichment fails. path_lost_at = lost_at_session. Acceptable. |

---

## Open Items (Not Yet Testable)

| Item                       | Blocked by                                                     |
| -------------------------- | -------------------------------------------------------------- |
| T5.1 Meta Ads attribution  | Emre must subscribe `referral` webhook field in Meta dashboard |
| T4.1 `sure` field presence | Real call needed to confirm NetGSM sends call duration         |
| T6.x Cross-domain tracking | GTM containers must be installed on side domains               |
| T2.1–T2.4 DNI              | NetGSM virtual numbers must be purchased and configured        |

EOF
echo "Done"
