-- ============================================================================
-- FMS Academia test teardown — removes ONLY the placeholder leads from seed
-- ============================================================================
-- Run manually in Supabase SQL Editor after QA is complete.
-- Deletes exactly the 12 leads created by scripts/fms-academia-test-seed.sql.
-- Does NOT remove the Academia partner, property linkage, or room prices.
--
-- Match key: fixed UUIDs a0ca0001-0001-4001-8001-000000000101 .. 00000000010c
-- ============================================================================

BEGIN;

-- ── Guard: abort if any matched row is NOT a test lead ───────────────────────
DO $$
DECLARE
  v_bad int;
BEGIN
  SELECT count(*) INTO v_bad
  FROM leads
  WHERE uuid IN (
    'a0ca0001-0001-4001-8001-000000000101',
    'a0ca0001-0001-4001-8001-000000000102',
    'a0ca0001-0001-4001-8001-000000000103',
    'a0ca0001-0001-4001-8001-000000000104',
    'a0ca0001-0001-4001-8001-000000000105',
    'a0ca0001-0001-4001-8001-000000000106',
    'a0ca0001-0001-4001-8001-000000000107',
    'a0ca0001-0001-4001-8001-000000000108',
    'a0ca0001-0001-4001-8001-000000000109',
    'a0ca0001-0001-4001-8001-00000000010a',
    'a0ca0001-0001-4001-8001-00000000010b',
    'a0ca0001-0001-4001-8001-00000000010c'
  )
  AND coalesce(notes, '') <> 'FMS_ACADEMIA_TEST_SEED';

  IF v_bad > 0 THEN
    RAISE EXCEPTION
      'Teardown aborted: % lead(s) matched UUIDs but lack notes=FMS_ACADEMIA_TEST_SEED. '
      'Refusing to delete — investigate before re-running.',
      v_bad;
  END IF;
END $$;

-- ── 1. Finance audit rows tied to test finance / leads ───────────────────────
DELETE FROM finance_audit fa
WHERE fa.entity_id IN (
  SELECT lf.id FROM lead_finance lf
  WHERE lf.lead_id IN (
    'a0ca0001-0001-4001-8001-000000000101',
    'a0ca0001-0001-4001-8001-000000000102',
    'a0ca0001-0001-4001-8001-000000000103',
    'a0ca0001-0001-4001-8001-000000000104',
    'a0ca0001-0001-4001-8001-000000000105',
    'a0ca0001-0001-4001-8001-000000000106',
    'a0ca0001-0001-4001-8001-000000000107',
    'a0ca0001-0001-4001-8001-000000000108',
    'a0ca0001-0001-4001-8001-000000000109',
    'a0ca0001-0001-4001-8001-00000000010a',
    'a0ca0001-0001-4001-8001-00000000010b',
    'a0ca0001-0001-4001-8001-00000000010c'
  )
)
OR fa.entity_id IN (
  'a0ca0001-0001-4001-8001-000000000101',
  'a0ca0001-0001-4001-8001-000000000102',
  'a0ca0001-0001-4001-8001-000000000103',
  'a0ca0001-0001-4001-8001-000000000104',
  'a0ca0001-0001-4001-8001-000000000105',
  'a0ca0001-0001-4001-8001-000000000106',
  'a0ca0001-0001-4001-8001-000000000107',
  'a0ca0001-0001-4001-8001-000000000108',
  'a0ca0001-0001-4001-8001-000000000109',
  'a0ca0001-0001-4001-8001-00000000010a',
  'a0ca0001-0001-4001-8001-00000000010b',
  'a0ca0001-0001-4001-8001-00000000010c'
);

-- ── 2. Leads (cascades lead_details, lead_finance, tasks, visits, etc.) ────
DELETE FROM leads
WHERE uuid IN (
  'a0ca0001-0001-4001-8001-000000000101',
  'a0ca0001-0001-4001-8001-000000000102',
  'a0ca0001-0001-4001-8001-000000000103',
  'a0ca0001-0001-4001-8001-000000000104',
  'a0ca0001-0001-4001-8001-000000000105',
  'a0ca0001-0001-4001-8001-000000000106',
  'a0ca0001-0001-4001-8001-000000000107',
  'a0ca0001-0001-4001-8001-000000000108',
  'a0ca0001-0001-4001-8001-000000000109',
  'a0ca0001-0001-4001-8001-00000000010a',
  'a0ca0001-0001-4001-8001-00000000010b',
  'a0ca0001-0001-4001-8001-00000000010c'
)
AND notes = 'FMS_ACADEMIA_TEST_SEED';

COMMIT;

-- ── Verify (optional) ────────────────────────────────────────────────────────
-- SELECT count(*) FROM leads WHERE notes = 'FMS_ACADEMIA_TEST_SEED';  -- expect 0
-- SELECT * FROM fms_revenue_breakdown(false) WHERE partner_name = 'Academia';
