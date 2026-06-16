-- Migration 0084: room_position enum and rooms table (P16 property_id uniqueness).

CREATE TYPE room_position AS ENUM ('corner', 'middle');

CREATE TABLE rooms (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id   UUID NOT NULL REFERENCES properties(id) ON DELETE RESTRICT,
  room_type_id  UUID NOT NULL REFERENCES room_types(id) ON DELETE RESTRICT,
  room_number   TEXT NOT NULL,
  floor         INT4 NOT NULL,
  size          NUMERIC,
  room_position room_position,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (property_id, room_number)
);

CREATE INDEX idx_rooms_property ON rooms(property_id);
CREATE INDEX idx_rooms_type ON rooms(room_type_id);
CREATE INDEX idx_rooms_floor ON rooms(floor);

COMMENT ON TABLE rooms IS 'Physical rooms for PMS placement. property_id denormalized from room_types.hotel_id.';
COMMENT ON COLUMN rooms.property_id IS 'Set from room_types.hotel_id at insert; immutable after write.';

CREATE OR REPLACE FUNCTION set_room_property_id()
RETURNS TRIGGER AS $$
BEGIN
  SELECT hotel_id INTO NEW.property_id
  FROM room_types
  WHERE id = NEW.room_type_id;

  IF NEW.property_id IS NULL THEN
    RAISE EXCEPTION 'room_type_id % not found', NEW.room_type_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_rooms_set_property_id
  BEFORE INSERT OR UPDATE OF room_type_id ON rooms
  FOR EACH ROW
  EXECUTE FUNCTION set_room_property_id();
