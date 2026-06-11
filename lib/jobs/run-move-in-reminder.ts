/**
 * Move-in reminder job — sends Telegram reminders for due move_in_reminder auto tasks.
 */
import { insertNotificationRow } from '@/lib/jobs/notifications-db';
import { isThrottled } from '@/lib/notifications/throttle';
import { createServiceClient } from '@/lib/supabase/service';
import { sendTelegramToSalesperson } from '@/lib/telegram';

/**
 * Finds due move_in_reminder auto tasks and sends throttled salesperson alerts.
 * @returns Count of alert attempts.
 */
export async function runMoveInReminder(): Promise<number> {
  const client = createServiceClient();
  const now = new Date().toISOString();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: tasksRaw, error } = await (client as any)
    .from('tasks')
    .select(
      'id, auto_task_type, due_when, assigned_to, lead_uuid, salespeople:assigned_to(telegram_chat_id, full_name), leads:lead_uuid(lead_name, lead_details(move_in))',
    )
    .eq('is_completed', false)
    .eq('is_auto_created', true)
    .eq('auto_task_type', 'move_in_reminder')
    .lte('due_when', now);

  if (error) {
    throw new Error(`Failed to query move-in reminder tasks: ${error.message}`);
  }

  const tasks = (tasksRaw ?? []) as Array<{
    id: string;
    auto_task_type: string;
    due_when: string;
    assigned_to: string | null;
    lead_uuid: string;
    salespeople: { telegram_chat_id?: string; full_name?: string } | null;
    leads: {
      lead_name: string | null;
      lead_details: { move_in?: string | null } | null;
    } | null;
  }>;

  let attempted = 0;

  for (const task of tasks) {
    const sp = task.salespeople;
    if (!sp?.telegram_chat_id) continue;

    const throttled = await isThrottled({
      alertType: 'move_in_reminder',
      taskId: task.id,
      leadUuid: task.lead_uuid,
    });
    if (throttled) continue;

    const leadName = task.leads?.lead_name ?? task.lead_uuid;
    const moveIn = task.leads?.lead_details?.move_in;
    const moveInStr = moveIn ? `\nTaşınma tarihi: ${moveIn}` : '';
    const message = `[CRM] Taşınma hatırlatıcısı\nLead: ${leadName}${moveInStr}\nKapora alındı — taşınma yaklaşıyor.`;

    await sendTelegramToSalesperson(sp.telegram_chat_id, message);

    await insertNotificationRow({
      alertType: 'move_in_reminder',
      message,
      sentTo: [sp.telegram_chat_id],
      taskId: task.id,
      leadUuid: task.lead_uuid,
    });

    attempted++;
  }

  return attempted;
}
