/**
 * Visit reminder job — sends 24h-ahead Telegram reminders for upcoming scheduled visits.
 */
import { insertNotificationRow } from '@/lib/jobs/notifications-db';
import { isThrottled } from '@/lib/notifications/throttle';
import { createServiceClient } from '@/lib/supabase/service';
import { sendTelegramToSalesperson } from '@/lib/telegram';

/**
 * Finds scheduled visits in the next 24 hours and sends throttled salesperson reminders.
 * @returns Count of alert attempts.
 */
export async function runVisitReminder(): Promise<number> {
  const client = createServiceClient();
  const now = new Date();
  const windowEnd = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: visitsRaw, error } = await (client as any)
    .from('visits')
    .select(
      'id, lead_uuid, scheduled_date, leads:lead_uuid(assigned_to, lead_name, salespeople:assigned_to(telegram_chat_id, full_name))',
    )
    .eq('status', 'scheduled')
    .gte('scheduled_date', now.toISOString().slice(0, 10))
    .lte('scheduled_date', windowEnd.toISOString().slice(0, 10));

  if (error) {
    throw new Error(`Failed to query upcoming visits: ${error.message}`);
  }

  const visits = (visitsRaw ?? []) as Array<{
    id: string;
    lead_uuid: string;
    scheduled_date: string;
    leads: {
      assigned_to: string | null;
      lead_name: string | null;
      salespeople: { telegram_chat_id?: string; full_name?: string } | null;
    } | null;
  }>;

  let attempted = 0;

  for (const visit of visits) {
    const sp = visit.leads?.salespeople;
    if (!sp?.telegram_chat_id) continue;

    const throttled = await isThrottled({
      alertType: 'visit_reminder',
      leadUuid: visit.lead_uuid,
    });
    if (throttled) continue;

    const leadName = visit.leads?.lead_name ?? visit.lead_uuid;
    const message = `[CRM] Yarın ziyaret var\nLead: ${leadName}\nTarih: ${visit.scheduled_date}`;

    await sendTelegramToSalesperson(sp.telegram_chat_id, message);

    await insertNotificationRow({
      alertType: 'visit_reminder',
      message,
      sentTo: [sp.telegram_chat_id],
      leadUuid: visit.lead_uuid,
    });

    attempted++;
  }

  return attempted;
}
