/**
 * Notification alert types and throttle windows for Telegram manager alerts.
 */
import type { NotificationAlertType } from '@/types/domain';

/** Throttle window in minutes per alert type. */
export const NOTIFICATION_THROTTLE_MINUTES: Record<NotificationAlertType, number> = {
  sla_breach: 10,
  task_overdue: 30,
  unassigned_lead: 5,
  webhook_failure: 5,
  campaign_paused: 5,
  campaign_failed: 5,
  // Per-lead cooldown for inbound message pings. The notify cron reads its live
  // value from cron_settings (lead_message_cooldown_minutes); this is the fallback.
  lead_message: 10,
  // Auto-created nurture/followup task reminders — 2h cooldown per task.
  nurture_task_due: 120,
  // One reminder per visit per 24h window.
  visit_reminder: 1440,
  // Re-ping every hour while a visit remains unresolved past its date.
  visit_resolution_pending: 60,
  // One move-in reminder per lead per day.
  move_in_reminder: 1440,
};
