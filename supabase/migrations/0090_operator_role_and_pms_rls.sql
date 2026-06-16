-- Migration 0090: operator role + PMS RLS (Phase F defense-in-depth).

ALTER TABLE salespeople DROP CONSTRAINT IF EXISTS salespeople_role_check;
ALTER TABLE salespeople ADD CONSTRAINT salespeople_role_check
  CHECK (role IN ('salesperson', 'operator', 'manager', 'superadmin'));

COMMENT ON COLUMN salespeople.role IS
  'salesperson = CRM only; operator = salesperson + PMS write; manager/superadmin inherit operator.';

CREATE OR REPLACE FUNCTION is_pms_writer()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM salespeople
    WHERE id = auth.uid()
      AND role IN ('operator', 'manager', 'superadmin')
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

-- room_types: authenticated read; writes via service role / sync only
ALTER TABLE room_types ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS room_types_select_authenticated ON room_types;
CREATE POLICY room_types_select_authenticated ON room_types
  FOR SELECT TO authenticated
  USING (true);

-- rooms: authenticated read; operator+ write
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS rooms_select_authenticated ON rooms;
CREATE POLICY rooms_select_authenticated ON rooms
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS rooms_write_pms ON rooms;
CREATE POLICY rooms_write_pms ON rooms
  FOR INSERT TO authenticated
  WITH CHECK (is_pms_writer());

DROP POLICY IF EXISTS rooms_update_pms ON rooms;
CREATE POLICY rooms_update_pms ON rooms
  FOR UPDATE TO authenticated
  USING (is_pms_writer())
  WITH CHECK (is_pms_writer());

-- lead_rooms: authenticated read; operator+ write (place / vacate)
ALTER TABLE lead_rooms ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS lead_rooms_select_authenticated ON lead_rooms;
CREATE POLICY lead_rooms_select_authenticated ON lead_rooms
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS lead_rooms_insert_pms ON lead_rooms;
CREATE POLICY lead_rooms_insert_pms ON lead_rooms
  FOR INSERT TO authenticated
  WITH CHECK (is_pms_writer());

DROP POLICY IF EXISTS lead_rooms_update_pms ON lead_rooms;
CREATE POLICY lead_rooms_update_pms ON lead_rooms
  FOR UPDATE TO authenticated
  USING (is_pms_writer())
  WITH CHECK (is_pms_writer());

GRANT SELECT ON room_types TO authenticated;
GRANT SELECT, INSERT, UPDATE ON rooms TO authenticated;
GRANT SELECT, INSERT, UPDATE ON lead_rooms TO authenticated;
