/**
 * Throttle queries against notifications table before sending Telegram alerts.
 */
import { NOTIFICATION_THROTTLE_MINUTES } from '@/lib/notifications/constants';
import { countRecentUnresolvedNotifications } from '@/lib/jobs/notifications-db';
import type { NotificationAlertType } from '@/types/domain';

/**
 * Returns true if an unresolved alert of the same type exists within the throttle window.
 * @param params - Alert type and optional lead/task identifiers.
 * @returns True when send should be skipped.
 */
export async function isThrottled(params: {
  alertType: NotificationAlertType;
  leadUuid?: string | null;
  taskId?: string | null;
}): Promise<boolean> {
  const windowMinutes = NOTIFICATION_THROTTLE_MINUTES[params.alertType];
  const since = new Date(Date.now() - windowMinutes * 60 * 1000).toISOString();

  try {
    const count = await countRecentUnresolvedNotifications({
      alertType: params.alertType,
      since,
      leadUuid: params.leadUuid,
      taskId: params.taskId,
    });
    return count > 0;
  } catch (err) {
    console.error('[notifications] throttle query failed:', err);
    return false;
  }
}
