-- Migration 0104: Rewrite sla_update cron body.
--
-- New breach definition: an unanswered inbound message with ≥2 Istanbul business
-- hours (09:00–17:00) elapsed since it arrived.
--
-- Exclusions added: is_24h_restricted = true leads are never marked breached.
-- Removed: sla_deadline column dependency; now computed from lead_messages.

-- ── Helper: business hours elapsed since event_time ──────────────────────────
--
-- Returns hours of Istanbul business time (09:00–17:00) elapsed between
-- event_time and now(). Covers today and yesterday; anything older returns 99.
-- Caller is responsible for ensuring now() is within business hours (the cron
-- body guards this with an IF block).

CREATE OR REPLACE FUNCTION sla_business_hours_since(ev timestamptz)
RETURNS numeric LANGUAGE sql STABLE AS $$
  WITH
    today_09 AS (
      SELECT (date_trunc('day', now() AT TIME ZONE 'Europe/Istanbul') + TIME '09:00')
             AT TIME ZONE 'Europe/Istanbul' AS t
    ),
    yest_17 AS (
      SELECT (date_trunc('day', now() AT TIME ZONE 'Europe/Istanbul') - INTERVAL '1 day' + TIME '17:00')
             AT TIME ZONE 'Europe/Istanbul' AS t
    ),
    yest_09 AS (
      SELECT (date_trunc('day', now() AT TIME ZONE 'Europe/Istanbul') - INTERVAL '1 day' + TIME '09:00')
             AT TIME ZONE 'Europe/Istanbul' AS t
    )
  SELECT
    CASE
      -- Event is during today's business hours: straight wall-clock diff
      WHEN ev >= (SELECT t FROM today_09)
        THEN EXTRACT(EPOCH FROM (now() - ev)) / 3600.0

      -- Event is in the overnight gap (yesterday 17:00 → today 09:00):
      -- count only from today's business-hours start
      WHEN ev >= (SELECT t FROM yest_17)
        THEN EXTRACT(EPOCH FROM (now() - (SELECT t FROM today_09))) / 3600.0

      -- Event is during yesterday's business hours:
      -- carry = remainder of yesterday's window + today's elapsed
      WHEN ev >= (SELECT t FROM yest_09)
        THEN EXTRACT(EPOCH FROM ((SELECT t FROM yest_17) - ev)) / 3600.0
             + EXTRACT(EPOCH FROM (now() - (SELECT t FROM today_09))) / 3600.0

      -- Older than yesterday 09:00: definitely ≥ 2 business hours
      ELSE 99.0
    END
$$;

-- ── Rewrite sla_update cron body ─────────────────────────────────────────────

SELECT cron.unschedule('sla_update') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'sla_update'
);

SELECT cron.schedule(
  'sla_update',
  '*/10 * * * *',
  $cron$
  DO $body$
  BEGIN
    -- Only run during Istanbul business hours (09:00–17:00 UTC+3)
    IF (NOW() AT TIME ZONE 'Europe/Istanbul')::time >= TIME '09:00'
       AND (NOW() AT TIME ZONE 'Europe/Istanbul')::time < TIME '17:00' THEN

      -- Reset 24h-restricted leads to on_time (they cannot be followed up)
      UPDATE leads SET sla_status = 'on_time'
      WHERE is_deleted = false
        AND is_archived = false
        AND is_24h_restricted = true
        AND sla_status = 'breached';

      -- Update active, reachable leads
      UPDATE leads SET sla_status =
        CASE
          WHEN (
            -- A reply-less inbound message exists
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
            -- And 2 business hours have elapsed
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
        AND funnel_status NOT IN ('sozlesme-imzalandi', 'lost');

    END IF;
  END
  $body$;
  $cron$
);
