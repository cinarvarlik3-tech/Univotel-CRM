-- Migration 0087: DB-level type-match and capacity enforcement on active placements.

CREATE OR REPLACE FUNCTION enforce_placement_type_match()
RETURNS TRIGGER AS $$
DECLARE
  v_room_type UUID;
  v_purchased UUID;
BEGIN
  IF NEW.vacated_at IS NOT NULL THEN
    RETURN NEW;
  END IF;

  SELECT room_type_id INTO v_room_type FROM rooms WHERE id = NEW.room_id;
  SELECT purchased_room INTO v_purchased FROM lead_details WHERE lead_uuid = NEW.lead_id;

  IF v_purchased IS NULL OR v_room_type IS DISTINCT FROM v_purchased THEN
    RAISE EXCEPTION 'PLACEMENT_TYPE_MISMATCH: lead purchased_room % does not match room type %', v_purchased, v_room_type;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_placement_type_match
  BEFORE INSERT OR UPDATE ON lead_rooms
  FOR EACH ROW
  EXECUTE FUNCTION enforce_placement_type_match();

CREATE OR REPLACE FUNCTION enforce_room_capacity()
RETURNS TRIGGER AS $$
DECLARE
  v_capacity INT4;
  v_active   INT4;
BEGIN
  IF NEW.vacated_at IS NOT NULL THEN
    RETURN NEW;
  END IF;

  SELECT rt.capacity INTO v_capacity
  FROM rooms r
  JOIN room_types rt ON rt.id = r.room_type_id
  WHERE r.id = NEW.room_id;

  SELECT count(*) INTO v_active
  FROM lead_rooms
  WHERE room_id = NEW.room_id
    AND vacated_at IS NULL
    AND id IS DISTINCT FROM NEW.id;

  IF v_active + 1 > v_capacity THEN
    RAISE EXCEPTION 'ROOM_AT_CAPACITY: room % full (% / %)', NEW.room_id, v_active, v_capacity;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_room_capacity
  BEFORE INSERT OR UPDATE ON lead_rooms
  FOR EACH ROW
  EXECUTE FUNCTION enforce_room_capacity();
