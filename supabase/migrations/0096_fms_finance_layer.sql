-- ============================================================================
-- Migration 0096 — FMS (Finance Management System) v1
-- ============================================================================
-- Adds the financial tracking layer for won customers.
--
-- Establishes:
--   * room_types.default_price          (canonical monthly price home)
--   * partners.commission_percentage    (Univotel's cut of partner revenue)
--   * lead_finance                      (append-only finance ledger per customer)
--   * finance_audit                     (who/when/old->new on money-affecting edits)
--   * active_finance                    (security_invoker VIEW: current rows only;
--                                        the ONLY sanctioned read path)
--   * fms_revenue_breakdown()           (the single canonical revenue query)
--   * fms_create_finance_row()          (audited first-row creation RPC)
--   * fms_record_finance_change()       (atomic vacate+insert RPC)
--   * RLS policies                      (manager+ read/write; non-manager finance
--                                        writes go through SECURITY DEFINER RPCs;
--                                        partner_operator denied throughout)
--   * triggers                          (audit capture + finance-row safety net)
--   * one-time backfill                 (existing won customers; soft-archive aware)
--
-- Depends on (already in production as of 0095):
--   leads, lead_details.purchased_room (0086, FK -> room_types),
--   room_types (0083), properties.partner_id (0093), partners (0093),
--   is_partner_operator(), is_manager_or_superadmin() (0093),
--   leads.has_moved_in (0063)
--
-- VERIFIED against live DB:
--   * funnel slugs are ASCII: kapora-alindi, sozlesme-imzalandi
--   * archival is SOFT: archived won leads stay in `leads` (is_archived=true);
--     lead_details persists => backfill reads `leads` with NO is_archived filter;
--     we do NOT scan archived_leads.
--   * roles: salesperson, operator, manager, superadmin, partner_operator.
--     operator = salesperson + PMS write, can advance to ANY stage incl. kapora.
--     Finance writes: managers write the table directly (RLS); salesperson/operator
--     create + change rows ONLY through the SECURITY DEFINER RPCs below; partner_
--     operator denied everywhere. The RPCs are EXECUTE-locked to service_role.
--   * lead_details.purchased_room FK = lead_details_purchased_room_fkey,
--     currently ON DELETE SET NULL (re-pointed to RESTRICT below).
--
-- Apply in order. After applying: run `pnpm gen:types` and Supabase `get_advisors`
-- (confirm NO security_definer_view warning on active_finance).
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. room_types.default_price — canonical monthly price
-- ----------------------------------------------------------------------------
-- Nullable on purpose: prices are seeded MANUALLY by managers. A room type with
-- no price cannot be sold (the kapora gate blocks it — see spec §4). This is the
-- ONLY price source in the system; property_room_types.room_price is dead/unused.
ALTER TABLE room_types
  ADD COLUMN IF NOT EXISTS default_price NUMERIC(12,2);

COMMENT ON COLUMN room_types.default_price IS
  'Monthly price (TRY). Canonical price source for FMS. Seeded manually by managers. '
  'NULL = unpriced = cannot be sold (kapora gate blocks). Copied (frozen) into '
  'lead_finance.monthly_payment at finance-row creation.';

-- ----------------------------------------------------------------------------
-- 1b. room_types deletion protection
-- ----------------------------------------------------------------------------
-- purchased_room (lead_details, 0086) is currently ON DELETE SET NULL, which
-- would orphan a won customer's room link if a room type is deleted. FMS rule:
-- room types are SOFT-deleted (is_active=false), never hard-deleted. Re-point the
-- FK to ON DELETE RESTRICT as a hard backstop so a referenced room can NEVER be
-- physically deleted, even via raw SQL. Constraint name verified
-- (lead_details_purchased_room_fkey); discovered dynamically for safety.
DO $$
DECLARE
  v_conname text;
BEGIN
  SELECT conname INTO v_conname
  FROM pg_constraint
  WHERE conrelid = 'lead_details'::regclass
    AND contype = 'f'
    AND pg_get_constraintdef(oid) ILIKE '%purchased_room%REFERENCES room_types%';

  IF v_conname IS NOT NULL THEN
    EXECUTE format('ALTER TABLE lead_details DROP CONSTRAINT %I', v_conname);
  END IF;

  ALTER TABLE lead_details
    ADD CONSTRAINT lead_details_purchased_room_fkey
    FOREIGN KEY (purchased_room) REFERENCES room_types(id) ON DELETE RESTRICT;
END $$;

-- ----------------------------------------------------------------------------
-- 2. partners.commission_percentage — Univotel's cut of partner revenue
-- ----------------------------------------------------------------------------
-- Flat percentage in v1. v2 introduces Academic House tiering (x% to 100M, y%
-- above) — see spec §9. Stored as a percentage number (e.g. 10.00 = 10%).
ALTER TABLE partners
  ADD COLUMN IF NOT EXISTS commission_percentage NUMERIC(5,2)
    CHECK (commission_percentage IS NULL
           OR (commission_percentage >= 0 AND commission_percentage <= 100));

COMMENT ON COLUMN partners.commission_percentage IS
  'Univotel commission as a percentage of this partner''s revenue (e.g. 10.00 = 10%). '
  'NULL or 0 => our cut shows as 0 (visible, not corrupting). v1 flat; v2 tiers for '
  'Academic House. ALL commission math routes through calculatePartnerCommission().';

-- ----------------------------------------------------------------------------
-- 3. lead_finance — append-only finance ledger
-- ----------------------------------------------------------------------------
-- One ACTIVE row per won customer (partial unique index). Changes create a NEW
-- row and soft-vacate the old one ATOMICALLY via fms_record_finance_change()
-- (§7b). monthly_payment and purchased_room are FROZEN at creation.
CREATE TABLE IF NOT EXISTS lead_finance (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

  lead_id         UUID NOT NULL
                    REFERENCES leads(uuid) ON DELETE CASCADE,

  -- FROZEN snapshot of the room type bought. ON DELETE RESTRICT: a sold room
  -- type can never be deleted.
  purchased_room  UUID NOT NULL
                    REFERENCES room_types(id) ON DELETE RESTRICT,

  -- FROZEN copy of room_types.default_price at creation. Never edited.
  monthly_payment NUMERIC(12,2) NOT NULL,

  -- Amount OFF the monthly_payment (absolute TRY). Effective = monthly - discount.
  -- CHECK prevents negative effective rate.
  discount        NUMERIC(12,2) NOT NULL DEFAULT 0
                    CHECK (discount >= 0 AND discount <= monthly_payment),

  -- Contract length (months). Default 9. CHECK 1..12 blocks "90 vs 9" typos.
  deal_duration   INT NOT NULL DEFAULT 9
                    CHECK (deal_duration >= 1 AND deal_duration <= 12),

  -- Soft-vacate. NULL = current/active row. Finance-vacate means "arrangement
  -- replaced", NOT "customer left". Soft-archiving a lead does NOT vacate it — a
  -- moved-in won customer keeps counting post-archive, by design.
  vacated_at      TIMESTAMPTZ
);

COMMENT ON TABLE lead_finance IS
  'Append-only finance ledger. One active row (vacated_at IS NULL) per won '
  'customer. Money math reads the active_finance VIEW, never this table directly. '
  'Archived (soft) won customers keep their active row and keep counting. NEVER '
  'hard-delete a lead/finance row or revenue history cascades away.';

-- OPEN DECISION (lost / refunded customers): a finance row is NOT vacated when a
-- won lead later moves to funnel_status='lost'. v1 therefore counts a backed-out
-- or refunded customer in CONTRACTED revenue until a manager vacates the row.
-- Auto-vacate-on-lost is deliberately NOT implemented here: lost -> recovery
-- (leads.funnel_status_before_lost restores the prior stage) would then silently
-- DROP that customer's revenue with no row to restore. Decide the desired
-- recognition rule with the business before automating it; until then, losses are
-- a manual vacate and remain traceable through finance_audit.

-- Invariant: one active row per lead. Double-write fails LOUD (unique violation),
-- never silently double-counts.
CREATE UNIQUE INDEX IF NOT EXISTS idx_lead_finance_one_active
  ON lead_finance (lead_id)
  WHERE vacated_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_lead_finance_purchased_room
  ON lead_finance (purchased_room)
  WHERE vacated_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_lead_finance_lead_id
  ON lead_finance (lead_id);

-- ----------------------------------------------------------------------------
-- 4. active_finance — the ONLY sanctioned read path  (security_invoker!)
-- ----------------------------------------------------------------------------
-- Bakes `vacated_at IS NULL` into the schema so no query can forget it.
--
-- CRITICAL: security_invoker = true. A plain view runs with the OWNER's rights
-- and BYPASSES RLS; Supabase default-grants SELECT on public views, so without
-- this, salespeople/partner_operators could read all finance rows through the
-- view. With security_invoker, the querying user's RLS on lead_finance applies.
-- PG17 supports it. After applying, run get_advisors: expect NO
-- security_definer_view warning.
CREATE OR REPLACE VIEW active_finance
WITH (security_invoker = true) AS
SELECT
  lf.id,
  lf.created_at,
  lf.lead_id,
  lf.purchased_room,
  lf.monthly_payment,
  lf.discount,
  lf.deal_duration,
  (lf.monthly_payment - lf.discount)                      AS effective_monthly,
  (lf.monthly_payment - lf.discount) * lf.deal_duration   AS lead_revenue
FROM lead_finance lf
WHERE lf.vacated_at IS NULL;

COMMENT ON VIEW active_finance IS
  'security_invoker view. Current finance rows only, with effective_monthly and '
  'lead_revenue precomputed. THE read path for all FMS calculations. Do not read '
  'lead_finance directly from app code.';

-- ----------------------------------------------------------------------------
-- 5. finance_audit — traceability for plausible-but-wrong edits
-- ----------------------------------------------------------------------------
-- actor_id resolved by fn_finance_actor(): app-supplied GUC (app.actor_id, set by
-- the write RPC) first, then auth.uid(). Money mutations route through a
-- service-role client (no auth.uid()), so the GUC is how "who" gets recorded.
CREATE TABLE IF NOT EXISTS finance_audit (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  actor_id     UUID,            -- who (GUC or auth.uid(); NULL = system/backfill)
  entity       TEXT NOT NULL,
  entity_id    UUID NOT NULL,
  field        TEXT NOT NULL,
  old_value    TEXT,
  new_value    TEXT
);

CREATE INDEX IF NOT EXISTS idx_finance_audit_entity
  ON finance_audit (entity, entity_id, created_at DESC);

COMMENT ON TABLE finance_audit IS
  'Append-only audit of money-affecting changes. Defends "valid but wrong" '
  'failure modes constraints cannot catch.';

-- Resolve the acting user: app-supplied GUC first, then auth.uid().
CREATE OR REPLACE FUNCTION fn_finance_actor()
RETURNS UUID LANGUAGE plpgsql STABLE SET search_path = public AS $$
DECLARE
  v_guc text;
BEGIN
  v_guc := current_setting('app.actor_id', true);  -- true = no error if unset
  IF v_guc IS NOT NULL AND v_guc <> '' THEN
    RETURN v_guc::uuid;
  END IF;
  RETURN auth.uid();
EXCEPTION WHEN others THEN
  RETURN auth.uid();
END $$;

-- ----------------------------------------------------------------------------
-- 6. Audit triggers
-- ----------------------------------------------------------------------------
-- 6a. partners.commission_percentage
CREATE OR REPLACE FUNCTION fn_audit_partner_commission()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.commission_percentage IS DISTINCT FROM OLD.commission_percentage THEN
    INSERT INTO finance_audit(actor_id, entity, entity_id, field, old_value, new_value)
    VALUES (fn_finance_actor(), 'partners', NEW.id, 'commission_percentage',
            OLD.commission_percentage::text, NEW.commission_percentage::text);
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_audit_partner_commission ON partners;
CREATE TRIGGER trg_audit_partner_commission
  AFTER UPDATE OF commission_percentage ON partners
  FOR EACH ROW EXECUTE FUNCTION fn_audit_partner_commission();

-- 6b. properties.partner_id reassignment (near-never, large blast radius)
CREATE OR REPLACE FUNCTION fn_audit_property_partner()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.partner_id IS DISTINCT FROM OLD.partner_id THEN
    INSERT INTO finance_audit(actor_id, entity, entity_id, field, old_value, new_value)
    VALUES (fn_finance_actor(), 'properties', NEW.id, 'partner_id',
            OLD.partner_id::text, NEW.partner_id::text);
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_audit_property_partner ON properties;
CREATE TRIGGER trg_audit_property_partner
  AFTER UPDATE OF partner_id ON properties
  FOR EACH ROW EXECUTE FUNCTION fn_audit_property_partner();

-- 6c. room_types.default_price (affects FUTURE finance rows only)
CREATE OR REPLACE FUNCTION fn_audit_room_price()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.default_price IS DISTINCT FROM OLD.default_price THEN
    INSERT INTO finance_audit(actor_id, entity, entity_id, field, old_value, new_value)
    VALUES (fn_finance_actor(), 'room_types', NEW.id, 'default_price',
            OLD.default_price::text, NEW.default_price::text);
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_audit_room_price ON room_types;
CREATE TRIGGER trg_audit_room_price
  AFTER UPDATE OF default_price ON room_types
  FOR EACH ROW EXECUTE FUNCTION fn_audit_room_price();

-- 6d. lead_finance edits + vacate + create
CREATE OR REPLACE FUNCTION fn_audit_lead_finance()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO finance_audit(actor_id, entity, entity_id, field, old_value, new_value)
    VALUES (fn_finance_actor(), 'lead_finance', NEW.id, 'created', NULL,
            format('room=%s monthly=%s discount=%s duration=%s',
                   NEW.purchased_room, NEW.monthly_payment, NEW.discount, NEW.deal_duration));
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
DROP TRIGGER IF EXISTS trg_audit_lead_finance ON lead_finance;
CREATE TRIGGER trg_audit_lead_finance
  AFTER INSERT OR UPDATE ON lead_finance
  FOR EACH ROW EXECUTE FUNCTION fn_audit_lead_finance();

-- ----------------------------------------------------------------------------
-- 7. Finance-row safety net  (true-positive only)
-- ----------------------------------------------------------------------------
-- App code creates the finance row BEFORE the kapora funnel write (spec §4.2,
-- reordered). So on the happy path the active row already exists when
-- funnel_status flips to 'kapora-alindi'. This guard therefore fires ONLY on a
-- genuine bypass (status advanced with no finance row) — no false positives. It
-- logs the anomaly; it does NOT fabricate a row (it lacks duration/discount).
CREATE OR REPLACE FUNCTION fn_finance_row_guard()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.funnel_status = 'kapora-alindi'
     AND OLD.funnel_status IS DISTINCT FROM 'kapora-alindi'
     AND NOT EXISTS (
       SELECT 1 FROM lead_finance lf
       WHERE lf.lead_id = NEW.uuid AND lf.vacated_at IS NULL
     )
  THEN
    INSERT INTO finance_audit(actor_id, entity, entity_id, field, old_value, new_value)
    VALUES (fn_finance_actor(), 'lead_finance', NEW.uuid, 'MISSING_ON_KAPORA',
            OLD.funnel_status, 'kapora-alindi (no active finance row — app path bypassed)');
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_finance_row_guard ON leads;
CREATE TRIGGER trg_finance_row_guard
  AFTER UPDATE OF funnel_status ON leads
  FOR EACH ROW EXECUTE FUNCTION fn_finance_row_guard();

-- ----------------------------------------------------------------------------
-- 7a. fms_create_finance_row() — audited creation of the FIRST active row
-- ----------------------------------------------------------------------------
-- Creation chokepoint for the kapora step. SECURITY DEFINER so salesperson/
-- operator sessions create the row WITHOUT a broad INSERT grant on the table
-- (RLS INSERT is manager+ only — §9b). Sets app.actor_id so the 'created' audit
-- row records the REAL actor instead of NULL (a raw service-role INSERT has no
-- auth.uid()). Role-gated: everyone except partner_operator. The one-active-row
-- invariant is still enforced by idx_lead_finance_one_active.
--
-- p_monthly_payment is the FROZEN copy of the room's default_price, read and
-- frozen by the caller (kapora gate — spec §4.1/§4.2).
CREATE OR REPLACE FUNCTION fms_create_finance_row(
  p_lead_id         UUID,
  p_purchased_room  UUID,
  p_monthly_payment NUMERIC,
  p_discount        NUMERIC,
  p_deal_duration   INT,
  p_actor_id        UUID
)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_new_id UUID;
BEGIN
  IF is_partner_operator() THEN
    RAISE EXCEPTION 'partner_operator may not create finance rows';
  END IF;

  -- Record actor for the INSERT audit trigger fired inside this txn.
  PERFORM set_config('app.actor_id', COALESCE(p_actor_id::text, ''), true);

  INSERT INTO lead_finance (lead_id, purchased_room, monthly_payment, discount, deal_duration)
  VALUES (p_lead_id, p_purchased_room, p_monthly_payment, p_discount, p_deal_duration)
  RETURNING id INTO v_new_id;

  RETURN v_new_id;
END $$;

COMMENT ON FUNCTION fms_create_finance_row IS
  'Audited creation of the first active finance row at kapora. SECURITY DEFINER + '
  'app.actor_id GUC so salesperson/operator creation records a real actor. Use this '
  'instead of a raw INSERT. One-active enforced by idx_lead_finance_one_active.';

-- ----------------------------------------------------------------------------
-- 7b. fms_record_finance_change() — ATOMIC vacate + insert
-- ----------------------------------------------------------------------------
-- THE only way a finance arrangement changes after the first row (sözleşme
-- adjustment, room change, term change). Vacate+insert in ONE function = one
-- transaction => a lead can never be left with zero active rows (the silent
-- revenue-drop failure of two PostgREST round-trips).
--
-- SECURITY DEFINER so any allowed role can call it without holding direct UPDATE
-- on lead_finance. Internal check: everyone EXCEPT partner_operator. Sets the
-- app.actor_id GUC so audit triggers record the real caller.
--
-- p_monthly_payment is the FROZEN copy of the new room's default_price, read and
-- frozen by the caller (spec §4.3).
CREATE OR REPLACE FUNCTION fms_record_finance_change(
  p_lead_id         UUID,
  p_purchased_room  UUID,
  p_monthly_payment NUMERIC,
  p_discount        NUMERIC,
  p_deal_duration   INT,
  p_actor_id        UUID
)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_new_id UUID;
BEGIN
  IF is_partner_operator() THEN
    RAISE EXCEPTION 'partner_operator may not modify finance rows';
  END IF;

  -- Record actor for the audit triggers fired inside this txn.
  PERFORM set_config('app.actor_id', COALESCE(p_actor_id::text, ''), true);

  -- 1. Soft-vacate the current active row (if any).
  UPDATE lead_finance
     SET vacated_at = now()
   WHERE lead_id = p_lead_id
     AND vacated_at IS NULL;

  -- 2. Insert the new active row (shares this function's single transaction).
  INSERT INTO lead_finance (lead_id, purchased_room, monthly_payment, discount, deal_duration)
  VALUES (p_lead_id, p_purchased_room, p_monthly_payment, p_discount, p_deal_duration)
  RETURNING id INTO v_new_id;

  RETURN v_new_id;
END $$;

COMMENT ON FUNCTION fms_record_finance_change IS
  'Atomic vacate+insert for finance arrangement changes. Allowed for all roles '
  'except partner_operator. Sets app.actor_id for audit. Use for sözleşme '
  'adjustments / room changes — never vacate+insert as two separate round-trips.';

-- ----------------------------------------------------------------------------
-- 8. fms_revenue_breakdown() — THE single canonical revenue query
-- ----------------------------------------------------------------------------
-- One row per (partner, property) + a partner_id = NULL group for the
-- "Unattributed" bucket (property has no partner). Every FMS surface reads this.
--
-- Baked-in rules: reads active_finance (vacated excluded); LEFT JOIN partners so
-- null-partner rows surface; NO is_archived filter (soft-archived won customers
-- count). JOIN (not LEFT) on room_types/properties is safe — purchased_room is
-- NOT NULL + ON DELETE RESTRICT => always valid. security_invoker => caller RLS.
CREATE OR REPLACE FUNCTION fms_revenue_breakdown()
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
  JOIN room_types rt    ON rt.id = af.purchased_room
  JOIN properties pr    ON pr.id = rt.hotel_id
  LEFT JOIN partners pa ON pa.id = pr.partner_id
  GROUP BY pr.partner_id, pa.name, pr.id, pr.hotel_name;
$$;

COMMENT ON FUNCTION fms_revenue_breakdown IS
  'Single canonical FMS revenue query. Per (partner, property), plus NULL-partner '
  'unattributed group. Reads active_finance. security_invoker => manager RLS only.';

-- ----------------------------------------------------------------------------
-- 8b. Function privileges — EXECUTE lock-down
-- ----------------------------------------------------------------------------
-- Postgres grants EXECUTE to PUBLIC on new functions by default; in Supabase
-- PUBLIC includes anon + authenticated. The two mutators are SECURITY DEFINER and
-- BYPASS RLS, so left at the default ANY client (even anon) could POST to
-- /rest/v1/rpc/... and vacate/replace finance rows. Revoke that default and grant
-- ONLY service_role — every FMS write goes through createServiceClient() in lib/.
-- (The internal is_partner_operator() guard stays as defence in depth.)
REVOKE EXECUTE ON FUNCTION fms_create_finance_row(UUID,UUID,NUMERIC,NUMERIC,INT,UUID)   FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION fms_record_finance_change(UUID,UUID,NUMERIC,NUMERIC,INT,UUID) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION fms_create_finance_row(UUID,UUID,NUMERIC,NUMERIC,INT,UUID)   TO service_role;
GRANT  EXECUTE ON FUNCTION fms_record_finance_change(UUID,UUID,NUMERIC,NUMERIC,INT,UUID) TO service_role;

-- fms_revenue_breakdown is SECURITY INVOKER (RLS still filters non-managers to an
-- empty set), but FMS reads also run through the lib/ service client, so lock it
-- to service_role too for least privilege.
REVOKE EXECUTE ON FUNCTION fms_revenue_breakdown() FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION fms_revenue_breakdown() TO service_role;

-- ----------------------------------------------------------------------------
-- 9. RLS
-- ----------------------------------------------------------------------------
ALTER TABLE lead_finance  ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance_audit ENABLE ROW LEVEL SECURITY;

-- 9a. SELECT — manager/superadmin only; partner_operator denied.
--     NO is_archived filter: archived (soft) won customers MUST count.
DROP POLICY IF EXISTS lead_finance_select ON lead_finance;
CREATE POLICY lead_finance_select ON lead_finance
  FOR SELECT
  USING (NOT is_partner_operator() AND is_manager_or_superadmin());

-- 9b. INSERT — manager/superadmin only for DIRECT table writes. Salesperson and
--     operator create the first row through fms_create_finance_row() (SECURITY
--     DEFINER, §7a), never by direct PostgREST INSERT — so no non-manager role can
--     write an arbitrary finance row (any lead_id / any amount) straight to the
--     table. partner_operator denied. (Backfill + the RPCs run as owner/service
--     role and bypass this policy.)
DROP POLICY IF EXISTS lead_finance_insert ON lead_finance;
CREATE POLICY lead_finance_insert ON lead_finance
  FOR INSERT
  WITH CHECK (NOT is_partner_operator() AND is_manager_or_superadmin());

-- 9c. UPDATE — manager+ only for direct edits. Vacate+insert for non-managers
--     goes through fms_record_finance_change() (SECURITY DEFINER).
DROP POLICY IF EXISTS lead_finance_update ON lead_finance;
CREATE POLICY lead_finance_update ON lead_finance
  FOR UPDATE
  USING (NOT is_partner_operator() AND is_manager_or_superadmin())
  WITH CHECK (NOT is_partner_operator() AND is_manager_or_superadmin());

-- No DELETE policy: finance rows are never deleted (append-only + soft-vacate).

-- 9d. finance_audit — manager+ read only; writes via SECURITY DEFINER triggers/RPC.
DROP POLICY IF EXISTS finance_audit_select ON finance_audit;
CREATE POLICY finance_audit_select ON finance_audit
  FOR SELECT
  USING (NOT is_partner_operator() AND is_manager_or_superadmin());

-- ----------------------------------------------------------------------------
-- 10. Backfill — existing won customers (soft-archive aware)
-- ----------------------------------------------------------------------------
-- Archival is SOFT: won customers stay in `leads` (is_archived=true) when
-- archived after 80 days. A SINGLE pass over `leads` with NO is_archived filter
-- catches every won customer, archived or not. We do NOT scan archived_leads.
--
-- "Won" = funnel_status IN ('kapora-alindi','sozlesme-imzalandi') OR has_moved_in.
-- Skips (does NOT fabricate) null-room / unpriced-room customers; logged as
-- BACKFILL_SKIPPED for manual fix + idempotent re-run. discount=0, duration=9.
INSERT INTO lead_finance (lead_id, purchased_room, monthly_payment, discount, deal_duration)
SELECT l.uuid, ld.purchased_room, rt.default_price, 0, 9
FROM leads l
JOIN lead_details ld ON ld.lead_uuid = l.uuid
JOIN room_types rt   ON rt.id = ld.purchased_room
WHERE l.is_deleted = false
  AND (l.funnel_status IN ('kapora-alindi','sozlesme-imzalandi') OR l.has_moved_in = true)
  AND ld.purchased_room IS NOT NULL
  AND rt.default_price IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM lead_finance lf
    WHERE lf.lead_id = l.uuid AND lf.vacated_at IS NULL
  );

INSERT INTO finance_audit(actor_id, entity, entity_id, field, old_value, new_value)
SELECT NULL, 'lead_finance', l.uuid, 'BACKFILL_SKIPPED', NULL,
  CASE WHEN ld.purchased_room IS NULL THEN 'no purchased_room'
       ELSE 'room has no default_price' END
FROM leads l
JOIN lead_details ld ON ld.lead_uuid = l.uuid
LEFT JOIN room_types rt ON rt.id = ld.purchased_room
WHERE l.is_deleted = false
  AND (l.funnel_status IN ('kapora-alindi','sozlesme-imzalandi') OR l.has_moved_in = true)
  AND (ld.purchased_room IS NULL OR rt.default_price IS NULL)
  AND NOT EXISTS (
    SELECT 1 FROM lead_finance lf
    WHERE lf.lead_id = l.uuid AND lf.vacated_at IS NULL
  );

COMMIT;

-- ============================================================================
-- POST-MIGRATION CHECKS (run manually)
-- ============================================================================
-- SELECT column_name FROM information_schema.columns
--   WHERE table_name='room_types' AND column_name='default_price';
-- SELECT column_name FROM information_schema.columns
--   WHERE table_name='partners' AND column_name='commission_percentage';
-- SELECT to_regclass('public.lead_finance'), to_regclass('public.finance_audit');
-- SELECT proname FROM pg_proc WHERE proname IN
--   ('fms_revenue_breakdown','fms_create_finance_row','fms_record_finance_change',
--    'fn_finance_actor');
-- -- RPCs must NOT be EXECUTEable by anon/authenticated (expect no rows):
-- SELECT p.proname, r.rolname
--   FROM pg_proc p
--   CROSS JOIN LATERAL aclexplode(p.proacl) a
--   JOIN pg_roles r ON r.oid = a.grantee
--   WHERE p.proname IN ('fms_create_finance_row','fms_record_finance_change',
--                       'fms_revenue_breakdown')
--     AND r.rolname IN ('anon','authenticated','public') AND a.privilege_type='EXECUTE';
-- -- VIEW must be security_invoker (expect si = true):
-- SELECT c.relname, (c.reloptions @> ARRAY['security_invoker=true']) AS si
--   FROM pg_class c WHERE c.relname='active_finance';
-- SELECT indexname FROM pg_indexes
--   WHERE tablename='lead_finance' AND indexname='idx_lead_finance_one_active';
-- -- FK must be RESTRICT:
-- SELECT pg_get_constraintdef(oid) FROM pg_constraint
--   WHERE conrelid='lead_details'::regclass AND contype='f'
--     AND pg_get_constraintdef(oid) ILIKE '%room_types%';
-- SELECT policyname FROM pg_policies WHERE tablename='lead_finance';
-- SELECT count(*) AS finance_rows FROM lead_finance WHERE vacated_at IS NULL;
-- SELECT count(*) AS skipped FROM finance_audit WHERE field='BACKFILL_SKIPPED';
--
-- THEN: pnpm gen:types  AND  Supabase get_advisors
--   (confirm NO security_definer_view warning on active_finance)
-- ============================================================================
