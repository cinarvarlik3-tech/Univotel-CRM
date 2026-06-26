-- Migration 0106: Sync Chatwoot conversation resolved status to leads.
--
-- is_chatwoot_resolved = true  → SLA breach check skipped for this lead.
-- Cleared automatically when a new inbound message arrives (via webhook).
-- Set by the conversation_updated webhook handler when status → 'resolved'.

ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS is_chatwoot_resolved boolean NOT NULL DEFAULT false;

-- ── Rewrite sla_update to skip resolved leads ─────────────────────────────────

SELECT cron.unschedule('sla_update') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'sla_update'
);

SELECT cron.schedule(
  'sla_update',
  '*/10 * * * *',
  $cron$
  DO $body$
  BEGIN
    IF (NOW() AT TIME ZONE 'Europe/Istanbul')::time >= TIME '09:00'
       AND (NOW() AT TIME ZONE 'Europe/Istanbul')::time < TIME '17:00' THEN

      -- Reset 24h-restricted leads to on_time (they cannot be followed up)
      UPDATE leads SET sla_status = 'on_time'
      WHERE is_deleted = false
        AND is_archived = false
        AND is_24h_restricted = true
        AND sla_status = 'breached';

      -- Update active, reachable, unresolved leads
      UPDATE leads SET sla_status =
        CASE
          WHEN (
            EXISTS (
              SELECT 1 FROM lead_messages lm
              WHERE lm.lead_uuid = leads.uuid
                AND lm.direction = 'incoming'
            )
            AND (
              SELECT MAX(created_at) FROM lead_messages lm
              WHERE lm.lead_uuid = leads.uuid AND lm.direction = 'incoming'
            ) > COALESCE(
              (SELECT MAX(created_at) FROM lead_messages lm
               WHERE lm.lead_uuid = leads.uuid AND lm.direction = 'outgoing'),
              '-infinity'::timestamptz
            )
            AND sla_business_hours_since(
              (SELECT MAX(created_at) FROM lead_messages lm
               WHERE lm.lead_uuid = leads.uuid AND lm.direction = 'incoming')
            ) >= 2
          ) THEN 'breached'
          ELSE 'on_time'
        END
      WHERE is_deleted = false
        AND is_archived = false
        AND deal_awaiting = false
        AND is_24h_restricted = false
        AND is_chatwoot_resolved = false
        AND funnel_status NOT IN ('sozlesme-imzalandi', 'lost');

    END IF;
  END
  $body$;
  $cron$
);
