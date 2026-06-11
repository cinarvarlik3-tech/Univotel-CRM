/**
 * Visit resolution ping job — alerts salesperson for scheduled visits that have passed without resolution.
 */
import { insertNotificationRow } from '@/lib/jobs/notifications-db';
import { isThrottled } from '@/lib/notifications/throttle';
import { createServiceClient } from '@/lib/supabase/service';
import { sendTelegramToSalesperson } from '@/lib/telegram';

/**
 * Finds visits whose scheduled_date is past but still marked 'scheduled', and pings the salesperson.
 * @returns Count of alert attempts.
 */
export async function runVisitResolutionPing(): Promise<number> {
  const client = createServiceClient();
  const today = new Date().toISOString().slice(0, 10);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: visitsRaw, error } = await (client as any)
    .from('visits')
    .select(
      'id, lead_uuid, scheduled_date, leads:lead_uuid(lead_name, salespeople:assigned_to(telegram_chat_id, full_name))',
    )
    .eq('status', 'scheduled')
    .lt('scheduled_date', today);

  if (error) {
    throw new Error(`Failed to query unresolved visits: ${error.message}`);
  }

  const visits = (visitsRaw ?? []) as Array<{
    id: string;
    lead_uuid: string;
    scheduled_date: string;
    leads: {
      lead_name: string | null;
      salespeople: { telegram_chat_id?: string; full_name?: string } | null;
    } | null;
  }>;

  let attempted = 0;

  for (const visit of visits) {
    const sp = visit.leads?.salespeople;
    if (!sp?.telegram_chat_id) continue;

    const throttled = await isThrottled({
      alertType: 'visit_resolution_pending',
      leadUuid: visit.lead_uuid,
    });
    if (throttled) continue;

    const leadName = visit.leads?.lead_name ?? visit.lead_uuid;
    const message = `[CRM] Ziyaret sonucu girilmedi\nLead: ${leadName}\nZiyaret tarihi: ${visit.scheduled_date}\nLütfen ziyareti "katıldı" veya "katılmadı" olarak işaretleyin.`;

    await sendTelegramToSalesperson(sp.telegram_chat_id, message);

    await insertNotificationRow({
      alertType: 'visit_resolution_pending',
      message,
      sentTo: [sp.telegram_chat_id],
      leadUuid: visit.lead_uuid,
    });

    attempted++;
  }

  return attempted;
}
