-- Seed data for local development: salespeople and properties.
-- Auth users must be created in Supabase dashboard with matching UUIDs.

-- Fixed UUIDs for reproducible local dev (replace after auth user creation if needed)
-- Managers
INSERT INTO salespeople (id, full_name, email, role, languages, shift_start, shift_end, telegram_chat_id)
VALUES
  ('11111111-1111-1111-1111-111111111101', 'Ayse Manager', 'manager1@univotel.com', 'manager', '{tr,en}', '09:00', '18:00', NULL),
  ('11111111-1111-1111-1111-111111111102', 'Mehmet Manager', 'manager2@univotel.com', 'manager', '{tr}', '09:00', '18:00', NULL);

-- Salespeople
INSERT INTO salespeople (id, full_name, email, role, languages, shift_start, shift_end, max_active_leads)
VALUES
  ('22222222-2222-2222-2222-222222222201', 'Zeynep Sales', 'zeynep@univotel.com', 'salesperson', '{tr}', '09:00', '18:00', 40),
  ('22222222-2222-2222-2222-222222222202', 'Can Sales', 'can@univotel.com', 'salesperson', '{tr,en}', '10:00', '19:00', 40),
  ('22222222-2222-2222-2222-222222222203', 'Elif Sales', 'elif@univotel.com', 'salesperson', '{tr,de}', '09:00', '17:00', 40);

-- Properties
INSERT INTO properties (id, hotel_name, address, district, serviced_gender, serviced_schools, total_beds, status)
VALUES
  ('33333333-3333-3333-3333-333333333301', 'Univotel Besiktas', 'Besiktas Mah.', 'Besiktas', 'mixed', '{"Bogazici","ITU"}', 120, 'active'),
  ('33333333-3333-3333-3333-333333333302', 'Univotel Kadikoy', 'Kadikoy Mah.', 'Kadikoy', 'female', '{"Marmara","Yeditepe"}', 80, 'active'),
  ('33333333-3333-3333-3333-333333333303', 'Univotel Sisli', 'Sisli Mah.', 'Sisli', 'male', '{"Bilgi","Koc"}', 100, 'active'),
  ('33333333-3333-3333-3333-333333333304', 'Univotel Uskudar', 'Uskudar Mah.', 'Uskudar', 'mixed', '{"Marmara"}', 60, 'active'),
  ('33333333-3333-3333-3333-333333333305', 'Univotel Fatih', 'Fatih Mah.', 'Fatih', 'mixed', '{"Istanbul","Halic"}', 90, 'paused');

-- Assign hotel specializations to salespeople
UPDATE salespeople
SET assigned_hotels = ARRAY['33333333-3333-3333-3333-333333333301'::uuid, '33333333-3333-3333-3333-333333333302'::uuid]
WHERE id = '22222222-2222-2222-2222-222222222201';

UPDATE salespeople
SET assigned_hotels = ARRAY['33333333-3333-3333-3333-333333333303'::uuid]
WHERE id = '22222222-2222-2222-2222-222222222202';
