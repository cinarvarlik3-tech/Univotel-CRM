-- Migration 0044: Individual physical rooms and availability cascade triggers.

CREATE TABLE property_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_type_id UUID NOT NULL,
  room_number TEXT NOT NULL,
  room_floor SMALLINT NOT NULL,
  current_occupants INTEGER NOT NULL DEFAULT 0,
  serviced_gender TEXT,
  is_available BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT property_rooms_room_type_id_fkey
    FOREIGN KEY (room_type_id) REFERENCES property_room_types (id) ON DELETE CASCADE,
  CONSTRAINT property_rooms_current_occupants_check
    CHECK (current_occupants >= 0),
  CONSTRAINT property_rooms_serviced_gender_check
    CHECK (serviced_gender = ANY (ARRAY['male'::text, 'female'::text, 'mixed'::text])),
  CONSTRAINT property_rooms_unique_number_per_type
    UNIQUE (room_type_id, room_number)
);

CREATE INDEX IF NOT EXISTS idx_property_rooms_room_type_id
  ON property_rooms (room_type_id);

CREATE INDEX IF NOT EXISTS idx_property_rooms_is_available
  ON property_rooms (is_available);

CREATE INDEX IF NOT EXISTS idx_property_rooms_serviced_gender
  ON property_rooms (serviced_gender);

CREATE INDEX IF NOT EXISTS idx_property_rooms_current_occupants
  ON property_rooms (current_occupants);

CREATE OR REPLACE FUNCTION set_property_rooms_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER property_rooms_updated_at
  BEFORE UPDATE ON property_rooms
  FOR EACH ROW
  EXECUTE PROCEDURE set_property_rooms_updated_at();

CREATE OR REPLACE FUNCTION cascade_room_availability()
RETURNS TRIGGER AS $$
DECLARE
  v_occupant_count INTEGER;
  v_property_id UUID;
  v_available_room_count INTEGER;
  v_available_room_type_count INTEGER;
BEGIN
  -- STEP 1: Mark room unavailable when at or over capacity.
  SELECT occupant_count INTO v_occupant_count
  FROM property_room_types
  WHERE id = NEW.room_type_id;

  IF NEW.current_occupants >= v_occupant_count AND NEW.is_available = true THEN
    UPDATE property_rooms
    SET is_available = false
    WHERE id = NEW.id;
  END IF;

  -- STEP 2: Cascade to room type when all rooms of this type are unavailable.
  SELECT COUNT(*) INTO v_available_room_count
  FROM property_rooms
  WHERE room_type_id = NEW.room_type_id
    AND is_available = true;

  IF v_available_room_count = 0 THEN
    UPDATE property_room_types
    SET is_available = false
    WHERE id = NEW.room_type_id;
  END IF;

  -- STEP 3: Cascade to property when all room types are unavailable.
  SELECT property_id INTO v_property_id
  FROM property_room_types
  WHERE id = NEW.room_type_id;

  SELECT COUNT(*) INTO v_available_room_type_count
  FROM property_room_types
  WHERE property_id = v_property_id
    AND is_available = true;

  IF v_available_room_type_count = 0 THEN
    UPDATE properties
    SET is_available = false
    WHERE id = v_property_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER cascade_room_availability_trigger
  AFTER UPDATE OF current_occupants, is_available ON property_rooms
  FOR EACH ROW
  EXECUTE PROCEDURE cascade_room_availability();
