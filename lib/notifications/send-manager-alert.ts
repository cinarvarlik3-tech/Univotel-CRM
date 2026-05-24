/**
 * Throttled manager Telegram alerts with notifications audit logging.
 */
import { insertNotificationRow } from '@/lib/notifications/record-alert';
import { isThrottled } from '@/lib/notifications/throttle';
import { getManagerChatIds } from '@/lib/env';
import { deliverTelegramToChatIds } from '@/lib/telegram/deliver';
import type { NotificationAlertType } from '@/types/domain';

/** Result of a manager notification send attempt. */
export interface SendManagerNotificationResult {
  sent: boolean;
  throttled: boolean;
}

/**
 * Sends a throttled Telegram alert to all managers and records it in notifications.
 * @param params - Alert type, message, and optional entity references.
 * @returns Whether the message was sent or throttled.
 */
export async function sendManagerNotification(params: {
  alertType: NotificationAlertType;
  message: string;
  leadUuid?: string | null;
  taskId?: string | null;
}): Promise<SendManagerNotificationResult> {
  const throttled = await isThrottled({
    alertType: params.alertType,
    leadUuid: params.leadUuid,
    taskId: params.taskId,
  });

  if (throttled) {
    return { sent: false, throttled: true };
  }

  const chatIds = getManagerChatIds();
  if (chatIds.length === 0) {
    return { sent: false, throttled: false };
  }

  await deliverTelegramToChatIds(chatIds, params.message);

  await insertNotificationRow({
    alertType: params.alertType,
    message: params.message,
    sentTo: chatIds,
    leadUuid: params.leadUuid,
    taskId: params.taskId,
  });

  return { sent: true, throttled: false };
}
