-- Migration 0079: Add home_property_id to salespeople for My Day Visits container.
--
-- Nullable FK to properties — NULL means "show all properties" and surfaces
-- the "Ana tesisini ayarla" hint on the salesperson's My Day Visits card.
-- Settable by the salesperson (own Ayarlar page) or a manager (admin view).

ALTER TABLE salespeople
  ADD COLUMN IF NOT EXISTS home_property_id UUID REFERENCES properties(id) ON DELETE SET NULL;

COMMENT ON COLUMN salespeople.home_property_id IS
  'Default property whose visits surface in the salesperson''s My Day Visits container. NULL = show all properties.';

-- Index for property-scoped queries.
CREATE INDEX IF NOT EXISTS idx_salespeople_home_property
  ON salespeople(home_property_id) WHERE home_property_id IS NOT NULL;
