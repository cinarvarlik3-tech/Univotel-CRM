/**
 * Task overdue alert job logic — flags late tasks and sends Telegram notifications.
 */
import { createServiceClient } from '@/lib/supabase/service';
import { sendTelegramToManagers, sendTelegramToSalesperson } from '@/lib/telegram';

/**
 * Marks overdue tasks as late and sends Telegram alerts.
 * @returns Count of tasks alerted.
 */
export async function runTaskOverdueAlerts(): Promise<number> {
  const client = createServiceClient();
  const now = new Date().toISOString();
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

  const { data: newlyOverdueRaw, error } = await client
    .from('tasks')
    .select('id, task_type, due_when, assigned_to, lead_uuid, salespeople:assigned_to(telegram_chat_id, full_name)')
    .eq('is_completed', false)
    .eq('is_late', false)
    .lt('due_when', now);

  if (error) {
    throw new Error(`Failed to query overdue tasks: ${error.message}`);
  }

  const newlyOverdue = (newlyOverdueRaw ?? []) as Array<{
    id: string;
    task_type: string;
    due_when: string;
    assigned_to: string;
    lead_uuid: string;
    salespeople: { telegram_chat_id?: string; full_name?: string } | null;
  }>;

  let alerted = 0;

  for (const task of newlyOverdue) {
    await client.from('tasks').update({ is_late: true }).eq('id', task.id);

    const sp = task.salespeople;
    const message = `[CRM] Overdue task: ${task.task_type}\nDue: ${task.due_when}\nLead: ${task.lead_uuid}`;

    if (sp?.telegram_chat_id) {
      await sendTelegramToSalesperson(sp.telegram_chat_id, message);
    }

    if (task.due_when < oneHourAgo) {
      await sendTelegramToManagers(`[CRM] Task overdue 1hr+ — escalated to managers.\n${message}`);
    }

    alerted++;
  }

  return alerted;
}
