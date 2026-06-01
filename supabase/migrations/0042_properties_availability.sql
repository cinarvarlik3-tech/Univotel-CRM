-- Migration 0042: Add is_available to properties, drop redundant total_beds.

ALTER TABLE properties
  ADD COLUMN is_available BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE properties
  DROP COLUMN total_beds;
