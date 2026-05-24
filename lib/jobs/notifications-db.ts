/**
 * Notifications table access for throttle and audit — service role only.
 */
import { createServiceClient } from '@/lib/supabase/service';
import type { NotificationAlertType } from '@/types/domain';

/**
 * Returns count of matching unresolved notifications since a timestamp.
 * @param params - Throttle query parameters.
 * @returns Matching row count.
 */
export async function countRecentUnresolvedNotifications(params: {
  alertType: NotificationAlertType;
  since: string;
  leadUuid?: string | null;
  taskId?: string | null;
}): Promise<number> {
  const client = createServiceClient();

  let query = client
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('alert_type', params.alertType)
    .eq('is_resolved', false)
    .gte('created_at', params.since);

  if (params.leadUuid) {
    query = query.eq('lead_uuid', params.leadUuid);
  } else if (params.taskId) {
    query = query.eq('task_id', params.taskId);
  } else {
    query = query.is('lead_uuid', null).is('task_id', null);
  }

  const { count, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  return count ?? 0;
}

/**
 * Inserts a notification audit row.
 * @param params - Row fields.
 * @returns Inserted id or null on failure.
 */
export async function insertNotificationRow(params: {
  alertType: NotificationAlertType;
  message: string;
  sentTo: string[];
  leadUuid?: string | null;
  taskId?: string | null;
}): Promise<string | null> {
  const client = createServiceClient();

  const { data, error } = await client
    .from('notifications')
    .insert({
      alert_type: params.alertType,
      message: params.message,
      sent_to: params.sentTo,
      lead_uuid: params.leadUuid ?? null,
      task_id: params.taskId ?? null,
    })
    .select('id')
    .single();

  if (error) {
    console.error('[notifications] insert failed:', error.message);
    return null;
  }

  return data.id;
}
