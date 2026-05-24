-- Migration 0021: Reset campaign daily_send_count and resume paused campaigns at midnight UTC.

SELECT cron.schedule(
  'campaign_daily_reset',
  '0 0 * * *',
  $$
  UPDATE campaigns
  SET daily_send_count = 0
  WHERE status IN ('running', 'paused');

  UPDATE campaigns
  SET status = 'running', paused_at = NULL
  WHERE status = 'paused';
  $$
);
