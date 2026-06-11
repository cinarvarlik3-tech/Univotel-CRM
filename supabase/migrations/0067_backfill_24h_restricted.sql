-- Migration 0067: Backfill 24h_window_warning leads → is_24h_restricted boolean.
--
-- Depends on migration 0063 (is_24h_restricted column).
-- Sets is_24h_restricted = true and restores the lead's actual funnel stage.
-- Then removes 24h_window_warning from the funnel_status CHECK constraint.
-- Finally updates the SLA cron to remove the 24h_window_warning exclusion.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Backfill: convert all remaining 24h_window_warning rows.
--    Funnel status is restored to funnel_status_before_lost when available,
--    falling back to 'yeni'.
--    The loss_reason trigger will NOT clear loss_reason here because the restored
--    funnel_status is not 'lost' (and these rows should not have a loss_reason).
-- ─────────────────────────────────────────────────────────────────────────────
UPDATE leads
SET is_24h_restricted = true,
    funnel_status     = COALESCE(funnel_status_before_lost, 'yeni')
WHERE funnel_status = '24h_window_warning';

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Remove 24h_window_warning from funnel_status CHECK (no rows remain).
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_funnel_status_check;
ALTER TABLE leads ADD CONSTRAINT leads_funnel_status_check CHECK (
  funnel_status IN (
    'yeni', 'bilgi-verildi', 'aranacak', 'arandi', 'arandi-acmadi',
    'bizi-aradi-konustuk', 'ziyaret', 'ziyaret-etmedi', 'ziyaret-etti',
    'teklif-gonderildi', 'kapora-alindi', 'sozlesme-imzalandi', 'lost'
  )
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Update SLA cron: remove 24h_window_warning from exclusion list.
--    Terminal statuses for SLA exclusion are now only: sozlesme-imzalandi, lost.
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
        AND funnel_status NOT IN ('sozlesme-imzalandi', 'lost');
    END IF;
  END
  $body$;
  $$
);
