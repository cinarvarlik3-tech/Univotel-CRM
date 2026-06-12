-- =================================================================
-- UNIVOTEL CRM — My Day Demo Data
--
-- Populates all six Bugün containers + Performansım metrics so the
-- redesigned My Day page is fully visible in the browser.
--
-- HOW TO RUN:
--   1. Open Supabase Dashboard → SQL Editor
--   2. Replace 'your@email.com' on line 23 with your CRM login email
--   3. Paste and run the entire block
--
-- CLEANUP: Run the DELETE block at the bottom to remove demo rows.
-- =================================================================

DO $$
DECLARE
  -- ── Change this to your login email ──────────────────────────
  sp_email  TEXT := 'your@email.com';

  sp_id     UUID;
  sp_name   TEXT;
  prop_id   UUID;

  -- Today's midnight in Istanbul (UTC+3)
  today_ist  TIMESTAMPTZ :=
    (to_char(NOW() AT TIME ZONE 'Europe/Istanbul', 'YYYY-MM-DD') || 'T00:00:00+03:00')
    ::TIMESTAMPTZ;
  today_date DATE := (NOW() AT TIME ZONE 'Europe/Istanbul')::DATE;

  -- Start of current ISO week (Monday 00:00 Istanbul)
  week_start TIMESTAMPTZ :=
    (to_char(
       date_trunc('week', NOW() AT TIME ZONE 'Europe/Istanbul'),
       'YYYY-MM-DD'
    ) || 'T00:00:00+03:00')::TIMESTAMPTZ;

  now_ts TIMESTAMPTZ := NOW();

  -- ── Lead UUIDs ───────────────────────────────────────────────
  -- Beslenecekler (Nurtures)
  l_n1  UUID := gen_random_uuid();   -- arandi  — 24h badge (20h since inbound)
  l_n2  UUID := gen_random_uuid();   -- bilgi-verildi — 5 days cold
  l_n3  UUID := gen_random_uuid();   -- bizi-aradi-konustuk — 2 days cold

  -- Aranacaklar (Calls)
  l_c1  UUID := gen_random_uuid();   -- aranacak — 1 day cold
  l_c2  UUID := gen_random_uuid();   -- arandi-acmadi — 8 days cold (coldest→top)
  l_c3  UUID := gen_random_uuid();   -- aranacak — 4 hours cold

  -- Ziyaret Sonrası Takip
  l_pv1 UUID := gen_random_uuid();   -- ziyaret-etti — 2 days cold
  l_pv2 UUID := gen_random_uuid();   -- teklif-gonderildi — 1 day cold

  -- Bugün Taşınanlar
  l_mi  UUID := gen_random_uuid();   -- sozlesme-imzalandi + move_in = today

  -- Performance window leads (claimed this week)
  l_p1  UUID := gen_random_uuid();   -- → kapora-alindi
  l_p2  UUID := gen_random_uuid();   -- → sozlesme-imzalandi
  l_p3  UUID := gen_random_uuid();   -- → kapora-alindi
  l_p4  UUID := gen_random_uuid();   -- → contacted only
  l_p5  UUID := gen_random_uuid();   -- → visited only

  l_lost1 UUID := gen_random_uuid(); -- lost · reason: price
  l_lost2 UUID := gen_random_uuid(); -- lost · reason: competitor
  l_lost3 UUID := gen_random_uuid(); -- lost · reason: no_response

  l_stuck UUID := gen_random_uuid(); -- yeni — 10 days untouched (Takılı leadler)

BEGIN
  -- ── Resolve salesperson ──────────────────────────────────────
  SELECT id, full_name INTO sp_id, sp_name
    FROM salespeople WHERE email = sp_email LIMIT 1;

  IF sp_id IS NULL THEN
    RAISE EXCEPTION
      E'\nSalesperson not found for email: %\nUpdate the sp_email variable on line 23.', sp_email;
  END IF;
  RAISE NOTICE '→ Inserting demo data for: % (%)', sp_name, sp_id;

  -- ── Create or reuse demo property ─────────────────────────────
  SELECT id INTO prop_id FROM properties
    WHERE hotel_name = 'Demo Tesis A' AND is_available = true LIMIT 1;

  IF prop_id IS NULL THEN
    prop_id := gen_random_uuid();
    INSERT INTO properties (id, hotel_name, status, is_available)
    VALUES (prop_id, 'Demo Tesis A', 'active', true);
    RAISE NOTICE '→ Created property Demo Tesis A (%)', prop_id;
  ELSE
    RAISE NOTICE '→ Reusing property Demo Tesis A (%)', prop_id;
  END IF;

  -- Optionally wire up home_property_id so Visits card defaults to Demo Tesis A.
  -- Comment out if you prefer to see the "Ana tesisini ayarla" hint instead.
  UPDATE salespeople SET home_property_id = prop_id WHERE id = sp_id;

  -- ================================================================
  -- BUGÜN TAB — Beslenecekler (Nurtures)
  -- ================================================================
  INSERT INTO leads (
    uuid, lead_name, lead_phone, lead_source,
    funnel_status, assigned_to, claimed_at,
    last_contact_at, last_inbound_message_at, message_from,
    is_archived, is_deleted
  ) VALUES
    -- 24h badge: inbound 20h ago → ~4h left in WhatsApp window
    (l_n1, 'Ayşe Kaya',   '+905551000001', 'manual', 'arandi',
     sp_id, week_start,
     now_ts - INTERVAL '3 days',
     now_ts - INTERVAL '20 hours',
     'whatsapp', false, false),

    -- 5 days without contact
    (l_n2, 'Kemal Demir', '+905551000002', 'manual', 'bilgi-verildi',
     sp_id, week_start,
     now_ts - INTERVAL '5 days',
     NULL, 'whatsapp', false, false),

    -- 2 days without contact
    (l_n3, 'Selin Arslan', '+905551000003', 'manual', 'bizi-aradi-konustuk',
     sp_id, week_start,
     now_ts - INTERVAL '2 days',
     NULL, 'instagram', false, false);

  -- ================================================================
  -- BUGÜN TAB — Aranacaklar (Calls)
  -- ================================================================
  INSERT INTO leads (
    uuid, lead_name, lead_phone, lead_source,
    funnel_status, assigned_to, claimed_at,
    last_contact_at, message_from,
    is_archived, is_deleted
  ) VALUES
    (l_c1, 'Mert Yıldız',  '+905551000004', 'manual', 'aranacak',
     sp_id, week_start,
     now_ts - INTERVAL '1 day',
     NULL, false, false),

    -- Oldest → floats to top (coldest-first sort)
    (l_c2, 'Büşra Şahin',  '+905551000005', 'manual', 'arandi-acmadi',
     sp_id, week_start,
     now_ts - INTERVAL '8 days',
     'whatsapp', false, false),

    (l_c3, 'Emre Aktaş',   '+905551000006', 'manual', 'aranacak',
     sp_id, week_start,
     now_ts - INTERVAL '4 hours',
     NULL, false, false);

  -- ================================================================
  -- BUGÜN TAB — Ziyaret Sonrası Takip (Post-visit nurture)
  -- ================================================================
  INSERT INTO leads (
    uuid, lead_name, lead_phone, lead_source,
    funnel_status, assigned_to, claimed_at,
    last_contact_at, message_from,
    is_archived, is_deleted
  ) VALUES
    (l_pv1, 'Deniz Öztürk', '+905551000007', 'manual', 'ziyaret-etti',
     sp_id, week_start,
     now_ts - INTERVAL '2 days',
     'whatsapp', false, false),

    (l_pv2, 'Fatma Yılmaz', '+905551000008', 'manual', 'teklif-gonderildi',
     sp_id, week_start,
     now_ts - INTERVAL '1 day',
     'whatsapp', false, false);

  -- ================================================================
  -- BUGÜN TAB — Bugün Taşınanlar (Move-in today)
  -- ================================================================
  INSERT INTO leads (
    uuid, lead_name, lead_phone, lead_source,
    funnel_status, assigned_to, claimed_at,
    last_contact_at, is_archived, is_deleted
  ) VALUES
    (l_mi, 'Tarık Çelik', '+905551000009', 'manual', 'sozlesme-imzalandi',
     sp_id, week_start,
     now_ts - INTERVAL '3 days',
     false, false);

  -- Set move_in = today in lead_details
  INSERT INTO lead_details (lead_uuid, move_in, interested_hotel, room_type)
  VALUES (l_mi, today_date, ARRAY['Demo Tesis A'], ARRAY['single'])
  ON CONFLICT (lead_uuid) DO UPDATE SET move_in = today_date;

  -- ================================================================
  -- BUGÜN TAB — Bugünkü Ziyaretler (Visits today)
  -- ================================================================
  INSERT INTO visits (lead_uuid, property_id, scheduled_date, status, created_by)
  VALUES
    -- Scheduled (upcoming today)
    (l_n1, prop_id, today_ist + INTERVAL '10 hours',  'scheduled', sp_id),
    -- Attended
    (l_n2, prop_id, today_ist + INTERVAL '13 hours',  'attended',  sp_id),
    -- Failed (no-show)
    (l_n3, prop_id, today_ist + INTERVAL '15 hours 30 minutes', 'failed', sp_id);

  -- ================================================================
  -- BUGÜN TAB — Son Aramalar (CDR calls, mix of logged/unlogged)
  -- ================================================================
  INSERT INTO contact_history
    (lead_uuid, interaction_type, interaction_source,
     salesperson_id, metadata, status_changed, created_at)
  VALUES
    -- Outbound answered — LOGGED (salesperson_id set)
    (l_n1,  'call', 'netgsm', sp_id,
     '{"direction":"outbound","duration_seconds":87}',
     false, today_ist + INTERVAL '9 hours 30 minutes'),

    -- Outbound missed — UNLOGGED
    (l_c2,  'call', 'netgsm', NULL,
     '{"direction":"outbound","duration_seconds":0}',
     false, today_ist + INTERVAL '8 hours 45 minutes'),

    -- Inbound answered — UNLOGGED (customer called back)
    (l_pv1, 'call', 'netgsm', NULL,
     '{"direction":"inbound","duration_seconds":124}',
     false, today_ist + INTERVAL '7 hours'),

    -- Outbound answered — UNLOGGED
    (l_c3,  'call', 'netgsm', NULL,
     '{"direction":"outbound","duration_seconds":52}',
     false, today_ist + INTERVAL '6 hours'),

    -- Inbound missed — LOGGED
    (l_n2,  'call', 'netgsm', sp_id,
     '{"direction":"inbound","duration_seconds":0}',
     false, today_ist + INTERVAL '5 hours');

  -- ================================================================
  -- PERFORMANSIM TAB — Leads for performance window
  -- ================================================================
  INSERT INTO leads (
    uuid, lead_name, lead_phone, lead_source,
    funnel_status, assigned_to, claimed_at,
    last_contact_at, is_archived, is_deleted, loss_reason
  ) VALUES
    (l_p1, 'Elif Karadağ', '+905552000001', 'manual', 'kapora-alindi',
     sp_id, week_start + INTERVAL '2 hours',
     week_start + INTERVAL '3 days', false, false, NULL),

    (l_p2, 'Can Bozkurt',  '+905552000002', 'manual', 'sozlesme-imzalandi',
     sp_id, week_start + INTERVAL '4 hours',
     week_start + INTERVAL '4 days', false, false, NULL),

    (l_p3, 'Hasan Güler',  '+905552000003', 'manual', 'kapora-alindi',
     sp_id, week_start + INTERVAL '6 hours',
     week_start + INTERVAL '2 days', false, false, NULL),

    (l_p4, 'Zeynep Kurt',  '+905552000004', 'manual', 'arandi',
     sp_id, week_start + INTERVAL '8 hours',
     week_start + INTERVAL '1 day', false, false, NULL),

    (l_p5, 'Oğuz Taşkın',  '+905552000005', 'manual', 'ziyaret-etti',
     sp_id, week_start + INTERVAL '10 hours',
     week_start + INTERVAL '2 days', false, false, NULL),

    -- Lost leads — loss reason breakdown
    (l_lost1, 'Kayıp Fiyat',    '+905552000006', 'manual', 'lost',
     sp_id, week_start + INTERVAL '12 hours',
     week_start + INTERVAL '1 day 2 hours', false, false, 'price'),

    (l_lost2, 'Kayıp Rakip',    '+905552000007', 'manual', 'lost',
     sp_id, week_start + INTERVAL '14 hours',
     week_start + INTERVAL '2 days', false, false, 'competitor'),

    (l_lost3, 'Kayıp Cevapsız', '+905552000008', 'manual', 'lost',
     sp_id, week_start + INTERVAL '16 hours',
     week_start + INTERVAL '1 day', false, false, 'no_response'),

    -- Stuck new lead — 10 days in "yeni" without contact
    (l_stuck, 'Takılı Yeni', '+905552000009', 'manual', 'yeni',
     sp_id, now_ts - INTERVAL '10 days',
     now_ts - INTERVAL '10 days', false, false, NULL);

  -- ================================================================
  -- PERFORMANSIM — Stage history (Kapora + Sözleşme KPIs)
  -- ================================================================
  INSERT INTO lead_stage_history
    (lead_uuid, from_status, to_status, changed_by, changed_at, source)
  VALUES
    (l_p1, 'teklif-gonderildi', 'kapora-alindi',     sp_id, week_start + INTERVAL '3 days',          'manual'),
    (l_p3, 'teklif-gonderildi', 'kapora-alindi',     sp_id, week_start + INTERVAL '2 days',          'manual'),
    (l_p2, 'teklif-gonderildi', 'kapora-alindi',     sp_id, week_start + INTERVAL '4 days',          'manual'),
    (l_p2, 'kapora-alindi',     'sozlesme-imzalandi', sp_id, week_start + INTERVAL '4 days 4 hours', 'manual');

  -- ================================================================
  -- PERFORMANSIM — Contact logs (Arama + mesaj activity volume)
  -- ================================================================
  INSERT INTO contact_history
    (lead_uuid, interaction_type, interaction_source,
     salesperson_id, status_changed, created_at)
  VALUES
    -- Call logs (5 calls — Arama KPI)
    (l_p1,   'call_success', 'manual', sp_id, false, week_start + INTERVAL '1 day 2 hours'),
    (l_p2,   'call_success', 'manual', sp_id, false, week_start + INTERVAL '2 days 1 hour'),
    (l_p3,   'call_success', 'manual', sp_id, false, week_start + INTERVAL '1 day 8 hours'),
    (l_p4,   'call_success', 'manual', sp_id, false, week_start + INTERVAL '1 day 4 hours'),
    (l_lost1,'call_fail',    'manual', sp_id, false, week_start + INTERVAL '1 day'),

    -- Message logs (counted as 'contacts' in current activity volume logic)
    (l_p1,   'message_sent', 'manual', sp_id, false, week_start + INTERVAL '1 hour'),
    (l_p2,   'message_sent', 'manual', sp_id, false, week_start + INTERVAL '2 hours'),
    (l_pv1,  'message_sent', 'manual', sp_id, false, week_start + INTERVAL '3 hours'),
    (l_n1,   'message_sent', 'manual', sp_id, false, week_start + INTERVAL '4 hours'),
    (l_n2,   'message_sent', 'manual', sp_id, false, week_start + INTERVAL '5 hours');

  -- ================================================================
  -- PERFORMANSIM — CDR call logs (Bağlantı Oranı connect rate)
  -- 3 answered / 2 missed = 60% connect rate
  -- ================================================================
  INSERT INTO contact_history
    (lead_uuid, interaction_type, interaction_source,
     salesperson_id, metadata, status_changed, created_at)
  VALUES
    -- Answered outbound
    (l_p1,  'call', 'netgsm', sp_id,
     '{"direction":"outbound","duration_seconds":72}',  false, week_start + INTERVAL '1 day 3 hours'),
    (l_p2,  'call', 'netgsm', sp_id,
     '{"direction":"outbound","duration_seconds":130}', false, week_start + INTERVAL '2 days 2 hours'),
    (l_pv2, 'call', 'netgsm', sp_id,
     '{"direction":"outbound","duration_seconds":45}',  false, week_start + INTERVAL '3 days'),
    -- Missed outbound
    (l_c1,   'call', 'netgsm', sp_id,
     '{"direction":"outbound","duration_seconds":0}',   false, week_start + INTERVAL '1 day 1 hour'),
    (l_lost2,'call', 'netgsm', sp_id,
     '{"direction":"outbound","duration_seconds":0}',   false, week_start + INTERVAL '2 days 3 hours');

  -- ================================================================
  -- PERFORMANSIM — Visits this week (Ziyaret KPI + show-rate)
  -- 2 attended / 1 failed = 67% show-rate
  -- ================================================================
  INSERT INTO visits (lead_uuid, property_id, scheduled_date, status, created_by)
  VALUES
    (l_p1, prop_id, week_start + INTERVAL '3 days 10 hours', 'attended', sp_id),
    (l_p2, prop_id, week_start + INTERVAL '4 days 14 hours', 'attended', sp_id),
    (l_p5, prop_id, week_start + INTERVAL '2 days 11 hours', 'failed',   sp_id);

  -- ================================================================
  RAISE NOTICE E'\n'
    '========================================================\n'
    '  DEMO DATA INSERTED SUCCESSFULLY\n'
    '========================================================\n'
    '  Salesperson : %\n'
    '\n'
    '  BUGÜN TAB\n'
    '  ├─ Beslenecekler  : 3 leads (Ayşe: 24h badge, Kemal: 5 days, Selin: 2 days)\n'
    '  ├─ Aranacaklar    : 3 leads (Büşra: 8 days cold → top)\n'
    '  ├─ Ziyaretler     : 3 visits (10:00 scheduled / 13:00 attended / 15:30 failed)\n'
    '  ├─ Ziyaret Sonrası: 2 leads (Deniz, Fatma)\n'
    '  ├─ Taşınanlar     : 1 lead  (Tarık — move_in = today)\n'
    '  └─ Son Aramalar   : 5 calls (3 unlogged → use the toggle to filter)\n'
    '\n'
    '  PERFORMANSIM TAB (Bu Hafta)\n'
    '  ├─ Leadlerim      : 9 claimed\n'
    '  ├─ Arama          : 5 manual call logs\n'
    '  ├─ Ziyaret        : 2 attended + 1 failed (67%% show-rate)\n'
    '  ├─ Kapora         : 3 (Elif, Can, Hasan)\n'
    '  ├─ Sözleşme       : 1 (Can)\n'
    '  ├─ Dönüşümler     : yeni→söz: 11%%, ziyaret→kapora: 100%%\n'
    '  ├─ Bağlantı oranı : 3/5 = 60%%\n'
    '  ├─ Kayıp nedenleri: price + competitor + no_response\n'
    '  └─ Takılı leadler : 1 (10 gündür yeni)\n'
    '========================================================',
    sp_name;

END $$;


-- =================================================================
-- CLEANUP (run this when you want to remove demo data)
-- Replace 'your@email.com' again before running.
-- =================================================================
/*
DO $$
DECLARE
  sp_id UUID;
BEGIN
  SELECT id INTO sp_id FROM salespeople WHERE email = 'your@email.com' LIMIT 1;

  -- Remove contact history, stage history, visits for demo leads
  DELETE FROM lead_stage_history  WHERE changed_by = sp_id
    AND lead_uuid IN (SELECT uuid FROM leads WHERE lead_name LIKE '% Demo' OR lead_phone LIKE '+90555100%' OR lead_phone LIKE '+90555200%');
  DELETE FROM contact_history     WHERE lead_uuid IN (SELECT uuid FROM leads WHERE lead_phone LIKE '+90555100%' OR lead_phone LIKE '+90555200%');
  DELETE FROM visits              WHERE lead_uuid IN (SELECT uuid FROM leads WHERE lead_phone LIKE '+90555100%' OR lead_phone LIKE '+90555200%');
  DELETE FROM lead_details        WHERE lead_uuid IN (SELECT uuid FROM leads WHERE lead_phone LIKE '+90555100%' OR lead_phone LIKE '+90555200%');
  DELETE FROM leads               WHERE lead_phone LIKE '+90555100%' OR lead_phone LIKE '+90555200%';
  DELETE FROM properties          WHERE hotel_name = 'Demo Tesis A';

  UPDATE salespeople SET home_property_id = NULL WHERE id = sp_id;
  RAISE NOTICE 'Demo data cleaned up for: %', sp_id;
END $$;
*/
