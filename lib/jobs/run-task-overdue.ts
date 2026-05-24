/**
 * Task overdue alert job logic — throttled Telegram alerts for late tasks.
 */
import { insertNotificationRow } from '@/lib/jobs/notifications-db';
import { isThrottled } from '@/lib/notifications/throttle';
import { sendManagerNotification } from '@/lib/notifications/send-manager-alert';
import { createServiceClient } from '@/lib/supabase/service';
import { sendTelegramToSalesperson } from '@/lib/telegram';

/**
 * Marks newly overdue tasks as late, then sends throttled salesperson and manager alerts.
 * @returns Count of salesperson alert attempts (including throttled).
 */
export async function runTaskOverdueAlerts(): Promise<number> {
  const client = createServiceClient();
  const now = new Date().toISOString();
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

  await client
    .from('tasks')
    .update({ is_late: true })
    .eq('is_completed', false)
    .eq('is_late', false)
    .lt('due_when', now);

  const { data: overdueTasksRaw, error } = await client
    .from('tasks')
    .select(
      'id, task_type, due_when, assigned_to, lead_uuid, salespeople:assigned_to(telegram_chat_id, full_name)',
    )
    .eq('is_completed', false)
    .eq('is_late', true);

  if (error) {
    throw new Error(`Failed to query overdue tasks: ${error.message}`);
  }

  const overdueTasks = (overdueTasksRaw ?? []) as Array<{
    id: string;
    task_type: string;
    due_when: string;
    assigned_to: string;
    lead_uuid: string;
    salespeople: { telegram_chat_id?: string; full_name?: string } | null;
  }>;

  let attempted = 0;

  for (const task of overdueTasks) {
    const message = `[CRM] Overdue task: ${task.task_type}\nDue: ${task.due_when}\nLead: ${task.lead_uuid}`;
    const throttled = await isThrottled({
      alertType: 'task_overdue',
      taskId: task.id,
      leadUuid: task.lead_uuid,
    });

    if (!throttled) {
      const sp = task.salespeople;
      const sentTo: string[] = [];

      if (sp?.telegram_chat_id) {
        await sendTelegramToSalesperson(sp.telegram_chat_id, message);
        sentTo.push(sp.telegram_chat_id);
      }

      await insertNotificationRow({
        alertType: 'task_overdue',
        message,
        sentTo,
        taskId: task.id,
        leadUuid: task.lead_uuid,
      });

      attempted++;
    }

    if (task.due_when < oneHourAgo) {
      await sendManagerNotification({
        alertType: 'task_overdue',
        taskId: task.id,
        leadUuid: task.lead_uuid,
        message: `[CRM] Task overdue 1hr+ — escalated to managers.\n${message}`,
      });
    }
  }

  return attempted;
}
