-- Migration 0085: lead_rooms placement table with one active placement per lead.

CREATE TABLE lead_rooms (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id       UUID NOT NULL REFERENCES rooms(id) ON DELETE RESTRICT,
  lead_id       UUID NOT NULL REFERENCES leads(uuid) ON DELETE RESTRICT,
  placed_by     UUID REFERENCES salespeople(id) ON DELETE SET NULL,
  placed_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  vacated_at    TIMESTAMPTZ,
  vacated_by    UUID REFERENCES salespeople(id) ON DELETE SET NULL,
  vacate_reason TEXT CHECK (
    vacate_reason IS NULL OR vacate_reason IN ('removed', 'lost', 'relocated', 'type_changed')
  ),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_lead_rooms_room_active ON lead_rooms(room_id) WHERE vacated_at IS NULL;
CREATE INDEX idx_lead_rooms_lead_active ON lead_rooms(lead_id) WHERE vacated_at IS NULL;

CREATE UNIQUE INDEX uniq_active_placement_per_lead
  ON lead_rooms(lead_id) WHERE vacated_at IS NULL;

COMMENT ON TABLE lead_rooms IS 'Lead room placements. vacated_at IS NULL means active occupancy.';
COMMENT ON COLUMN lead_rooms.vacated_at IS 'NULL = active placement; set on remove/relocate/change/lost.';
