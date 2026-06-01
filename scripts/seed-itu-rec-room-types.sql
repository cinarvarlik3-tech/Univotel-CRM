-- Seed property_room_types + property_rooms for active ITU properties so the
-- Make.com "Univotel Hotel Recommendation" hard_filtered query can return rows.
--
-- Matches lead profile used in testing:
--   campus ITU, room_category double, budget_max <= 45000, gender male (property: male|mixed)
--
-- Run in Supabase SQL Editor (production). Safe to re-run (skips existing seeds).

-- ---------------------------------------------------------------------------
-- 0) Preview ITU properties that will receive room types
-- ---------------------------------------------------------------------------
SELECT id, hotel_name, district, serviced_gender, serviced_schools
FROM properties
WHERE is_available = true
  AND status = 'active'
  AND serviced_schools @> ARRAY['ITU']
  AND (serviced_gender = 'male' OR serviced_gender = 'mixed')
ORDER BY hotel_name;

-- ---------------------------------------------------------------------------
-- 1) Room types: double, <= 45000 TRY, available
-- ---------------------------------------------------------------------------
WITH itu_props AS (
  SELECT id, hotel_name
  FROM properties
  WHERE is_available = true
    AND status = 'active'
    AND serviced_schools @> ARRAY['ITU']
    AND (serviced_gender = 'male' OR serviced_gender = 'mixed')
),
inserted_types AS (
  INSERT INTO property_room_types (
    property_id,
    room_name,
    room_category,
    occupant_count,
    room_price,
    room_count,
    housing_type,
    is_available
  )
  SELECT
    p.id,
    'Çift Kişilik — öneri seed',
    'double',
    2,
    42000.00,
    1,
    '1+1',
    true
  FROM itu_props p
  WHERE NOT EXISTS (
    SELECT 1
    FROM property_room_types prt
    WHERE prt.property_id = p.id
      AND prt.room_category = 'double'
      AND prt.is_available = true
      AND prt.room_price <= 45000
  )
  RETURNING id AS room_type_id, property_id, room_name
)
INSERT INTO property_rooms (
  room_type_id,
  room_number,
  room_floor,
  current_occupants,
  serviced_gender,
  is_available
)
SELECT
  it.room_type_id,
  '101',
  1,
  0,
  'male',
  true
FROM inserted_types it
WHERE NOT EXISTS (
  SELECT 1
  FROM property_rooms pr
  WHERE pr.room_type_id = it.room_type_id
    AND pr.room_number = '101'
);

-- ---------------------------------------------------------------------------
-- 2) Verify (same steps as recommendation diagnostics)
-- ---------------------------------------------------------------------------
WITH lead AS (
  SELECT
    'male'::text AS gender,
    'ITU'::text AS campus,
    45000::numeric AS budget_max,
    'double'::text AS room_category,
    'Besiktas'::text AS district_preference
)
SELECT
  (SELECT COUNT(*) FROM properties p
   CROSS JOIN lead l
   WHERE p.is_available = true
     AND p.status = 'active'
     AND (p.serviced_gender = l.gender OR p.serviced_gender = 'mixed')
     AND p.serviced_schools @> ARRAY[l.campus]) AS step_schools,
  (SELECT COUNT(*) FROM properties p
   CROSS JOIN lead l
   WHERE p.is_available = true
     AND p.status = 'active'
     AND (p.serviced_gender = l.gender OR p.serviced_gender = 'mixed')
     AND p.serviced_schools @> ARRAY[l.campus]
     AND EXISTS (
       SELECT 1 FROM property_room_types prt
       WHERE prt.property_id = p.id
         AND prt.is_available = true
         AND prt.room_category = l.room_category
         AND prt.room_price <= l.budget_max)) AS step_room_type_price,
  (SELECT COUNT(*) FROM properties p
   CROSS JOIN lead l
   WHERE p.is_available = true
     AND p.status = 'active'
     AND (p.serviced_gender = l.gender OR p.serviced_gender = 'mixed')
     AND p.serviced_schools @> ARRAY[l.campus]
     AND EXISTS (
       SELECT 1 FROM property_room_types prt
       WHERE prt.property_id = p.id
         AND prt.is_available = true
         AND prt.room_category = l.room_category
         AND prt.room_price <= l.budget_max
         AND EXISTS (
           SELECT 1 FROM property_rooms pr
           WHERE pr.room_type_id = prt.id AND pr.is_available = true))) AS step_with_rooms;

-- ---------------------------------------------------------------------------
-- 3) Room catalog detail for ITU hotels
-- ---------------------------------------------------------------------------
SELECT
  p.hotel_name,
  p.district,
  prt.room_category,
  prt.room_price,
  prt.is_available AS type_available,
  (SELECT COUNT(*) FROM property_rooms pr
   WHERE pr.room_type_id = prt.id AND pr.is_available = true) AS open_rooms
FROM properties p
JOIN property_room_types prt ON prt.property_id = p.id
WHERE p.serviced_schools @> ARRAY['ITU']
  AND p.is_available = true
  AND p.status = 'active'
ORDER BY p.hotel_name, prt.room_price;
