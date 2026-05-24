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
};
