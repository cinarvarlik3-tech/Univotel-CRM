-- Migration 0083: PMS room_types table mirrored from univotel (UUIDs preserved).

CREATE TABLE room_types (
  id          UUID PRIMARY KEY,
  hotel_id    UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  size_m2     NUMERIC,
  capacity    INT4 NOT NULL,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_room_types_hotel ON room_types(hotel_id);
CREATE INDEX idx_room_types_is_active ON room_types(is_active) WHERE is_active = true;

COMMENT ON TABLE room_types IS 'Room type catalog synced from univotel room_types. capacity maps from person_count.';
COMMENT ON COLUMN room_types.capacity IS 'Max occupants per room of this type; joined at read time for occupancy checks.';
