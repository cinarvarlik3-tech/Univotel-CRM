-- Migration 0093: Partner access foundation — Phase A
-- Creates the partner tenancy layer: partners table, partner_id on properties and salespeople,
-- interested_property_ids UUID[] alongside existing interested_hotel TEXT[], and the three
-- SQL helper functions + lead_partner_owner() cascade that RLS (migration 0094) depends on.

-- ─── 1. partners table ───────────────────────────────────────────────────────
CREATE TABLE partners (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  is_active  BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO partners (name) VALUES ('Academic House');

-- ─── 2. partner_id on properties ─────────────────────────────────────────────
ALTER TABLE properties
  ADD COLUMN partner_id UUID REFERENCES partners(id) ON DELETE SET NULL;

CREATE INDEX idx_properties_partner ON properties(partner_id);

-- ─── 3. partner_id on salespeople + new role value ───────────────────────────
ALTER TABLE salespeople
  ADD COLUMN partner_id UUID REFERENCES partners(id) ON DELETE SET NULL;

ALTER TABLE salespeople DROP CONSTRAINT IF EXISTS salespeople_role_check;
ALTER TABLE salespeople ADD CONSTRAINT salespeople_role_check
  CHECK (role IN ('salesperson', 'operator', 'manager', 'superadmin', 'partner_operator'));

-- partner_operator must always be linked to a partner
ALTER TABLE salespeople ADD CONSTRAINT partner_operator_requires_partner_id
  CHECK (role <> 'partner_operator' OR partner_id IS NOT NULL);

COMMENT ON COLUMN salespeople.role IS
  'salesperson=CRM only; operator=CRM+PMS write; manager/superadmin inherit operator; partner_operator=partner-scoped CRM+PMS.';

COMMENT ON COLUMN salespeople.partner_id IS
  'Non-null for partner_operator accounts; identifies which partner they belong to.';

-- ─── 4. interested_property_ids UUID[] — parallel UUID column ─────────────────
-- interested_hotel TEXT[] stays for Chatwoot compat. This UUID column is derived
-- from it via trigger and is what the partner cascade uses.
ALTER TABLE lead_details
  ADD COLUMN interested_property_ids UUID[] NOT NULL DEFAULT '{}';

CREATE INDEX idx_lead_details_interested_gin
  ON lead_details USING GIN (interested_property_ids);

-- Sync trigger: whenever interested_hotel changes, resolve names → UUIDs
CREATE OR REPLACE FUNCTION sync_interested_property_ids() RETURNS trigger AS $$
BEGIN
  SELECT COALESCE(ARRAY_AGG(p.id ORDER BY p.id), '{}')
  INTO NEW.interested_property_ids
  FROM unnest(NEW.interested_hotel) hn
  JOIN properties p ON p.hotel_name = hn;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_sync_interested_property_ids
  BEFORE INSERT OR UPDATE OF interested_hotel ON lead_details
  FOR EACH ROW EXECUTE FUNCTION sync_interested_property_ids();

-- Backfill existing rows
UPDATE lead_details ld
SET interested_property_ids = (
  SELECT COALESCE(ARRAY_AGG(p.id ORDER BY p.id), '{}')
  FROM unnest(ld.interested_hotel) hn
  JOIN properties p ON p.hotel_name = hn
);

-- ─── 5. SQL helper functions ──────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION current_partner_id() RETURNS UUID AS $$
  SELECT partner_id FROM salespeople WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

COMMENT ON FUNCTION current_partner_id() IS
  'Returns the partner_id of the currently authenticated user, or NULL for Univotel staff.';

CREATE OR REPLACE FUNCTION is_partner_operator() RETURNS BOOLEAN AS $$
  SELECT get_user_role() = 'partner_operator';
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

COMMENT ON FUNCTION is_partner_operator() IS
  'True when the current user has the partner_operator role.';

CREATE OR REPLACE FUNCTION property_belongs_to_current_partner(p_property_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM properties
    WHERE id = p_property_id AND partner_id = current_partner_id()
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

COMMENT ON FUNCTION property_belongs_to_current_partner(UUID) IS
  'True when the given property belongs to the current partner_operator''s partner.';

-- ─── 6. lead_partner_owner() — precedence cascade ────────────────────────────
-- Returns the partner_id that "owns" a lead via the furthest-along stage:
--   1. purchased_room (room_type → hotel → partner) wins if set
--   2. Most recent visit's property's partner
--   3. Any interested property's partner (first match)
-- Returns NULL for Univotel-owned leads (no partner).
CREATE OR REPLACE FUNCTION lead_partner_owner(p_lead_uuid UUID) RETURNS UUID AS $$
DECLARE
  v_partner UUID;
BEGIN
  -- 1. PURCHASED ROOM
  SELECT p.partner_id INTO v_partner
  FROM lead_details ld
  JOIN room_types rt ON rt.id = ld.purchased_room
  JOIN properties p ON p.id = rt.hotel_id
  WHERE ld.lead_uuid = p_lead_uuid AND ld.purchased_room IS NOT NULL;
  IF FOUND THEN RETURN v_partner; END IF;

  -- 2. MOST RECENT VISIT
  SELECT p.partner_id INTO v_partner
  FROM visits v
  JOIN properties p ON p.id = v.property_id
  WHERE v.lead_uuid = p_lead_uuid
  ORDER BY v.scheduled_date DESC NULLS LAST
  LIMIT 1;
  IF FOUND THEN RETURN v_partner; END IF;

  -- 3. INTERESTED PROPERTIES
  SELECT p.partner_id INTO v_partner
  FROM lead_details ld
  JOIN properties p ON p.id = ANY(ld.interested_property_ids)
  WHERE ld.lead_uuid = p_lead_uuid AND p.partner_id IS NOT NULL
  LIMIT 1;
  IF FOUND THEN RETURN v_partner; END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

COMMENT ON FUNCTION lead_partner_owner(UUID) IS
  'Returns partner_id owning this lead via cascade: purchased_room > visit > interested. NULL = Univotel-owned.';
