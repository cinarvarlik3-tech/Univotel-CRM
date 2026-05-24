/**
 * SLA breach alert job logic — queries breached leads and sends throttled Telegram alerts.
 */
import { TERMINAL_FUNNEL_STATUSES } from '@/lib/constants';
import { sendManagerNotification } from '@/lib/notifications/send-manager-alert';
import { createServiceClient } from '@/lib/supabase/service';

/**
 * Finds breached active leads and sends throttled manager alerts.
 * @returns Count of alert attempts (including throttled sends).
 */
export async function runSlaAlerts(): Promise<number> {
  const client = createServiceClient();
  const terminalList = `(${TERMINAL_FUNNEL_STATUSES.map((s) => `"${s}"`).join(',')})`;

  const { data: breached, error } = await client
    .from('leads')
    .select('uuid, lead_phone, lead_name, lead_source, sla_deadline')
    .eq('is_deleted', false)
    .eq('is_archived', false)
    .eq('sla_status', 'breached')
    .not('funnel_status', 'in', terminalList);

  if (error) {
    throw new Error(`Failed to query breached leads: ${error.message}`);
  }

  let attempted = 0;

  for (const lead of breached ?? []) {
    await sendManagerNotification({
      alertType: 'sla_breach',
      leadUuid: lead.uuid,
      message: `[CRM] SLA BREACHED\nPhone: ${lead.lead_phone}\nName: ${lead.lead_name ?? 'N/A'}\nSource: ${lead.lead_source}\nDeadline: ${lead.sla_deadline}`,
    });
    attempted++;
  }

  return attempted;
}
