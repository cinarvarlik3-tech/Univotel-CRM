/**
 * Nurture task alert job — sends Telegram reminders for due auto-created nurture/followup tasks.
 */
import { insertNotificationRow } from '@/lib/jobs/notifications-db';
import { isThrottled } from '@/lib/notifications/throttle';
import { createServiceClient } from '@/lib/supabase/service';
import { sendTelegramToSalesperson } from '@/lib/telegram';

const NURTURE_AUTO_TASK_TYPES = [
  'nurture_reminder',
  'failed_visit_followup',
  'post_visit_nurture_reminder',
] as const;

/**
 * Finds due auto-created nurture tasks and sends throttled salesperson alerts.
 * @returns Count of alert attempts.
 */
export async function runNurtureTaskAlerts(): Promise<number> {
  const client = createServiceClient();
  const now = new Date().toISOString();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: tasksRaw, error } = await (client as any)
    .from('tasks')
    .select(
      'id, auto_task_type, due_when, assigned_to, lead_uuid, salespeople:assigned_to(telegram_chat_id, full_name)',
    )
    .eq('is_completed', false)
    .eq('is_auto_created', true)
    .in('auto_task_type', NURTURE_AUTO_TASK_TYPES)
    .lte('due_when', now);

  if (error) {
    throw new Error(`Failed to query nurture tasks: ${error.message}`);
  }

  const tasks = (tasksRaw ?? []) as Array<{
    id: string;
    auto_task_type: string;
    due_when: string;
    assigned_to: string | null;
    lead_uuid: string;
    salespeople: { telegram_chat_id?: string; full_name?: string } | null;
  }>;

  let attempted = 0;

  for (const task of tasks) {
    const sp = task.salespeople;
    if (!sp?.telegram_chat_id) continue;

    const throttled = await isThrottled({
      alertType: 'nurture_task_due',
      taskId: task.id,
      leadUuid: task.lead_uuid,
    });
    if (throttled) continue;

    const message = `[CRM] Takip hatırlatıcısı: ${task.auto_task_type}\nGörev zamanı: ${task.due_when}\nLead: ${task.lead_uuid}`;

    await sendTelegramToSalesperson(sp.telegram_chat_id, message);

    await insertNotificationRow({
      alertType: 'nurture_task_due',
      message,
      sentTo: [sp.telegram_chat_id],
      taskId: task.id,
      leadUuid: task.lead_uuid,
    });

    attempted++;
  }

  return attempted;
}
