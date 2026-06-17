-- Migration 0094: Partner access RLS policies and write-constraint triggers — Phase B
-- Adds additive RLS policies for the partner_operator role on every lead-keyed table.
-- These policies sit alongside existing Univotel-staff policies; they do NOT replace them.
-- The cascade function lead_partner_owner() (migration 0093) is the single predicate used here.
--
-- SECURITY REVIEW NOTE: every lead-related table that exists must appear in this file or
-- have a documented reason it doesn't. Missing a table is a data leak.

-- ─── SECTION 1: Write-constraint triggers ─────────────────────────────────────
-- Applied before RLS policies so triggers are in place for all subsequent write checks.

-- Trigger 1: interested_property_ids must only contain the partner's own properties
CREATE OR REPLACE FUNCTION enforce_partner_interested_scope() RETURNS trigger AS $$
BEGIN
  IF is_partner_operator() THEN
    IF EXISTS (
      SELECT 1 FROM unnest(NEW.interested_property_ids) pid
      LEFT JOIN properties p ON p.id = pid
      WHERE p.partner_id IS DISTINCT FROM current_partner_id()
    ) THEN
      RAISE EXCEPTION 'PARTNER_SCOPE: interested properties must belong to your partner';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS trg_partner_interested_scope ON lead_details;
CREATE TRIGGER trg_partner_interested_scope
  BEFORE INSERT OR UPDATE ON lead_details
  FOR EACH ROW EXECUTE FUNCTION enforce_partner_interested_scope();

-- Trigger 2: purchased_room must belong to the partner's own property
CREATE OR REPLACE FUNCTION enforce_partner_purchased_room_scope() RETURNS trigger AS $$
BEGIN
  IF is_partner_operator() AND NEW.purchased_room IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM room_types rt
      JOIN properties p ON p.id = rt.hotel_id
      WHERE rt.id = NEW.purchased_room AND p.partner_id = current_partner_id()
    ) THEN
      RAISE EXCEPTION 'PARTNER_SCOPE: purchased_room must belong to your partner property';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS trg_partner_purchased_room_scope ON lead_details;
CREATE TRIGGER trg_partner_purchased_room_scope
  BEFORE INSERT OR UPDATE OF purchased_room ON lead_details
  FOR EACH ROW EXECUTE FUNCTION enforce_partner_purchased_room_scope();

-- Trigger 3: block loss / archive / reassignment on UPDATE for partner operators.
-- This enforces the "no destructive action" rule where WITH CHECK on OLD.* isn't
-- reliably available in all policy versions.
CREATE OR REPLACE FUNCTION enforce_partner_lead_update_limits() RETURNS trigger AS $$
BEGIN
  IF is_partner_operator() THEN
    IF NEW.funnel_status = 'lost' THEN
      RAISE EXCEPTION 'PARTNER_FORBIDDEN: cannot mark lead as lost';
    END IF;
    IF NEW.is_archived = true THEN
      RAISE EXCEPTION 'PARTNER_FORBIDDEN: cannot archive a lead';
    END IF;
    IF NEW.is_deleted = true THEN
      RAISE EXCEPTION 'PARTNER_FORBIDDEN: cannot delete a lead';
    END IF;
    IF NEW.assigned_to IS DISTINCT FROM OLD.assigned_to THEN
      RAISE EXCEPTION 'PARTNER_FORBIDDEN: cannot reassign a lead';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS trg_partner_lead_update_limits ON leads;
CREATE TRIGGER trg_partner_lead_update_limits
  BEFORE UPDATE ON leads
  FOR EACH ROW EXECUTE FUNCTION enforce_partner_lead_update_limits();

-- ─── SECTION 2: leads ─────────────────────────────────────────────────────────

-- SELECT: partner sees cascade-owned leads (not deleted)
CREATE POLICY partner_select_leads ON leads
  FOR SELECT TO authenticated
  USING (
    is_partner_operator()
    AND is_deleted = false
    AND lead_partner_owner(uuid) = current_partner_id()
  );

-- INSERT: partner can create manual leads only (scope enforced by trigger on lead_details)
CREATE POLICY partner_insert_leads ON leads
  FOR INSERT TO authenticated
  WITH CHECK (
    is_partner_operator()
    AND lead_source = 'manual'
  );

-- UPDATE: no deletion, no archiving, no loss, no reassignment (all enforced by trigger above)
CREATE POLICY partner_update_leads ON leads
  FOR UPDATE TO authenticated
  USING (
    is_partner_operator()
    AND is_deleted = false
    AND lead_partner_owner(uuid) = current_partner_id()
  )
  WITH CHECK (
    is_partner_operator()
    AND is_deleted = false
    AND is_archived = false
    AND funnel_status <> 'lost'
  );

-- No DELETE policy for partner_operator — RLS denies by default.

-- ─── SECTION 3: lead_details ──────────────────────────────────────────────────

CREATE POLICY partner_select_lead_details ON lead_details
  FOR SELECT TO authenticated
  USING (
    is_partner_operator()
    AND lead_partner_owner(lead_uuid) = current_partner_id()
  );

CREATE POLICY partner_insert_lead_details ON lead_details
  FOR INSERT TO authenticated
  WITH CHECK (
    is_partner_operator()
    AND lead_partner_owner(lead_uuid) = current_partner_id()
  );

CREATE POLICY partner_update_lead_details ON lead_details
  FOR UPDATE TO authenticated
  USING (
    is_partner_operator()
    AND lead_partner_owner(lead_uuid) = current_partner_id()
  )
  WITH CHECK (
    is_partner_operator()
    AND lead_partner_owner(lead_uuid) = current_partner_id()
  );

-- ─── SECTION 4: contact_history ──────────────────────────────────────────────

CREATE POLICY partner_select_contact_history ON contact_history
  FOR SELECT TO authenticated
  USING (
    is_partner_operator()
    AND lead_partner_owner(lead_uuid) = current_partner_id()
  );

CREATE POLICY partner_insert_contact_history ON contact_history
  FOR INSERT TO authenticated
  WITH CHECK (
    is_partner_operator()
    AND lead_partner_owner(lead_uuid) = current_partner_id()
  );

-- ─── SECTION 5: visits ───────────────────────────────────────────────────────
-- Partner can log visits only for their own properties.

CREATE POLICY partner_select_visits ON visits
  FOR SELECT TO authenticated
  USING (
    is_partner_operator()
    AND lead_partner_owner(lead_uuid) = current_partner_id()
  );

CREATE POLICY partner_insert_visits ON visits
  FOR INSERT TO authenticated
  WITH CHECK (
    is_partner_operator()
    AND property_belongs_to_current_partner(property_id)
  );

CREATE POLICY partner_update_visits ON visits
  FOR UPDATE TO authenticated
  USING (
    is_partner_operator()
    AND property_belongs_to_current_partner(property_id)
  )
  WITH CHECK (
    is_partner_operator()
    AND property_belongs_to_current_partner(property_id)
  );

-- ─── SECTION 6: tasks ────────────────────────────────────────────────────────
-- Partner can see and create tasks on their leads.
-- Tasks are assigned to a salesperson; partner_operator assigns to themselves.

CREATE POLICY partner_select_tasks ON tasks
  FOR SELECT TO authenticated
  USING (
    is_partner_operator()
    AND lead_partner_owner(lead_uuid) = current_partner_id()
  );

CREATE POLICY partner_insert_tasks ON tasks
  FOR INSERT TO authenticated
  WITH CHECK (
    is_partner_operator()
    AND lead_partner_owner(lead_uuid) = current_partner_id()
    AND assigned_to = auth.uid()
  );

CREATE POLICY partner_update_tasks ON tasks
  FOR UPDATE TO authenticated
  USING (
    is_partner_operator()
    AND lead_partner_owner(lead_uuid) = current_partner_id()
    AND assigned_to = auth.uid()
  )
  WITH CHECK (
    is_partner_operator()
    AND lead_partner_owner(lead_uuid) = current_partner_id()
    AND assigned_to = auth.uid()
  );

-- ─── SECTION 7: lead_messages ────────────────────────────────────────────────
-- READ ONLY — partner can view conversation history for their leads.

CREATE POLICY partner_select_lead_messages ON lead_messages
  FOR SELECT TO authenticated
  USING (
    is_partner_operator()
    AND lead_partner_owner(lead_uuid) = current_partner_id()
  );

-- ─── SECTION 8: lead_stage_history ───────────────────────────────────────────
-- READ ONLY — partner can see the funnel trail for their leads.

CREATE POLICY partner_select_stage_history ON lead_stage_history
  FOR SELECT TO authenticated
  USING (
    is_partner_operator()
    AND lead_partner_owner(lead_uuid) = current_partner_id()
  );

-- ─── SECTION 9: lead_pins ────────────────────────────────────────────────────
-- Already scoped to agent_id = auth.uid() for ALL; no additional policy needed.
-- A partner_operator can pin/unpin their own leads via the existing policy.

-- ─── SECTION 10: notifications ───────────────────────────────────────────────
-- No policy added: partner_operator gets no notifications.
-- The existing manager-only policy already excludes them.

-- ─── SECTION 11: recent_searches ─────────────────────────────────────────────
-- No policy added: partner_operator cannot use quick-search.
-- The existing per-agent policy is fine but the RPC itself is blocked (Section 14).

-- ─── SECTION 12: properties — split staff vs partner ────────────────────────
-- Replace the blanket authenticated SELECT with separate staff and partner policies
-- so partners only see their own properties.

DROP POLICY IF EXISTS properties_select_authenticated ON properties;

-- Univotel staff: see all active properties (unchanged behaviour)
CREATE POLICY properties_select_staff ON properties
  FOR SELECT TO authenticated
  USING (NOT is_partner_operator());

-- Partner: see only their own properties
CREATE POLICY properties_select_partner ON properties
  FOR SELECT TO authenticated
  USING (
    is_partner_operator()
    AND partner_id = current_partner_id()
  );

-- Manager write policy is unchanged (already exists from migration 0008).

-- ─── SECTION 13: room_types and rooms — scoped to partner's properties ────────

-- room_types
DROP POLICY IF EXISTS room_types_select_authenticated ON room_types;

CREATE POLICY room_types_select_staff ON room_types
  FOR SELECT TO authenticated
  USING (NOT is_partner_operator());

CREATE POLICY room_types_select_partner ON room_types
  FOR SELECT TO authenticated
  USING (
    is_partner_operator()
    AND EXISTS (
      SELECT 1 FROM properties p
      WHERE p.id = hotel_id AND p.partner_id = current_partner_id()
    )
  );

-- rooms
DROP POLICY IF EXISTS rooms_select_authenticated ON rooms;

CREATE POLICY rooms_select_staff ON rooms
  FOR SELECT TO authenticated
  USING (NOT is_partner_operator());

CREATE POLICY rooms_select_partner ON rooms
  FOR SELECT TO authenticated
  USING (
    is_partner_operator()
    AND property_belongs_to_current_partner(property_id)
  );

-- rooms write: partner can write their own rooms (place/admin) — existing is_pms_writer() check
-- already covers operator/manager/superadmin; add partner_operator too.
DROP POLICY IF EXISTS rooms_write_pms ON rooms;
CREATE POLICY rooms_write_pms ON rooms
  FOR INSERT TO authenticated
  WITH CHECK (
    is_pms_writer()
    OR (is_partner_operator() AND property_belongs_to_current_partner(property_id))
  );

DROP POLICY IF EXISTS rooms_update_pms ON rooms;
CREATE POLICY rooms_update_pms ON rooms
  FOR UPDATE TO authenticated
  USING (
    is_pms_writer()
    OR (is_partner_operator() AND property_belongs_to_current_partner(property_id))
  )
  WITH CHECK (
    is_pms_writer()
    OR (is_partner_operator() AND property_belongs_to_current_partner(property_id))
  );

-- ─── SECTION 14: lead_rooms ──────────────────────────────────────────────────
-- Partner can place/vacate only in their own properties' rooms.

DROP POLICY IF EXISTS lead_rooms_select_authenticated ON lead_rooms;

CREATE POLICY lead_rooms_select_staff ON lead_rooms
  FOR SELECT TO authenticated
  USING (NOT is_partner_operator());

CREATE POLICY lead_rooms_select_partner ON lead_rooms
  FOR SELECT TO authenticated
  USING (
    is_partner_operator()
    AND EXISTS (
      SELECT 1 FROM rooms r
      WHERE r.id = room_id AND property_belongs_to_current_partner(r.property_id)
    )
  );

DROP POLICY IF EXISTS lead_rooms_insert_pms ON lead_rooms;
CREATE POLICY lead_rooms_insert_pms ON lead_rooms
  FOR INSERT TO authenticated
  WITH CHECK (
    is_pms_writer()
    OR (
      is_partner_operator()
      AND EXISTS (
        SELECT 1 FROM rooms r
        WHERE r.id = room_id AND property_belongs_to_current_partner(r.property_id)
      )
    )
  );

DROP POLICY IF EXISTS lead_rooms_update_pms ON lead_rooms;
CREATE POLICY lead_rooms_update_pms ON lead_rooms
  FOR UPDATE TO authenticated
  USING (
    is_pms_writer()
    OR (
      is_partner_operator()
      AND EXISTS (
        SELECT 1 FROM rooms r
        WHERE r.id = room_id AND property_belongs_to_current_partner(r.property_id)
      )
    )
  )
  WITH CHECK (
    is_pms_writer()
    OR (
      is_partner_operator()
      AND EXISTS (
        SELECT 1 FROM rooms r
        WHERE r.id = room_id AND property_belongs_to_current_partner(r.property_id)
      )
    )
  );

-- ─── SECTION 15: search_leads_global RPC — block for partner_operator ────────
-- The RPC is SECURITY DEFINER and bypasses RLS, so it must actively reject partners.

CREATE OR REPLACE FUNCTION search_leads_global(
  q TEXT,
  result_limit INT DEFAULT 10
)
RETURNS TABLE (
  uuid            UUID,
  lead_name       TEXT,
  display_name    TEXT,
  lead_phone      TEXT,
  funnel_status   TEXT,
  assigned_to     UUID,
  assignee_name   TEXT,
  last_contact_at TIMESTAMPTZ,
  message_from    TEXT,
  is_inactive     BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Partner operators cannot use widened search — it bypasses RLS scoping.
  IF is_partner_operator() THEN
    RAISE EXCEPTION 'PARTNER_FORBIDDEN: quick search not available for partner accounts';
  END IF;

  RETURN QUERY
  SELECT
    l.uuid,
    l.lead_name,
    l.display_name,
    l.lead_phone,
    l.funnel_status,
    l.assigned_to,
    s.full_name AS assignee_name,
    l.last_contact_at,
    l.message_from,
    (
      l.funnel_status IN ('lost', 'sozlesme-imzalandi')
      OR COALESCE(l.has_moved_in, false)
      OR COALESCE(l.is_24h_restricted, false)
    ) AS is_inactive
  FROM leads l
  LEFT JOIN salespeople s ON s.id = l.assigned_to
  WHERE
    l.is_deleted = false
    AND l.is_archived = false
    AND (
      l.lead_phone = q
      OR l.display_name  ILIKE '%' || q || '%'
      OR l.auto_logged_name ILIKE '%' || q || '%'
      OR l.lead_name     ILIKE '%' || q || '%'
    )
  ORDER BY
    (l.lead_phone = q) DESC,
    l.last_contact_at DESC NULLS LAST
  LIMIT result_limit;
END;
$$;

GRANT EXECUTE ON FUNCTION search_leads_global(TEXT, INT) TO authenticated;

-- ─── SECTION 16: salespeople — partner sees own row only ─────────────────────
-- Existing policy: SELECT own row OR manager sees all.
-- partner_operator is not a manager, so they already see only their own row.
-- No change needed — existing policy covers this correctly.

-- ─── GRANT summary ───────────────────────────────────────────────────────────
GRANT SELECT ON partners TO authenticated;
GRANT SELECT ON room_types TO authenticated;
GRANT SELECT, INSERT, UPDATE ON rooms TO authenticated;
GRANT SELECT, INSERT, UPDATE ON lead_rooms TO authenticated;
GRANT SELECT ON lead_messages TO authenticated;
GRANT SELECT ON lead_stage_history TO authenticated;
