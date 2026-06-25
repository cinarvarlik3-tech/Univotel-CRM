-- ============================================================================
-- Migration 0097 — FMS season pricing + finance-row vacate ruleset
-- ============================================================================
-- Builds on 0096 (FMS finance layer). Adds:
--   * room_type_prices               month-bounded price periods per room type
--   * fms_price_for_month()          resolves the price for a given move-in month
--   * lead_finance.move_in_month     snapshot of the month that drove the frozen rate
--   * fms_create_finance_row() v2    now takes move_in_month, resolves seasonal price
--   * fms_record_finance_change() v2 same, for re-confirms / new contracts
--   * fn_vacate_finance_on_exit      VACATE rules (funnel-driven, archive-blind)
--   * fms_revenue_breakdown(bool)    include_kapora toggle for "kaporadakileri göster"
--
-- PRICING MODEL (confirmed against business rules):
--   * One frozen rate per contract. A stay spanning seasons = multiple contracts
--     (multiple finance rows). No mixed-rate months, no carried-over rates.
--   * Price is chosen by the customer's MOVE-IN MONTH (collected as YYYY-MM, not
--     an exact date). A September move-in pays the academic-season rate for the
--     whole contract.
--   * Seasons (3-month summer, 9-month academic) and annual inflation updates are
--     just rows in room_type_prices with different month ranges. N seasons, no
--     schema change ever.
--   * EVERY move-in month must be covered by a price period. If none covers it,
--     the kapora gate BLOCKS (no contract without a known rate).
--
-- VACATE MODEL (confirmed):
--   Vacate is a PURE FUNCTION OF FUNNEL TRANSITIONS. Archive (is_archived) is
--   IRRELEVANT and appears nowhere in vacate logic.
--     - Enter kapora             -> app code CREATES a fresh active row (idempotent
--                                   per active row: re-entry after a vacate makes a
--                                   NEW row).
--     - Lost (from any stage)    -> VACATE. Always. Trumps everything. Archiving a
--                                   lost lead later does NOT un-vacate it.
--     - Drop BELOW kapora from a financial stage (kapora/sözleşme -> any stage
--                                   earlier than kapora) -> VACATE (left the zone).
--     - Move BETWEEN kapora <-> sözleşme -> NOT a vacate; it's a re-confirm handled
--                                   by fms_record_finance_change (atomic vacate+insert).
--     - Moved-in rows             -> stay active (protected by STAGE, not archive).
--     - Archive                   -> never triggers or prevents a vacate.
--
-- Apply AFTER 0096. Then `pnpm gen:types` + Supabase `get_advisors`.
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. room_type_prices — month-bounded price periods
-- ----------------------------------------------------------------------------
-- Months stored as the FIRST DAY of the month (DATE pinned to YYYY-MM-01) so we
-- get native date comparison while only ever meaning "month". valid_until_month
-- is the LAST covered month (inclusive), also pinned to its 1st; NULL = open-ended
-- (covers everything from valid_from_month onward — useful for "current price
-- until further notice").
CREATE TABLE IF NOT EXISTS room_type_prices (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  room_type_id       UUID NOT NULL REFERENCES room_types(id) ON DELETE CASCADE,
  price              NUMERIC(12,2) NOT NULL CHECK (price >= 0),  -- monthly TRY
  valid_from_month   DATE NOT NULL,                              -- YYYY-MM-01 (inclusive)
  valid_until_month  DATE,                                       -- YYYY-MM-01 (inclusive) or NULL = open
  label              TEXT,                                       -- 'summer' | 'academic' | ...
  -- Enforce month-pinning (day must be 1) so comparisons are unambiguous.
  CONSTRAINT room_type_prices_from_is_month
    CHECK (date_trunc('month', valid_from_month) = valid_from_month),
  CONSTRAINT room_type_prices_until_is_month
    CHECK (valid_until_month IS NULL
           OR date_trunc('month', valid_until_month) = valid_until_month),
  CONSTRAINT room_type_prices_order
    CHECK (valid_until_month IS NULL OR valid_until_month >= valid_from_month)
);

CREATE INDEX IF NOT EXISTS idx_room_type_prices_lookup
  ON room_type_prices (room_type_id, valid_from_month, valid_until_month);

ALTER TABLE room_type_prices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS room_type_prices_select ON room_type_prices;
CREATE POLICY room_type_prices_select ON room_type_prices
  FOR SELECT
  USING (NOT is_partner_operator() AND is_manager_or_superadmin());

DROP POLICY IF EXISTS room_type_prices_insert ON room_type_prices;
CREATE POLICY room_type_prices_insert ON room_type_prices
  FOR INSERT
  WITH CHECK (NOT is_partner_operator() AND is_manager_or_superadmin());

DROP POLICY IF EXISTS room_type_prices_update ON room_type_prices;
CREATE POLICY room_type_prices_update ON room_type_prices
  FOR UPDATE
  USING (NOT is_partner_operator() AND is_manager_or_superadmin())
  WITH CHECK (NOT is_partner_operator() AND is_manager_or_superadmin());

CREATE OR REPLACE FUNCTION fn_audit_room_type_price()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO finance_audit(actor_id, entity, entity_id, field, old_value, new_value)
    VALUES (fn_finance_actor(), 'room_type_prices', NEW.id, 'created', NULL,
            format('price=%s from=%s until=%s',
                   NEW.price, NEW.valid_from_month, NEW.valid_until_month));
    RETURN NEW;
  END IF;
  IF NEW.price IS DISTINCT FROM OLD.price THEN
    INSERT INTO finance_audit(actor_id, entity, entity_id, field, old_value, new_value)
    VALUES (fn_finance_actor(), 'room_type_prices', NEW.id, 'price',
            OLD.price::text, NEW.price::text);
  END IF;
  IF NEW.valid_from_month IS DISTINCT FROM OLD.valid_from_month THEN
    INSERT INTO finance_audit(actor_id, entity, entity_id, field, old_value, new_value)
    VALUES (fn_finance_actor(), 'room_type_prices', NEW.id, 'valid_from_month',
            OLD.valid_from_month::text, NEW.valid_from_month::text);
  END IF;
  IF NEW.valid_until_month IS DISTINCT FROM OLD.valid_until_month THEN
    INSERT INTO finance_audit(actor_id, entity, entity_id, field, old_value, new_value)
    VALUES (fn_finance_actor(), 'room_type_prices', NEW.id, 'valid_until_month',
            OLD.valid_until_month::text, NEW.valid_until_month::text);
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_audit_room_type_price ON room_type_prices;
CREATE TRIGGER trg_audit_room_type_price
  AFTER INSERT OR UPDATE ON room_type_prices
  FOR EACH ROW EXECUTE FUNCTION fn_audit_room_type_price();

COMMENT ON TABLE room_type_prices IS
  'Month-bounded price periods per room type. Price chosen by customer move-in '
  'month. Seasons + annual inflation updates are rows here; no schema change to '
  'add a season. Every move-in month must be covered or the kapora gate blocks.';

-- Optional but recommended: prevent overlapping periods for the same room type,
-- which would make price resolution ambiguous. Postgres can't easily express a
-- range-overlap exclusion on two DATE columns without btree_gist; we enforce
-- non-overlap in the resolver (picks the most specific / latest valid_from) and
-- recommend an app-level admin check. If btree_gist is available, add:
--   CREATE EXTENSION IF NOT EXISTS btree_gist;
--   ALTER TABLE room_type_prices ADD CONSTRAINT room_type_prices_no_overlap
--     EXCLUDE USING gist (
--       room_type_id WITH =,
--       daterange(valid_from_month,
--                 COALESCE(valid_until_month, 'infinity'::date), '[]') WITH &&
--     );
-- (Left commented: confirm btree_gist availability before enabling.)

-- ----------------------------------------------------------------------------
-- 2. fms_price_for_month() — resolve the price for a move-in month
-- ----------------------------------------------------------------------------
-- Returns the monthly price whose period covers p_move_in_month, or NULL if none
-- (caller/gate treats NULL as "no rate -> block"). If periods overlap (admin
-- error), the most specific wins: latest valid_from_month, then non-open-ended
-- before open-ended.
CREATE OR REPLACE FUNCTION fms_price_for_month(
  p_room_type_id UUID,
  p_move_in_month DATE          -- any date in the move-in month; normalized below
)
RETURNS NUMERIC
LANGUAGE sql STABLE AS $$
  SELECT rtp.price
  FROM room_type_prices rtp
  WHERE rtp.room_type_id = p_room_type_id
    AND date_trunc('month', p_move_in_month) >= rtp.valid_from_month
    AND (rtp.valid_until_month IS NULL
         OR date_trunc('month', p_move_in_month) <= rtp.valid_until_month)
  ORDER BY rtp.valid_from_month DESC,
           (rtp.valid_until_month IS NOT NULL) DESC   -- bounded before open-ended
  LIMIT 1;
$$;

COMMENT ON FUNCTION fms_price_for_month IS
  'Monthly price for a room type given a move-in month (YYYY-MM, any day). NULL '
  'if no period covers the month -> kapora gate blocks. Most specific period wins '
  'on overlap. Reads room_type_prices only — no default_price fallback.';

REVOKE EXECUTE ON FUNCTION fms_price_for_month(UUID, DATE) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION fms_price_for_month(UUID, DATE) TO service_role;

COMMENT ON COLUMN room_types.default_price IS
  'DEPRECATED as of 0097 — vestigial column, not the FMS price source. Seasonal '
  'rates live in room_type_prices; every sellable room must have a covering period '
  'or the kapora gate blocks.';

-- ----------------------------------------------------------------------------
-- 3. lead_finance.move_in_month — snapshot of the price-driving month
-- ----------------------------------------------------------------------------
-- Frozen alongside monthly_payment: records WHICH month drove the frozen rate,
-- so the row is self-explanatory even if room_type_prices changes later.
ALTER TABLE lead_finance
  ADD COLUMN IF NOT EXISTS move_in_month DATE;  -- YYYY-MM-01

COMMENT ON COLUMN lead_finance.move_in_month IS
  'Customer move-in month (YYYY-MM-01) that drove the frozen monthly_payment via '
  'room_type_prices. Snapshot — independent of later price-period edits.';

-- ----------------------------------------------------------------------------
-- 4. fms_create_finance_row() — create with seasonal price resolution
-- ----------------------------------------------------------------------------
-- Replaces the bare INSERT path from 0096's spec. App code calls this when a lead
-- ENTERS kapora (after the gate validates inputs). Resolves the seasonal price
-- from move_in_month, freezes it, inserts the active row. Idempotent per active
-- row: if an active row already exists (shouldn't, on a clean enter), it raises
-- (the unique index would anyway) — re-entry after a vacate has no active row so
-- it inserts cleanly.
--
-- SECURITY DEFINER; allowed for everyone EXCEPT partner_operator. Sets the audit
-- actor GUC. Raises if the month has no covering price period (defense in depth;
-- the app gate should have blocked already).
DROP FUNCTION IF EXISTS fms_create_finance_row(UUID, UUID, NUMERIC, NUMERIC, INT, UUID);
CREATE OR REPLACE FUNCTION fms_create_finance_row(
  p_lead_id        UUID,
  p_purchased_room UUID,
  p_move_in_month  DATE,
  p_discount       NUMERIC,
  p_deal_duration  INT,
  p_actor_id       UUID
)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_price  NUMERIC;
  v_month  DATE := date_trunc('month', p_move_in_month)::date;
  v_new_id UUID;
BEGIN
  IF is_partner_operator() THEN
    RAISE EXCEPTION 'partner_operator may not modify finance rows';
  END IF;

  v_price := fms_price_for_month(p_purchased_room, v_month);
  IF v_price IS NULL THEN
    RAISE EXCEPTION 'No price period covers move-in month % for room %',
      to_char(v_month, 'YYYY-MM'), p_purchased_room;
  END IF;
  IF p_discount < 0 OR p_discount > v_price THEN
    RAISE EXCEPTION 'discount must be between 0 and the monthly price (%).', v_price;
  END IF;
  IF p_deal_duration < 1 OR p_deal_duration > 12 THEN
    RAISE EXCEPTION 'deal_duration must be 1..12.';
  END IF;

  PERFORM set_config('app.actor_id', COALESCE(p_actor_id::text, ''), true);

  INSERT INTO lead_finance
    (lead_id, purchased_room, monthly_payment, discount, deal_duration, move_in_month)
  VALUES
    (p_lead_id, p_purchased_room, v_price, p_discount, p_deal_duration, v_month)
  RETURNING id INTO v_new_id;

  RETURN v_new_id;
END $$;

COMMENT ON FUNCTION fms_create_finance_row IS
  'Creates the active finance row on kapora entry. Resolves seasonal price by '
  'move-in month, freezes it. Raises if month unpriced. All roles except '
  'partner_operator. Sets app.actor_id for audit.';

REVOKE EXECUTE ON FUNCTION fms_create_finance_row(UUID, UUID, DATE, NUMERIC, INT, UUID) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION fms_create_finance_row(UUID, UUID, DATE, NUMERIC, INT, UUID) TO service_role;

-- ----------------------------------------------------------------------------
-- 5. fms_record_finance_change() v2 — re-confirm / new contract (atomic)
-- ----------------------------------------------------------------------------
-- Supersedes 0096's version. Used for sözleşme re-confirm, room change, or
-- extension (a NEW contract). Resolves seasonal price by move_in_month, vacates
-- the current active row, inserts the new one — atomically in one transaction.
DROP FUNCTION IF EXISTS fms_record_finance_change(UUID, UUID, NUMERIC, NUMERIC, INT, UUID);
CREATE OR REPLACE FUNCTION fms_record_finance_change(
  p_lead_id        UUID,
  p_purchased_room UUID,
  p_move_in_month  DATE,
  p_discount       NUMERIC,
  p_deal_duration  INT,
  p_actor_id       UUID
)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_price  NUMERIC;
  v_month  DATE := date_trunc('month', p_move_in_month)::date;
  v_new_id UUID;
BEGIN
  IF is_partner_operator() THEN
    RAISE EXCEPTION 'partner_operator may not modify finance rows';
  END IF;

  v_price := fms_price_for_month(p_purchased_room, v_month);
  IF v_price IS NULL THEN
    RAISE EXCEPTION 'No price period covers move-in month % for room %',
      to_char(v_month, 'YYYY-MM'), p_purchased_room;
  END IF;
  IF p_discount < 0 OR p_discount > v_price THEN
    RAISE EXCEPTION 'discount must be between 0 and the monthly price (%).', v_price;
  END IF;
  IF p_deal_duration < 1 OR p_deal_duration > 12 THEN
    RAISE EXCEPTION 'deal_duration must be 1..12.';
  END IF;

  PERFORM set_config('app.actor_id', COALESCE(p_actor_id::text, ''), true);

  UPDATE lead_finance
     SET vacated_at = now()
   WHERE lead_id = p_lead_id AND vacated_at IS NULL;

  INSERT INTO lead_finance
    (lead_id, purchased_room, monthly_payment, discount, deal_duration, move_in_month)
  VALUES
    (p_lead_id, p_purchased_room, v_price, p_discount, p_deal_duration, v_month)
  RETURNING id INTO v_new_id;

  RETURN v_new_id;
END $$;

COMMENT ON FUNCTION fms_record_finance_change IS
  'Atomic vacate+insert for re-confirm / room change / extension (new contract). '
  'Resolves seasonal price by move-in month. All roles except partner_operator.';

REVOKE EXECUTE ON FUNCTION fms_record_finance_change(UUID, UUID, DATE, NUMERIC, INT, UUID) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION fms_record_finance_change(UUID, UUID, DATE, NUMERIC, INT, UUID) TO service_role;

-- ----------------------------------------------------------------------------
-- 5b. active_finance + audit — surface move_in_month
-- ----------------------------------------------------------------------------
DROP VIEW IF EXISTS active_finance;
CREATE VIEW active_finance
WITH (security_invoker = true) AS
SELECT
  lf.id,
  lf.created_at,
  lf.lead_id,
  lf.purchased_room,
  lf.monthly_payment,
  lf.discount,
  lf.deal_duration,
  lf.move_in_month,
  (lf.monthly_payment - lf.discount)                      AS effective_monthly,
  (lf.monthly_payment - lf.discount) * lf.deal_duration   AS lead_revenue
FROM lead_finance lf
WHERE lf.vacated_at IS NULL;

CREATE OR REPLACE FUNCTION fn_audit_lead_finance()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO finance_audit(actor_id, entity, entity_id, field, old_value, new_value)
    VALUES (fn_finance_actor(), 'lead_finance', NEW.id, 'created', NULL,
            format('room=%s monthly=%s discount=%s duration=%s move_in=%s',
                   NEW.purchased_room, NEW.monthly_payment, NEW.discount,
                   NEW.deal_duration, NEW.move_in_month));
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' THEN
    IF NEW.discount IS DISTINCT FROM OLD.discount THEN
      INSERT INTO finance_audit(actor_id, entity, entity_id, field, old_value, new_value)
      VALUES (fn_finance_actor(), 'lead_finance', NEW.id, 'discount',
              OLD.discount::text, NEW.discount::text);
    END IF;
    IF NEW.deal_duration IS DISTINCT FROM OLD.deal_duration THEN
      INSERT INTO finance_audit(actor_id, entity, entity_id, field, old_value, new_value)
      VALUES (fn_finance_actor(), 'lead_finance', NEW.id, 'deal_duration',
              OLD.deal_duration::text, NEW.deal_duration::text);
    END IF;
    IF NEW.vacated_at IS DISTINCT FROM OLD.vacated_at THEN
      INSERT INTO finance_audit(actor_id, entity, entity_id, field, old_value, new_value)
      VALUES (fn_finance_actor(), 'lead_finance', NEW.id, 'vacated_at',
              OLD.vacated_at::text, NEW.vacated_at::text);
    END IF;
    RETURN NEW;
  END IF;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION fn_finance_row_guard()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF (
       (NEW.funnel_status = 'kapora-alindi'
        AND OLD.funnel_status IS DISTINCT FROM 'kapora-alindi')
       OR (NEW.funnel_status = 'sozlesme-imzalandi'
           AND OLD.funnel_status IS DISTINCT FROM 'sozlesme-imzalandi')
     )
     AND NOT EXISTS (
       SELECT 1 FROM lead_finance lf
       WHERE lf.lead_id = NEW.uuid AND lf.vacated_at IS NULL
     )
  THEN
    INSERT INTO finance_audit(actor_id, entity, entity_id, field, old_value, new_value)
    VALUES (fn_finance_actor(), 'lead_finance', NEW.uuid,
            'MISSING_ON_' || upper(replace(NEW.funnel_status, '-', '_')),
            OLD.funnel_status,
            NEW.funnel_status || ' (no active finance row — app path bypassed)');
  END IF;
  RETURN NEW;
END $$;

-- ----------------------------------------------------------------------------
-- 6. fn_vacate_finance_on_exit — VACATE rules (funnel-driven, archive-blind)
-- ----------------------------------------------------------------------------
-- Vacate is a pure function of funnel transitions. is_archived is NEVER consulted.
--
-- Vacate the lead's active finance row when:
--   (a) NEW.funnel_status = 'lost'  (always; trumps everything; archiving later
--       does not un-vacate), OR
--   (b) the lead DROPS OUT of the financial zone: it WAS in a financial stage
--       (kapora-alindi or sozlesme-imzalandi) and moved to a stage STRICTLY BEFORE
--       kapora (i.e. exited the zone downward).
--
-- NOT a vacate (do nothing here):
--   * kapora <-> sozlesme moves (re-confirm handled by fms_record_finance_change)
--   * advancing forward (sözleşme, moved-in flows)
--   * moved-in rows (protected by stage)
--   * any is_archived change (no trigger on it)
--
-- The set of stages "before kapora" is hardcoded for transparency. SOURCE OF
-- TRUTH: FUNNEL_STATUSES in lib/constants.ts — these are every status that
-- appears BEFORE 'kapora-alindi' in that ordered array. Keep in sync if the
-- funnel order changes (rare).
CREATE OR REPLACE FUNCTION fn_vacate_finance_on_exit()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  -- Every funnel status strictly BEFORE 'kapora-alindi'.
  pre_kapora CONSTANT TEXT[] := ARRAY[
    'yeni','bilgi-verildi','aranacak','arandi','arandi-acmadi',
    'bizi-aradi-konustuk','ziyaret','ziyaret-etmedi','ziyaret-etti',
    'teklif-gonderildi'
  ];
  financial CONSTANT TEXT[] := ARRAY['kapora-alindi','sozlesme-imzalandi'];
  v_should_vacate BOOLEAN := false;
  v_vacated_id      UUID;
BEGIN
  IF NEW.funnel_status = OLD.funnel_status THEN
    RETURN NEW;  -- no funnel change
  END IF;

  -- (a) Lost always vacates.
  IF NEW.funnel_status = 'lost' THEN
    v_should_vacate := true;

  -- (b) Dropped out of the financial zone to a pre-kapora stage.
  ELSIF OLD.funnel_status = ANY(financial)
        AND NEW.funnel_status = ANY(pre_kapora) THEN
    v_should_vacate := true;
  END IF;

  IF v_should_vacate THEN
    UPDATE lead_finance
       SET vacated_at = now()
     WHERE lead_id = NEW.uuid AND vacated_at IS NULL
     RETURNING id INTO v_vacated_id;

    IF v_vacated_id IS NOT NULL THEN
      INSERT INTO finance_audit(actor_id, entity, entity_id, field, old_value, new_value)
      VALUES (fn_finance_actor(), 'lead_finance', v_vacated_id, 'vacated_on_exit',
              OLD.funnel_status, NEW.funnel_status);
    END IF;
  END IF;

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_vacate_finance_on_exit ON leads;
CREATE TRIGGER trg_vacate_finance_on_exit
  AFTER UPDATE OF funnel_status ON leads
  FOR EACH ROW EXECUTE FUNCTION fn_vacate_finance_on_exit();

-- ----------------------------------------------------------------------------
-- 7. fms_revenue_breakdown(include_kapora) — toggle for "kaporadakileri göster"
-- ----------------------------------------------------------------------------
-- Supersedes 0096's no-arg version. Default (false) = CONTRACTED revenue:
-- excludes leads currently at 'kapora-alindi' (deposits not yet contracted).
-- include_kapora = true adds them back ("kaporadakileri göster").
--
-- Lost / dropped-out customers are already gone — their rows are vacated, so
-- active_finance never sees them, in EITHER mode. The toggle only governs the
-- kapora-vs-signed distinction among LIVE active rows.
DROP FUNCTION IF EXISTS fms_revenue_breakdown();
CREATE OR REPLACE FUNCTION fms_revenue_breakdown(
  p_include_kapora BOOLEAN DEFAULT false
)
RETURNS TABLE (
  partner_id        UUID,
  partner_name      TEXT,
  property_id       UUID,
  property_name     TEXT,
  customer_count    BIGINT,
  property_revenue  NUMERIC
)
LANGUAGE sql SECURITY INVOKER STABLE AS $$
  SELECT
    pr.partner_id,
    pa.name              AS partner_name,
    pr.id                AS property_id,
    pr.hotel_name        AS property_name,
    COUNT(af.id)         AS customer_count,
    COALESCE(SUM(af.lead_revenue), 0) AS property_revenue
  FROM active_finance af
  JOIN leads l          ON l.uuid = af.lead_id
  JOIN room_types rt    ON rt.id = af.purchased_room
  JOIN properties pr    ON pr.id = rt.hotel_id
  LEFT JOIN partners pa ON pa.id = pr.partner_id
  WHERE (p_include_kapora OR l.funnel_status <> 'kapora-alindi')
  GROUP BY pr.partner_id, pa.name, pr.id, pr.hotel_name;
$$;

COMMENT ON FUNCTION fms_revenue_breakdown IS
  'Canonical FMS revenue aggregation. Default excludes kapora-stage leads '
  '(contracted revenue). p_include_kapora=true adds them ("kaporadakileri '
  'göster"). Vacated (lost/dropped) rows never appear. security_invoker.';

REVOKE EXECUTE ON FUNCTION fms_revenue_breakdown(BOOLEAN) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION fms_revenue_breakdown(BOOLEAN) TO service_role;

-- Re-assert EXECUTE lockdown on superseded 0096 signatures (no-op if already dropped).
DO $$ BEGIN
  REVOKE EXECUTE ON FUNCTION fms_create_finance_row(UUID, UUID, NUMERIC, NUMERIC, INT, UUID) FROM PUBLIC, anon, authenticated;
EXCEPTION WHEN undefined_function THEN NULL;
END $$;
DO $$ BEGIN
  REVOKE EXECUTE ON FUNCTION fms_record_finance_change(UUID, UUID, NUMERIC, NUMERIC, INT, UUID) FROM PUBLIC, anon, authenticated;
EXCEPTION WHEN undefined_function THEN NULL;
END $$;
DO $$ BEGIN
  REVOKE EXECUTE ON FUNCTION fms_revenue_breakdown() FROM PUBLIC, anon, authenticated;
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

COMMIT;

-- ============================================================================
-- POST-MIGRATION CHECKS
-- ============================================================================
-- SELECT to_regclass('public.room_type_prices');
-- SELECT proname FROM pg_proc WHERE proname IN
--   ('fms_price_for_month','fms_create_finance_row','fms_record_finance_change',
--    'fms_revenue_breakdown','fn_vacate_finance_on_exit');
-- SELECT column_name FROM information_schema.columns
--   WHERE table_name='lead_finance' AND column_name='move_in_month';
--
-- -- Price resolution smoke test (after seeding a period):
-- -- SELECT fms_price_for_month('<room_uuid>', DATE '2026-09-15');  -- expects academic rate
--
-- -- Toggle smoke test:
-- -- SELECT * FROM fms_revenue_breakdown(false);  -- contracted only
-- -- SELECT * FROM fms_revenue_breakdown(true);   -- + kapora
--
-- -- Vacate smoke test: move a kapora lead to 'arandi' or 'lost', then:
-- -- SELECT vacated_at FROM lead_finance WHERE lead_id='<uuid>' ORDER BY created_at DESC;
--
-- THEN: pnpm gen:types  AND  Supabase get_advisors
--
-- -- Function privilege post-check (anon/authenticated must NOT appear in proacl):
-- SELECT p.proname,
--        pg_catalog.pg_get_function_identity_arguments(p.oid) AS args,
--        p.proacl
-- FROM pg_proc p
-- JOIN pg_namespace n ON n.oid = p.pronamespace
-- WHERE n.nspname = 'public' AND p.proname LIKE 'fms\_%'
-- ORDER BY p.proname, args;
-- ============================================================================
