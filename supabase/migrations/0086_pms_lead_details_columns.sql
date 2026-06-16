-- Migration 0086: purchased_room and placement_note on lead_details.

ALTER TABLE lead_details
  ADD COLUMN IF NOT EXISTS purchased_room UUID REFERENCES room_types(id) ON DELETE SET NULL;

ALTER TABLE lead_details
  ADD COLUMN IF NOT EXISTS placement_note TEXT;

CREATE INDEX IF NOT EXISTS idx_lead_details_purchased_room
  ON lead_details(purchased_room) WHERE purchased_room IS NOT NULL;

COMMENT ON COLUMN lead_details.purchased_room IS 'Committed room type UUID (kapora onward). Source for PMS type-match.';
COMMENT ON COLUMN lead_details.placement_note IS 'Operator-written placement note; readable by all authenticated users.';
