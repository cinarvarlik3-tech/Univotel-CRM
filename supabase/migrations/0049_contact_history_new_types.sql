-- Migration 0049: Extend contact_history constraints and update unarchive_single_lead.
--
-- Changes:
--   1. contact_history.interaction_type: add 'call', 'message_start'
--   2. contact_history.interaction_source: add 'chatwoot'
--   3. unarchive_single_lead: manager_uuid DEFAULT NULL, COALESCE audit note

-- ---------------------------------------------------------------------------
-- 1. contact_history.interaction_type CHECK
-- ---------------------------------------------------------------------------

ALTER TABLE contact_history DROP CONSTRAINT IF EXISTS contact_history_interaction_type_check;

ALTER TABLE contact_history ADD CONSTRAINT contact_history_interaction_type_check CHECK (
  interaction_type IN (
    'call_success',
    'call_fail',
    'message_sent',
    'message_received',
    'whatsapp_call',
    'status_change',
    'duplicate_submission',
    'reassignment',
    'form_submitted',
    'callback_scheduled',
    'correction',
    'call',
    'message_start'
  )
);

-- ---------------------------------------------------------------------------
-- 2. contact_history.interaction_source CHECK
-- ---------------------------------------------------------------------------

ALTER TABLE contact_history DROP CONSTRAINT IF EXISTS contact_history_interaction_source_check;

ALTER TABLE contact_history ADD CONSTRAINT contact_history_interaction_source_check CHECK (
  interaction_source IN ('whatsapp', 'instagram', 'netgsm', 'manual', 'chatwoot')
);

-- ---------------------------------------------------------------------------
-- 3. unarchive_single_lead — manager_uuid DEFAULT NULL
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION unarchive_single_lead(
  target_uuid UUID,
  manager_uuid UUID DEFAULT NULL
)
RETURNS void AS $$
DECLARE
  archived_row archived_leads%ROWTYPE;
  manager_name TEXT;
BEGIN
  SELECT * INTO archived_row FROM archived_leads WHERE uuid = target_uuid;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Archived lead not found: %', target_uuid;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM leads
    WHERE uuid = target_uuid
      AND is_archived = true
      AND is_deleted = false
  ) THEN
    RAISE EXCEPTION 'Lead row not in archived state: %', target_uuid;
  END IF;

  INSERT INTO contact_history (
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
  FROM archived_contact_history
  WHERE lead_uuid = target_uuid;

  DELETE FROM archived_contact_history WHERE lead_uuid = target_uuid;

  UPDATE leads
  SET is_archived = false, archived_at = NULL
  WHERE uuid = target_uuid;

  DELETE FROM archived_leads WHERE uuid = target_uuid;

  IF archived_row.assigned_to IS NOT NULL THEN
    PERFORM increment_active_lead_count(archived_row.assigned_to);
  END IF;

  SELECT full_name INTO manager_name FROM salespeople WHERE id = manager_uuid;

  INSERT INTO contact_history (
    lead_uuid,
    interaction_type,
    interaction_source,
    salesperson_id,
    notes,
    status_changed
  ) VALUES (
    target_uuid,
    'correction',
    'manual',
    manager_uuid,
    'Lead unarchived by ' || COALESCE(manager_name, manager_uuid::text, 'system/CDR'),
    false
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

COMMENT ON FUNCTION unarchive_single_lead IS 'Restores archived lead to active CRM with history and audit row. manager_uuid is optional (NULL = system/CDR trigger).';

REVOKE ALL ON FUNCTION unarchive_single_lead(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION unarchive_single_lead(UUID, UUID) TO service_role;
