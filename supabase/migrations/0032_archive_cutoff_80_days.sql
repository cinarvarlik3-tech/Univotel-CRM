-- Migration 0032: Extend auto-archive cutoff from 30 to 80 days (for DBs that already ran 0029).

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
  ELSIF lead_row.funnel_status IN ('ziyaret-ama-almayacak', 'ilgilenmiyor') THEN
    resolved_archive_reason := 'lost';
  ELSE
    RAISE EXCEPTION 'Lead funnel_status not eligible for auto archive: %', lead_row.funnel_status;
  END IF;

  IF archived_by_param = 'auto' THEN
    IF lead_row.funnel_status NOT IN (
      'sozlesme-imzalandi', 'ziyaret-ama-almayacak', 'ilgilenmiyor'
    ) THEN
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
    WHERE funnel_status IN (
      'sozlesme-imzalandi', 'ziyaret-ama-almayacak', 'ilgilenmiyor'
    )
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
