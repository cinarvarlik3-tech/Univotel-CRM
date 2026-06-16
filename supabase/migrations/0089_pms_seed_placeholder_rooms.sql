-- Migration 0089: Placeholder rooms for PMS testing (P21).
-- Real rooms will replace via future data-only migration.
-- property_id is set by trg_rooms_set_property_id from room_type_id.

INSERT INTO rooms (room_type_id, room_number, floor, size, room_position)
VALUES
  -- GK Regency Suites (feb0a053)
  ('208fa752-804c-4d60-8fb0-334b6e206405', '101', 1, 20, 'corner'),
  ('208fa752-804c-4d60-8fb0-334b6e206405', '102', 1, 20, 'middle'),
  ('357f8e97-7d22-4492-8bd4-0212e43b935b', '103', 1, 15, 'corner'),
  ('208fa752-804c-4d60-8fb0-334b6e206405', '201', 2, 20, 'middle'),
  ('357f8e97-7d22-4492-8bd4-0212e43b935b', '202', 2, 15, 'corner'),
  -- Academia Seyrantepe (0116ac1e)
  ('2d13d02d-ae22-408c-90ce-9d350dadf6f4', '101', 1, 24, 'corner'),
  ('a49a5a68-dc18-47b6-ac04-5908d47d645a', '102', 1, 15, 'middle'),
  ('2d13d02d-ae22-408c-90ce-9d350dadf6f4', '201', 2, 24, 'middle'),
  ('a49a5a68-dc18-47b6-ac04-5908d47d645a', '202', 2, 15, 'corner'),
  -- Academic House Beşiktaş (7c5b61b4)
  ('e5ac8dd6-e94d-4255-9271-a654934717b4', '101', 1, 25, 'corner'),
  ('ec398ddb-8e2e-40eb-9884-1d58b29757d0', '102', 1, 15, 'middle'),
  ('e5ac8dd6-e94d-4255-9271-a654934717b4', '201', 2, 25, 'middle')
ON CONFLICT (property_id, room_number) DO NOTHING;
