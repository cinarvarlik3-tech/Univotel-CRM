/**
 * SLA breach alert job logic — queries breached leads and sends Telegram alerts.
 */
import { createServiceClient } from '@/lib/supabase/service';
import { sendTelegramToManagers } from '@/lib/telegram';

/**
 * Finds newly breached leads and sends Telegram alerts.
 * @returns Count of leads alerted.
 */
export async function runSlaAlerts(): Promise<number> {
  const client = createServiceClient();

  const { data: breached, error } = await client
    .from('leads')
    .select('uuid, lead_phone, lead_name, lead_source, sla_deadline')
    .eq('is_deleted', false)
    .eq('sla_status', 'breached')
    .is('sla_breach_alerted_at', null);

  if (error) {
    throw new Error(`Failed to query breached leads: ${error.message}`);
  }

  for (const lead of breached ?? []) {
    await sendTelegramToManagers(
      `[CRM] SLA BREACHED\nPhone: ${lead.lead_phone}\nName: ${lead.lead_name ?? 'N/A'}\nSource: ${lead.lead_source}\nDeadline: ${lead.sla_deadline}`,
    );

    await client
      .from('leads')
      .update({ sla_breach_alerted_at: new Date().toISOString() })
      .eq('uuid', lead.uuid);
  }

  return breached?.length ?? 0;
}
