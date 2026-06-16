-- Migration 0082: Re-key CRM properties.id to match univotel hotels.id (P22).
-- Match criteria: hotel_name = univotel hotels.name (GK Regency Suites).
-- CRM-only seed rows (Univotel *, Test Otel) → status closed.
-- All univotel hotels inserted with preserved UUIDs.

BEGIN;

-- ── 1. GK Regency: insert canonical univotel row, remap FKs, drop old row ──
INSERT INTO properties (
  id, hotel_name, address, district, serviced_gender, serviced_schools,
  accepts_non_students, status, is_available, created_at, updated_at
)
SELECT
  'feb0a053-dfd6-430c-bde9-65d751effc88'::uuid,
  'GK Regency Suites',
  'Ergenekon Mahallesi Dolapdere Cad. N : 122, 34200 Şişli/İstanbul',
  'Şişli',
  COALESCE(old.serviced_gender, 'mixed'),
  COALESCE(old.serviced_schools, '{}'::text[]),
  COALESCE(old.accepts_non_students, false),
  'active',
  true,
  COALESCE(old.created_at, now()),
  now()
FROM properties old
WHERE old.id = 'ebd68110-f587-4998-ba20-aefc8c15ebb6'
ON CONFLICT (id) DO UPDATE SET
  hotel_name = EXCLUDED.hotel_name,
  address = EXCLUDED.address,
  district = EXCLUDED.district,
  status = 'active',
  is_available = true,
  updated_at = now();

UPDATE visits
SET property_id = 'feb0a053-dfd6-430c-bde9-65d751effc88'
WHERE property_id = 'ebd68110-f587-4998-ba20-aefc8c15ebb6';

UPDATE property_room_types
SET property_id = 'feb0a053-dfd6-430c-bde9-65d751effc88'
WHERE property_id = 'ebd68110-f587-4998-ba20-aefc8c15ebb6';

UPDATE salespeople
SET home_property_id = 'feb0a053-dfd6-430c-bde9-65d751effc88'
WHERE home_property_id = 'ebd68110-f587-4998-ba20-aefc8c15ebb6';

UPDATE salespeople
SET assigned_hotels = ARRAY(
  SELECT CASE
    WHEN x = 'ebd68110-f587-4998-ba20-aefc8c15ebb6'::uuid
      THEN 'feb0a053-dfd6-430c-bde9-65d751effc88'::uuid
    ELSE x
  END
  FROM unnest(assigned_hotels) AS x
)
WHERE 'ebd68110-f587-4998-ba20-aefc8c15ebb6'::uuid = ANY(assigned_hotels);

DELETE FROM properties WHERE id = 'ebd68110-f587-4998-ba20-aefc8c15ebb6';

-- ── 2. Insert remaining univotel hotels (UUIDs preserved) ──
INSERT INTO properties (id, hotel_name, address, district, status, is_available)
VALUES
  ('42e83935-9353-451b-baef-251e394bc182', 'Academia Residence', 'Kağıthane Merkez Mahallesi, Çobançeşme Caddesi, Sardunya Sokak No:4, 34406 Kağıthane/İstanbul', 'Kağıthane', 'active', true),
  ('0116ac1e-1aa9-49bb-aa45-11ff7e1d0ea2', 'Academia Seyrantepe Erkek Öğrenci Yurdu', 'Seyrantepe, Oğuzeli Sk No:24, 34418 Kağıthane/İstanbul', 'Kağıthane', 'active', true),
  ('fbf1c636-05fe-493a-a02e-e39811fddca4', 'Academia Vadi Öğrenci Yurdu', 'Ayazağa, 215. Sk. NO:4, 34418 Sarıyer/İstanbul', 'Sarıyer', 'active', true),
  ('ae91cb06-3a82-453a-b116-d4211ac849b5', 'Academic House Ataşehir Kız Öğrenci Yurdu', 'Küçükbakkalköy, Cengiz Topel Cd. No:5, 34636 Ataşehir/İstanbul', 'Ataşehir', 'active', true),
  ('7c5b61b4-2a1e-4b68-b76f-3c5824905d21', 'Academic House Beşiktaş Kız Öğrenci Yurdu', 'Türkali, Uzuncaova Cd. No:41, 34357 Beşiktaş/İstanbul', 'Beşiktaş', 'active', true),
  ('56977543-fb85-40ee-9a6d-c60c2c90bd16', 'Academic House Fatih Kız Öğrenci Yurdu', '34000, Beyazıt Mahallesi, Ayık Fırın Sk. No:7, 34104 Fatih/İstanbul', 'Fatih', 'active', true),
  ('65016355-e09d-48f0-8a46-4ade63056fb3', 'Academic House Kadıköy', 'Caferağa, Tellalzade Sk. No:44, 34710 Kadıköy/İstanbul', 'Kadıköy', 'active', true),
  ('13204ce8-d278-45aa-9a9a-982197a5f01c', 'Academic House Maltepe Kız Öğrenci Yurdu', 'Bağlarbaşı, Söğüt Sk. No : 1, 34844 Maltepe/İstanbul', 'Maltepe', 'active', true),
  ('a49488e5-03c1-46e8-9e4b-6e7fbdcd9ba0', 'Kampüshan Kız Öğrenci Yurdu', 'Esentepe, Begüm Sk. No:3, 34065 Eyüpsultan/İstanbul', 'Eyüpsultan', 'active', true),
  ('be84f2f4-c7ce-4c2b-b52e-bd46a2123b90', 'Keten Suites', 'İnönü, Elmadağ Cd. No:24, 34373 Şişli/İstanbul', 'Şişli', 'paused', false),
  ('3b78cd1b-f8de-4a96-81ec-d391cc3777a8', 'Mari Suites Hotel', 'Çağlayan, Taşocağı Cd. No:27, 34403 Kağıthane/İstanbul', 'Kağıthane', 'paused', false),
  ('9254f741-d50f-4f47-8c9c-f8770118e7d8', 'Monezza Avcılar', 'Cihangir Mahallesi E-5, Yanyol Londra Asfaltı Cad No:261, 34310 Avcılar/İstanbul', 'Avcılar', 'paused', false)
ON CONFLICT (id) DO UPDATE SET
  hotel_name = EXCLUDED.hotel_name,
  address = EXCLUDED.address,
  district = EXCLUDED.district,
  status = EXCLUDED.status,
  is_available = EXCLUDED.is_available,
  updated_at = now();

-- ── 3. Close CRM-only seed properties (no univotel match) ──
UPDATE properties
SET status = 'closed', is_available = false, updated_at = now()
WHERE id IN (
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  '33333333-3333-3333-3333-333333333301',
  '33333333-3333-3333-3333-333333333302',
  '33333333-3333-3333-3333-333333333303',
  '33333333-3333-3333-3333-333333333304',
  '33333333-3333-3333-3333-333333333305'
);

COMMIT;

COMMENT ON TABLE properties IS 'Hotel/dorm inventory. id matches univotel hotels.id after migration 0082.';
