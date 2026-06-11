-- Migration 0062: Funnel status consolidation for Major Update.
--
-- Changes:
--   ADD  bilgi-verildi  (new stage: "informed via text", after yeni)
--   REMAP ilgilenmiyor   → lost  (loss_reason defaults to 'ilgilenmiyor' if NULL)
--   REMAP ziyaret-ama-almayacak → lost  (loss_reason defaults to 'ziyaret-ama-almayacak' if NULL)
--   REMOVE ilgilenmiyor, ziyaret-ama-almayacak from CHECK constraint
--   NOTE: 24h_window_warning rows still exist — they are backfilled in migration 0067
--         after the is_24h_restricted column is added in 0063.
--   REPLACE loss_reason trigger: 'lost' now ALWAYS requires loss_reason (no exceptions).
--   UPDATE archive functions: only 'lost' triggers nightly auto-archive (not sozlesme-imzalandi).
--   UPDATE cron: remove dead status references from SLA + active_lead_count_reconcile crons.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Expand loss_reason CHECK to include legacy backfill values.
--    ilgilenmiyor / ziyaret-ama-almayacak will appear on leads that had those
--    funnel statuses with no explicit loss_reason before this migration.
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_loss_reason_check;
ALTER TABLE leads ADD CONSTRAINT leads_loss_reason_check
  CHECK (loss_reason IS NULL OR loss_reason IN (
    'price', 'location', 'competitor', 'no_response', 'not_student',
    'already_placed', 'timing', 'other', 'sure-asildi', 'plans_changed',
    -- legacy backfill values (set during this migration, not selectable in UI)
    'ilgilenmiyor', 'ziyaret-ama-almayacak'
  ));

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Backfill: remap ilgilenmiyor → lost.
-- ─────────────────────────────────────────────────────────────────────────────
UPDATE leads
SET funnel_status            = 'lost',
    funnel_status_before_lost = COALESCE(funnel_status_before_lost, 'yeni'),
    loss_reason              = COALESCE(loss_reason, 'ilgilenmiyor')
WHERE funnel_status = 'ilgilenmiyor';

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Backfill: remap ziyaret-ama-almayacak → lost.
-- ─────────────────────────────────────────────────────────────────────────────
UPDATE leads
SET funnel_status            = 'lost',
    funnel_status_before_lost = COALESCE(funnel_status_before_lost, 'ziyaret-etti'),
    loss_reason              = COALESCE(loss_reason, 'ziyaret-ama-almayacak')
WHERE funnel_status = 'ziyaret-ama-almayacak';

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Update funnel_status CHECK.
--    Adds bilgi-verildi.
--    Removes ilgilenmiyor and ziyaret-ama-almayacak (all rows already remapped).
--    Keeps 24h_window_warning — rows still exist; backfilled in migration 0067.
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_funnel_status_check;
ALTER TABLE leads ADD CONSTRAINT leads_funnel_status_check CHECK (
  funnel_status IN (
    'yeni', 'bilgi-verildi', 'aranacak', 'arandi', 'arandi-acmadi',
    'bizi-aradi-konustuk', 'ziyaret', 'ziyaret-etmedi', 'ziyaret-etti',
    'teklif-gonderildi', 'kapora-alindi', 'sozlesme-imzalandi',
    '24h_window_warning', 'lost'
  )
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. Replace loss_reason trigger.
--    Old trigger (migration 0060) allowed 'lost' with optional loss_reason.
--    New rule: funnel_status = 'lost' ALWAYS requires loss_reason (no exceptions).
--    Other statuses: loss_reason is automatically cleared.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION enforce_loss_reason_on_lost()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.funnel_status = 'lost' AND NEW.loss_reason IS NULL THEN
    RAISE EXCEPTION 'loss_reason is required when funnel_status is lost';
  END IF;

  IF NEW.funnel_status != 'lost' AND NEW.loss_reason IS NOT NULL THEN
    NEW.loss_reason := NULL;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
-- The trigger binding already exists from migration 0015; only the function is replaced.

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. Update archive_single_lead: remove ziyaret-ama-almayacak / ilgilenmiyor.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION archive_single_lead(
  target_uuid UUID,
  archived_by_param TEXT,
  manual_archive_reason TEXT DEFAULT NULL,
  manual_loss_reason TEXT DEFAULT NULL
)
RETURNS void AS $$
DECLARE
  lead_row leads%ROWTYPE;
  resolved_archive_reason TEXT;
  resolved_loss_reason TEXT;
  cutoff_date TIMESTAMPTZ := NOW() - INTERVAL '80 days';
BEGIN
  SELECT * INTO lead_row
  FROM leads
  WHERE uuid = target_uuid
    AND is_deleted = false
    AND is_archived = false
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Lead not found or not eligible for archive: %', target_uuid;
  END IF;

  IF manual_archive_reason IS NOT NULL THEN
    resolved_archive_reason := manual_archive_reason;
  ELSIF lead_row.funnel_status = 'sozlesme-imzalandi' THEN
    resolved_archive_reason := 'won';
  ELSIF lead_row.funnel_status = 'lost' THEN
    resolved_archive_reason := 'lost';
  ELSE
    RAISE EXCEPTION 'Lead funnel_status not eligible for auto archive: %', lead_row.funnel_status;
  END IF;

  IF archived_by_param = 'auto' THEN
    IF lead_row.funnel_status NOT IN ('sozlesme-imzalandi', 'lost') THEN
      RAISE EXCEPTION 'Lead not in terminal funnel status: %', lead_row.funnel_status;
    END IF;

    IF COALESCE(lead_row.last_contact_at, lead_row.updated_at) >= cutoff_date THEN
      RAISE EXCEPTION 'Lead not yet eligible for auto archive: %', target_uuid;
    END IF;
  END IF;

  IF resolved_archive_reason = 'won' THEN
    resolved_loss_reason := NULL;
  ELSIF manual_archive_reason IS NOT NULL THEN
    IF manual_loss_reason IS NULL THEN
      RAISE EXCEPTION 'loss_reason required for manual lost archive';
    END IF;
    resolved_loss_reason := manual_loss_reason;
  ELSIF lead_row.loss_reason IS NOT NULL THEN
    resolved_loss_reason := lead_row.loss_reason;
  ELSE
    resolved_loss_reason := 'sure-asildi';
  END IF;

  INSERT INTO archived_leads (
    uuid,
    archive_reason,
    loss_reason,
    archived_at,
    archived_by,
    lead_name,
    lead_phone,
    lead_source,
    message_from,
    is_organic,
    funnel_status,
    student_stage,
    persona_type,
    special_state,
    assigned_to,
    language,
    source_details,
    parent_phone,
    lead_score,
    created_at,
    last_contact_at,
    updated_at
  ) VALUES (
    lead_row.uuid,
    resolved_archive_reason,
    resolved_loss_reason,
    NOW(),
    archived_by_param,
    lead_row.lead_name,
    lead_row.lead_phone,
    lead_row.lead_source,
    lead_row.message_from,
    lead_row.is_organic,
    lead_row.funnel_status,
    lead_row.student_stage,
    lead_row.persona_type,
    lead_row.special_state,
    lead_row.assigned_to,
    lead_row.language,
    lead_row.source_details,
    lead_row.parent_phone,
    lead_row.lead_score,
    lead_row.created_at,
    lead_row.last_contact_at,
    lead_row.updated_at
  );

  INSERT INTO archived_contact_history (
    id,
    lead_uuid,
    interaction_type,
    interaction_source,
    funnel_status_at_time,
    previous_status,
    status_changed,
    salesperson_id,
    notes,
    metadata,
    created_at
  )
  SELECT
    id,
    lead_uuid,
    interaction_type,
    interaction_source,
    funnel_status_at_time,
    previous_status,
    status_changed,
    salesperson_id,
    notes,
    metadata,
    created_at
  FROM contact_history
  WHERE lead_uuid = target_uuid;

  DELETE FROM contact_history WHERE lead_uuid = target_uuid;

  UPDATE leads
  SET is_archived = true, archived_at = NOW()
  WHERE uuid = target_uuid;

  IF lead_row.assigned_to IS NOT NULL THEN
    PERFORM decrement_active_lead_count(lead_row.assigned_to);
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ─────────────────────────────────────────────────────────────────────────────
-- 7. Update archive_terminal_leads: only 'lost' triggers nightly auto-archive.
--    sozlesme-imzalandi leads are no longer auto-archived (requires has_moved_in
--    confirmation from lead engineer — deferred).
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE PROCEDURE archive_terminal_leads()
LANGUAGE plpgsql AS $$
DECLARE
  lead_row RECORD;
  cutoff_date TIMESTAMPTZ := NOW() - INTERVAL '80 days';
  batch_count INTEGER := 0;
  max_batch INTEGER := 100;
BEGIN
  FOR lead_row IN (
    SELECT uuid
    FROM leads
    WHERE funnel_status = 'lost'
      AND is_deleted = false
      AND is_archived = false
      AND COALESCE(last_contact_at, updated_at) < cutoff_date
    ORDER BY COALESCE(last_contact_at, updated_at) ASC
    LIMIT max_batch
  ) LOOP
    BEGIN
      PERFORM archive_single_lead(lead_row.uuid, 'auto', NULL, NULL);
      batch_count := batch_count + 1;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'archive failed for lead %: %', lead_row.uuid, SQLERRM;
    END;
  END LOOP;

  RAISE NOTICE 'archived % leads', batch_count;
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 8. Update SLA cron: remove dead status references.
--    24h_window_warning kept (rows still exist until migration 0067).
--    ilgilenmiyor and ziyaret-ama-almayacak removed (no rows remain).
-- ─────────────────────────────────────────────────────────────────────────────
SELECT cron.unschedule('sla_update');
SELECT cron.schedule(
  'sla_update',
  '*/5 * * * *',
  $$
  DO $body$
  BEGIN
    IF (NOW() AT TIME ZONE 'Europe/Istanbul')::time >= TIME '09:00'
       AND (NOW() AT TIME ZONE 'Europe/Istanbul')::time < TIME '17:00' THEN
      UPDATE leads SET sla_status =
        CASE
          WHEN last_contact_at IS NOT NULL THEN 'on_time'
          WHEN sla_deadline < NOW() THEN 'breached'
          ELSE 'on_time'
        END
      WHERE is_deleted = false
        AND is_archived = false
        AND deal_awaiting = false
        AND funnel_status NOT IN ('sozlesme-imzalandi', '24h_window_warning', 'lost');
    END IF;
  END
  $body$;
  $$
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 9. Update active_lead_count_reconcile cron.
--    New active lead definition: is_deleted=false, is_archived=false, deal_awaiting=false.
--    No funnel_status exclusion — lost / sozlesme-imzalandi leads count toward the total.
-- ─────────────────────────────────────────────────────────────────────────────
SELECT cron.unschedule('active_lead_count_reconcile');
SELECT cron.schedule(
  'active_lead_count_reconcile',
  '15 3 * * *',
  $$
  UPDATE salespeople s
  SET active_lead_count = sub.cnt
  FROM (
    SELECT assigned_to AS id, COUNT(*) AS cnt
    FROM leads
    WHERE is_deleted = false
      AND is_archived = false
      AND assigned_to IS NOT NULL
      AND deal_awaiting = false
    GROUP BY assigned_to
  ) sub
  WHERE s.id = sub.id;

  UPDATE salespeople s
  SET active_lead_count = 0
  WHERE NOT EXISTS (
    SELECT 1 FROM leads l
    WHERE l.assigned_to = s.id
      AND l.is_deleted = false
      AND l.is_archived = false
      AND l.deal_awaiting = false
  );
  $$
);
