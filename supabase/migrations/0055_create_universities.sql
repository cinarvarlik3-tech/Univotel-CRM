-- Migration 0055: Create universities reference table for lead_details.university dropdown.

CREATE TABLE universities (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  uni_name      TEXT        NOT NULL UNIQUE,      -- full canonical name e.g. "İstanbul Teknik Üniversitesi"
  uni_shortname TEXT        NOT NULL,             -- acronym / abbreviation e.g. "İTÜ"
  district      TEXT,                             -- campus district in Istanbul (nullable for out-of-city unis)
  city          TEXT        NOT NULL DEFAULT 'İstanbul',
  country       TEXT        NOT NULL DEFAULT 'Türkiye',
  yok_code      TEXT        UNIQUE,               -- YÖK institution code (nullable, for future enrichment)
  is_active     BOOLEAN     NOT NULL DEFAULT TRUE, -- soft-disable without deleting
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Trigger: keep updated_at current on every UPDATE
CREATE OR REPLACE FUNCTION set_universities_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER universities_updated_at
  BEFORE UPDATE ON universities
  FOR EACH ROW EXECUTE PROCEDURE set_universities_updated_at();

-- Trigram search indexes (pg_trgm already enabled via migration 0009)
CREATE INDEX idx_universities_uni_name_trgm
  ON universities USING gin (uni_name gin_trgm_ops);

CREATE INDEX idx_universities_uni_shortname_trgm
  ON universities USING gin (uni_shortname gin_trgm_ops);

CREATE INDEX idx_universities_is_active
  ON universities (is_active);

-- Row-level security: authenticated users may read; only service_role writes
ALTER TABLE universities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "universities_read_authenticated"
  ON universities FOR SELECT
  TO authenticated
  USING (TRUE);

COMMENT ON TABLE universities IS 'Reference list of universities for lead_details.university combobox.';
COMMENT ON COLUMN universities.uni_name      IS 'Full canonical Turkish name — stored in lead_details.university.';
COMMENT ON COLUMN universities.uni_shortname IS 'Common acronym used by students (e.g. İTÜ, BÜ, ODTÜ) — stored in lead_details.school_shortname.';
COMMENT ON COLUMN universities.district      IS 'Istanbul campus district, if applicable (feeds property recommendation engine).';
COMMENT ON COLUMN universities.city          IS 'City of main campus.';
COMMENT ON COLUMN universities.country       IS 'Country of institution (handles Erasmus/foreign leads).';
COMMENT ON COLUMN universities.yok_code      IS 'YÖK institution code for future cross-referencing with official data.';
COMMENT ON COLUMN universities.is_active     IS 'Set FALSE to hide from combobox without deleting historical references.';

-- Starter seed: Istanbul-focused, covers the most common leads
INSERT INTO universities (uni_name, uni_shortname, district, yok_code) VALUES
  ('İstanbul Teknik Üniversitesi',                    'İTÜ',       'Maslak',          'TR-34-1007'),
  ('Boğaziçi Üniversitesi',                           'BÜ',        'Bebek',           'TR-34-1002'),
  ('Orta Doğu Teknik Üniversitesi',                   'ODTÜ',      NULL,              'TR-06-1001'),
  ('İstanbul Üniversitesi',                           'İÜ',        'Beyazıt',         'TR-34-1001'),
  ('Marmara Üniversitesi',                            'MÜ',        'Göztepe',         'TR-34-1006'),
  ('Yıldız Teknik Üniversitesi',                      'YTÜ',       'Beşiktaş',        'TR-34-1009'),
  ('Galatasaray Üniversitesi',                        'GSÜ',       'Ortaköy',         'TR-34-2001'),
  ('İstanbul Bilgi Üniversitesi',                     'BİLGİ',     'Eyüp',            'TR-34-4001'),
  ('Koç Üniversitesi',                                'KÜ',        'Sarıyer',         'TR-34-3001'),
  ('Sabancı Üniversitesi',                            'SÜ',        'Tuzla',           'TR-34-3002'),
  ('Bilkent Üniversitesi',                            'Bilkent',   NULL,              'TR-06-4001'),
  ('Hacettepe Üniversitesi',                          'HÜ',        NULL,              'TR-06-1003'),
  ('Ankara Üniversitesi',                             'AÜ',        NULL,              'TR-06-1002'),
  ('İstanbul Medipol Üniversitesi',                   'Medipol',   'Bağcılar',        'TR-34-5001'),
  ('Bahçeşehir Üniversitesi',                         'BAU',       'Beşiktaş',        'TR-34-4002'),
  ('Kadir Has Üniversitesi',                          'KHÜ',       'Cibali',          'TR-34-4003'),
  ('Özyeğin Üniversitesi',                            'ÖZÜ',       'Çekmeköy',        'TR-34-4004'),
  ('Fatih Sultan Mehmet Vakıf Üniversitesi',          'FSMVÜ',     'Topkapı',         'TR-34-5002'),
  ('Beykent Üniversitesi',                            'Beykent',   'Büyükçekmece',    'TR-34-4005'),
  ('İstanbul Aydın Üniversitesi',                     'İAÜ',       'Küçükçekmece',    'TR-34-4006'),
  ('İstanbul Kültür Üniversitesi',                    'İKÜ',       'Bakırköy',        'TR-34-4007'),
  ('İstanbul Ticaret Üniversitesi',                   'İTİCARET',  'Üsküdar',         'TR-34-4008'),
  ('Maltepe Üniversitesi',                            'MU',        'Maltepe',         'TR-34-4009'),
  ('Gedik Üniversitesi',                              'Gedik',     'Kartal',          'TR-34-4010'),
  ('İstanbul Gelişim Üniversitesi',                   'İGÜ',       'Avcılar',         'TR-34-5003'),
  ('Acıbadem Mehmet Ali Aydınlar Üniversitesi',       'Acıbadem',  'Kadıköy',         'TR-34-5004'),
  ('Türk-Alman Üniversitesi',                         'TAÜ',       'Beykoz',          'TR-34-5005'),
  ('Işık Üniversitesi',                               'Işık',      'Şile',            'TR-34-4011'),
  ('Nişantaşı Üniversitesi',                          'NİŞ',       'Sarıyer',         'TR-34-5006'),
  ('İstanbul Medeniyet Üniversitesi',                 'İMÜ',       'Kadıköy',         'TR-34-5007'),
  ('İstanbul Arel Üniversitesi',                      'Arel',      'Büyükçekmece',    'TR-34-4012'),
  ('Beykoz Üniversitesi',                             'Beykoz',    'Beykoz',          'TR-34-5008'),
  ('İstanbul Esenyurt Üniversitesi',                  'İEÜ',       'Esenyurt',        'TR-34-5009'),
  ('İstanbul Okan Üniversitesi',                      'Okan',      'Tuzla',           'TR-34-4013'),
  ('Piri Reis Üniversitesi',                          'PRÜ',       'Tuzla',           'TR-34-5010')
ON CONFLICT (uni_name) DO NOTHING;
