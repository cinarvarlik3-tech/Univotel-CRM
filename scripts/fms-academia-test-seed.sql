-- ============================================================================
-- FMS Academia test seed — placeholder won customers for dashboard QA
-- ============================================================================
-- Run manually in Supabase SQL Editor (NOT a migration).
-- Safe to re-run: removes prior test rows in this UUID range first, then inserts.
--
-- Covers: Academia partner + 3 properties, pie chart (partner/property/room-type),
-- kapora toggle, customer list, commission math.
--
-- Teardown: scripts/fms-academia-test-teardown.sql
-- ============================================================================

BEGIN;

-- ── Constants (do not change — teardown matches these exactly) ───────────────
-- Partner:  a0ca0001-0001-4001-8001-000000000001
-- Leads:    a0ca0001-0001-4001-8001-000000000101 .. 00000000010c (12 leads)
-- Phones:   +90555100101 .. +90555100112

-- ── 0. Clean prior test rows (idempotent re-run) ─────────────────────────────
DELETE FROM finance_audit fa
WHERE fa.entity_id IN (
  SELECT lf.id FROM lead_finance lf
  WHERE lf.lead_id IN (
    SELECT unnest(ARRAY[
      'a0ca0001-0001-4001-8001-000000000101'::uuid,
      'a0ca0001-0001-4001-8001-000000000102'::uuid,
      'a0ca0001-0001-4001-8001-000000000103'::uuid,
      'a0ca0001-0001-4001-8001-000000000104'::uuid,
      'a0ca0001-0001-4001-8001-000000000105'::uuid,
      'a0ca0001-0001-4001-8001-000000000106'::uuid,
      'a0ca0001-0001-4001-8001-000000000107'::uuid,
      'a0ca0001-0001-4001-8001-000000000108'::uuid,
      'a0ca0001-0001-4001-8001-000000000109'::uuid,
      'a0ca0001-0001-4001-8001-00000000010a'::uuid,
      'a0ca0001-0001-4001-8001-00000000010b'::uuid,
      'a0ca0001-0001-4001-8001-00000000010c'::uuid
    ])
  )
)
OR fa.entity_id IN (
  'a0ca0001-0001-4001-8001-000000000101'::uuid,
  'a0ca0001-0001-4001-8001-000000000102'::uuid,
  'a0ca0001-0001-4001-8001-000000000103'::uuid,
  'a0ca0001-0001-4001-8001-000000000104'::uuid,
  'a0ca0001-0001-4001-8001-000000000105'::uuid,
  'a0ca0001-0001-4001-8001-000000000106'::uuid,
  'a0ca0001-0001-4001-8001-000000000107'::uuid,
  'a0ca0001-0001-4001-8001-000000000108'::uuid,
  'a0ca0001-0001-4001-8001-000000000109'::uuid,
  'a0ca0001-0001-4001-8001-00000000010a'::uuid,
  'a0ca0001-0001-4001-8001-00000000010b'::uuid,
  'a0ca0001-0001-4001-8001-00000000010c'::uuid
);

DELETE FROM leads
WHERE uuid IN (
  'a0ca0001-0001-4001-8001-000000000101',
  'a0ca0001-0001-4001-8001-000000000102',
  'a0ca0001-0001-4001-8001-000000000103',
  'a0ca0001-0001-4001-8001-000000000104',
  'a0ca0001-0001-4001-8001-000000000105',
  'a0ca0001-0001-4001-8001-000000000106',
  'a0ca0001-0001-4001-8001-000000000107',
  'a0ca0001-0001-4001-8001-000000000108',
  'a0ca0001-0001-4001-8001-000000000109',
  'a0ca0001-0001-4001-8001-00000000010a',
  'a0ca0001-0001-4001-8001-00000000010b',
  'a0ca0001-0001-4001-8001-00000000010c'
);

-- ── 1. Academia partner + property linkage ───────────────────────────────────
INSERT INTO partners (id, name, commission_percentage, is_active)
VALUES ('a0ca0001-0001-4001-8001-000000000001', 'Academia', 10.00, true)
ON CONFLICT (id) DO UPDATE
  SET name = EXCLUDED.name,
      commission_percentage = EXCLUDED.commission_percentage,
      is_active = true;

UPDATE properties
SET partner_id = 'a0ca0001-0001-4001-8001-000000000001'
WHERE id IN (
  '42e83935-9353-451b-baef-251e394bc182', -- Academia Residence
  '0116ac1e-1aa9-49bb-aa45-11ff7e1d0ea2', -- Academia Seyrantepe
  'fbf1c636-05fe-493a-a02e-e39811fddca4'  -- Academia Vadi
);

-- ── 2. Room type prices (required for seasonal FMS; also sets default_price) ─
UPDATE room_types SET default_price = v.price
FROM (VALUES
  ('c67de459-228d-4db2-b522-b2ed359e4a1e'::uuid, 18000::numeric),
  ('31986b92-6ff1-40a5-bfea-a39774c3adbf'::uuid, 11000),
  ('899c6e84-49af-4391-8f5b-0fdd8a33b871'::uuid, 13000),
  ('d69dc4c9-72e6-49e4-860e-6299704cd7f1'::uuid, 14000),
  ('2d13d02d-ae22-408c-90ce-9d350dadf6f4'::uuid, 12000),
  ('a49a5a68-dc18-47b6-ac04-5908d47d645a'::uuid, 15000),
  ('a3fe4bd6-6b15-4547-9670-f04e7e8520d8'::uuid, 10000),
  ('3706d301-b77c-4e06-8256-ec2154acbef1'::uuid, 9500),
  ('d2fcd08d-c831-4e82-8e42-2f55eb96ab81'::uuid, 10500),
  ('4cc0a245-6300-4e57-8854-22a63f2edd6e'::uuid, 9000)
) AS v(id, price)
WHERE room_types.id = v.id;

INSERT INTO room_type_prices (room_type_id, price, valid_from_month, valid_until_month, label)
SELECT v.room_type_id, v.price, '2025-09-01'::date, NULL, 'fms-test-academic'
FROM (VALUES
  ('c67de459-228d-4db2-b522-b2ed359e4a1e'::uuid, 18000::numeric),
  ('31986b92-6ff1-40a5-bfea-a39774c3adbf'::uuid, 11000),
  ('899c6e84-49af-4391-8f5b-0fdd8a33b871'::uuid, 13000),
  ('d69dc4c9-72e6-49e4-860e-6299704cd7f1'::uuid, 14000),
  ('2d13d02d-ae22-408c-90ce-9d350dadf6f4'::uuid, 12000),
  ('a49a5a68-dc18-47b6-ac04-5908d47d645a'::uuid, 15000),
  ('a3fe4bd6-6b15-4547-9670-f04e7e8520d8'::uuid, 10000),
  ('3706d301-b77c-4e06-8256-ec2154acbef1'::uuid, 9500),
  ('d2fcd08d-c831-4e82-8e42-2f55eb96ab81'::uuid, 10500),
  ('4cc0a245-6300-4e57-8854-22a63f2edd6e'::uuid, 9000)
) AS v(room_type_id, price)
WHERE NOT EXISTS (
  SELECT 1 FROM room_type_prices rtp
  WHERE rtp.room_type_id = v.room_type_id
    AND rtp.label = 'fms-test-academic'
);

-- ── 3. Placeholder leads ─────────────────────────────────────────────────────
INSERT INTO leads (
  uuid, lead_phone, lead_name, display_name, lead_source, funnel_status,
  student_stage, language, sla_status, has_moved_in, notes
) VALUES
  ('a0ca0001-0001-4001-8001-000000000101', '+90555100101', 'FMS Test A1', '[FMS-TEST] Elif Kaya',       'manual', 'sozlesme-imzalandi', 'yeni-giris', 'tr', 'on_time', false, 'FMS_ACADEMIA_TEST_SEED'),
  ('a0ca0001-0001-4001-8001-000000000102', '+90555100102', 'FMS Test A2', '[FMS-TEST] Can Demir',       'manual', 'sozlesme-imzalandi', 'yeni-giris', 'tr', 'on_time', false, 'FMS_ACADEMIA_TEST_SEED'),
  ('a0ca0001-0001-4001-8001-000000000103', '+90555100103', 'FMS Test A3', '[FMS-TEST] Zeynep Arslan',   'manual', 'kapora-alindi',      'yeni-giris', 'tr', 'on_time', false, 'FMS_ACADEMIA_TEST_SEED'),
  ('a0ca0001-0001-4001-8001-000000000104', '+90555100104', 'FMS Test A4', '[FMS-TEST] Mert Yıldız',     'manual', 'sozlesme-imzalandi', 'yeni-giris', 'tr', 'on_time', true,  'FMS_ACADEMIA_TEST_SEED'),
  ('a0ca0001-0001-4001-8001-000000000105', '+90555100105', 'FMS Test B1', '[FMS-TEST] Ayşe Çelik',      'manual', 'sozlesme-imzalandi', 'yeni-giris', 'tr', 'on_time', false, 'FMS_ACADEMIA_TEST_SEED'),
  ('a0ca0001-0001-4001-8001-000000000106', '+90555100106', 'FMS Test B2', '[FMS-TEST] Burak Koç',       'manual', 'sozlesme-imzalandi', 'yeni-giris', 'tr', 'on_time', false, 'FMS_ACADEMIA_TEST_SEED'),
  ('a0ca0001-0001-4001-8001-000000000107', '+90555100107', 'FMS Test B3', '[FMS-TEST] Selin Aydın',     'manual', 'kapora-alindi',      'yeni-giris', 'tr', 'on_time', false, 'FMS_ACADEMIA_TEST_SEED'),
  ('a0ca0001-0001-4001-8001-000000000108', '+90555100108', 'FMS Test B4', '[FMS-TEST] Emre Şahin',      'manual', 'sozlesme-imzalandi', 'yeni-giris', 'tr', 'on_time', false, 'FMS_ACADEMIA_TEST_SEED'),
  ('a0ca0001-0001-4001-8001-000000000109', '+90555100109', 'FMS Test C1', '[FMS-TEST] Deniz Öztürk',    'manual', 'sozlesme-imzalandi', 'yeni-giris', 'tr', 'on_time', false, 'FMS_ACADEMIA_TEST_SEED'),
  ('a0ca0001-0001-4001-8001-00000000010a', '+90555100110', 'FMS Test C2', '[FMS-TEST] Ece Polat',       'manual', 'sozlesme-imzalandi', 'yeni-giris', 'tr', 'on_time', false, 'FMS_ACADEMIA_TEST_SEED'),
  ('a0ca0001-0001-4001-8001-00000000010b', '+90555100111', 'FMS Test C3', '[FMS-TEST] Kerem Aksoy',     'manual', 'kapora-alindi',      'yeni-giris', 'tr', 'on_time', false, 'FMS_ACADEMIA_TEST_SEED'),
  ('a0ca0001-0001-4001-8001-00000000010c', '+90555100112', 'FMS Test C4', '[FMS-TEST] İrem Güneş',      'manual', 'sozlesme-imzalandi', 'yeni-giris', 'tr', 'on_time', false, 'FMS_ACADEMIA_TEST_SEED');

-- ── 4. Lead details (purchased room + property interest) ─────────────────────
INSERT INTO lead_details (lead_uuid, purchased_room, interested_property_ids, move_in)
VALUES
  ('a0ca0001-0001-4001-8001-000000000101', 'c67de459-228d-4db2-b522-b2ed359e4a1e', ARRAY['42e83935-9353-451b-baef-251e394bc182']::uuid[], '2025-09-01'),
  ('a0ca0001-0001-4001-8001-000000000102', '31986b92-6ff1-40a5-bfea-a39774c3adbf', ARRAY['42e83935-9353-451b-baef-251e394bc182']::uuid[], '2025-09-01'),
  ('a0ca0001-0001-4001-8001-000000000103', '899c6e84-49af-4391-8f5b-0fdd8a33b871', ARRAY['42e83935-9353-451b-baef-251e394bc182']::uuid[], '2025-09-01'),
  ('a0ca0001-0001-4001-8001-000000000104', 'd69dc4c9-72e6-49e4-860e-6299704cd7f1', ARRAY['42e83935-9353-451b-baef-251e394bc182']::uuid[], '2025-09-01'),
  ('a0ca0001-0001-4001-8001-000000000105', '2d13d02d-ae22-408c-90ce-9d350dadf6f4', ARRAY['0116ac1e-1aa9-49bb-aa45-11ff7e1d0ea2']::uuid[], '2025-09-01'),
  ('a0ca0001-0001-4001-8001-000000000106', 'a49a5a68-dc18-47b6-ac04-5908d47d645a', ARRAY['0116ac1e-1aa9-49bb-aa45-11ff7e1d0ea2']::uuid[], '2025-09-01'),
  ('a0ca0001-0001-4001-8001-000000000107', 'a3fe4bd6-6b15-4547-9670-f04e7e8520d8', ARRAY['0116ac1e-1aa9-49bb-aa45-11ff7e1d0ea2']::uuid[], '2025-09-01'),
  ('a0ca0001-0001-4001-8001-000000000108', '3706d301-b77c-4e06-8256-ec2154acbef1', ARRAY['0116ac1e-1aa9-49bb-aa45-11ff7e1d0ea2']::uuid[], '2025-09-01'),
  ('a0ca0001-0001-4001-8001-000000000109', 'd2fcd08d-c831-4e82-8e42-2f55eb96ab81', ARRAY['fbf1c636-05fe-493a-a02e-e39811fddca4']::uuid[], '2025-09-01'),
  ('a0ca0001-0001-4001-8001-00000000010a', '4cc0a245-6300-4e57-8854-22a63f2edd6e', ARRAY['fbf1c636-05fe-493a-a02e-e39811fddca4']::uuid[], '2025-09-01'),
  ('a0ca0001-0001-4001-8001-00000000010b', 'd2fcd08d-c831-4e82-8e42-2f55eb96ab81', ARRAY['fbf1c636-05fe-493a-a02e-e39811fddca4']::uuid[], '2025-09-01'),
  ('a0ca0001-0001-4001-8001-00000000010c', '4cc0a245-6300-4e57-8854-22a63f2edd6e', ARRAY['fbf1c636-05fe-493a-a02e-e39811fddca4']::uuid[], '2025-09-01');

-- ── 5. Active finance rows (canonical revenue source) ────────────────────────
-- Revenue = (monthly_payment - discount) * deal_duration
INSERT INTO lead_finance (lead_id, purchased_room, monthly_payment, discount, deal_duration, move_in_month)
VALUES
  -- Academia Residence (4 customers: 3 contracted + 1 kapora)
  ('a0ca0001-0001-4001-8001-000000000101', 'c67de459-228d-4db2-b522-b2ed359e4a1e', 18000, 0,    9,  '2025-09-01'),
  ('a0ca0001-0001-4001-8001-000000000102', '31986b92-6ff1-40a5-bfea-a39774c3adbf', 11000, 1000, 9,  '2025-09-01'),
  ('a0ca0001-0001-4001-8001-000000000103', '899c6e84-49af-4391-8f5b-0fdd8a33b871', 13000, 0,    12, '2025-09-01'),
  ('a0ca0001-0001-4001-8001-000000000104', 'd69dc4c9-72e6-49e4-860e-6299704cd7f1', 14000, 0,    9,  '2025-09-01'),
  -- Academia Seyrantepe (4 customers: 3 contracted + 1 kapora)
  ('a0ca0001-0001-4001-8001-000000000105', '2d13d02d-ae22-408c-90ce-9d350dadf6f4', 12000, 0,    9,  '2025-09-01'),
  ('a0ca0001-0001-4001-8001-000000000106', 'a49a5a68-dc18-47b6-ac04-5908d47d645a', 15000, 500,  12, '2025-09-01'),
  ('a0ca0001-0001-4001-8001-000000000107', 'a3fe4bd6-6b15-4547-9670-f04e7e8520d8', 10000, 0,    9,  '2025-09-01'),
  ('a0ca0001-0001-4001-8001-000000000108', '3706d301-b77c-4e06-8256-ec2154acbef1', 9500,  0,    12, '2025-09-01'),
  -- Academia Vadi (4 customers: 3 contracted + 1 kapora)
  ('a0ca0001-0001-4001-8001-000000000109', 'd2fcd08d-c831-4e82-8e42-2f55eb96ab81', 10500, 0,    9,  '2025-09-01'),
  ('a0ca0001-0001-4001-8001-00000000010a', '4cc0a245-6300-4e57-8854-22a63f2edd6e', 9000,  500,  12, '2025-09-01'),
  ('a0ca0001-0001-4001-8001-00000000010b', 'd2fcd08d-c831-4e82-8e42-2f55eb96ab81', 10500, 0,    9,  '2025-09-01'),
  ('a0ca0001-0001-4001-8001-00000000010c', '4cc0a245-6300-4e57-8854-22a63f2edd6e', 9000,  0,    9,  '2025-09-01');

COMMIT;

-- ── Verify (optional) ────────────────────────────────────────────────────────
-- SELECT * FROM fms_revenue_breakdown(false) WHERE partner_name = 'Academia';
-- SELECT * FROM fms_revenue_breakdown(true)  WHERE partner_name = 'Academia';
-- SELECT l.display_name, l.funnel_status, af.*
--   FROM active_finance af
--   JOIN leads l ON l.uuid = af.lead_id
--  WHERE l.notes = 'FMS_ACADEMIA_TEST_SEED'
--  ORDER BY l.display_name;
