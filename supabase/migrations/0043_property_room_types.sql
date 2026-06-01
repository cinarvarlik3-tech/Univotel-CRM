-- Migration 0043: Room type catalog per property (pricing, amenities, capacity).

CREATE TABLE property_room_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL,
  room_name TEXT NOT NULL,
  room_category TEXT NOT NULL,
  occupant_count INTEGER NOT NULL,
  room_price NUMERIC(10, 2) NOT NULL,
  room_count INTEGER NOT NULL,
  housing_type TEXT NOT NULL,
  room_size TEXT,
  has_kitchen BOOLEAN NOT NULL DEFAULT false,
  has_balcony BOOLEAN NOT NULL DEFAULT false,
  has_laundry BOOLEAN NOT NULL DEFAULT false,
  is_duplex BOOLEAN NOT NULL DEFAULT false,
  amenities JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_available BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT property_room_types_property_id_fkey
    FOREIGN KEY (property_id) REFERENCES properties (id) ON DELETE CASCADE,
  CONSTRAINT property_room_types_room_category_check
    CHECK (room_category = ANY (ARRAY['single'::text, 'double'::text, 'triple'::text, 'quad'::text])),
  CONSTRAINT property_room_types_housing_type_check
    CHECK (housing_type = ANY (ARRAY['1+0'::text, '1+1'::text, '2+1'::text, '3+1'::text, '4+1'::text])),
  CONSTRAINT property_room_types_unique_name_per_property
    UNIQUE (property_id, room_name)
);

CREATE INDEX IF NOT EXISTS idx_property_room_types_property_id
  ON property_room_types (property_id);

CREATE INDEX IF NOT EXISTS idx_property_room_types_is_available
  ON property_room_types (is_available);

CREATE INDEX IF NOT EXISTS idx_property_room_types_room_category
  ON property_room_types (room_category);

CREATE INDEX IF NOT EXISTS idx_property_room_types_room_price
  ON property_room_types (room_price);

CREATE OR REPLACE FUNCTION set_property_room_types_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER property_room_types_updated_at
  BEFORE UPDATE ON property_room_types
  FOR EACH ROW
  EXECUTE PROCEDURE set_property_room_types_updated_at();
