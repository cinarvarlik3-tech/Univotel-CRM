/**
 * Visit reminder job — sends 24h-ahead Telegram reminders for upcoming scheduled visits.
 * Recipients: assignee + propertyResponsible + managersAndAbove; broadcast if no responsible.
 */
import { createServiceClient } from '@/lib/supabase/service';
import { notify } from '@/lib/notifications/notify';
import { istanbulCalendarDay } from '@/lib/i18n/format-date';

/** Returns the Istanbul calendar day for tomorrow given a UTC instant. */
function tomorrowIstanbul(now: Date): string {
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  return istanbulCalendarDay(tomorrow);
}

/**
 * Queries all scheduled visits for tomorrow (Istanbul day), then fires visit_reminder
 * notifications (dedup handled inside notify() via isThrottled).
 */
export async function runVisitReminder(now: Date = new Date()): Promise<number> {
  const client = createServiceClient();
  const tomorrowDay = tomorrowIstanbul(now);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: visitsRaw, error } = await (client as any)
    .from('visits')
    .select(
      'id, lead_uuid, scheduled_date, property_id,' +
        'leads:lead_uuid(lead_name, chatwoot_conversation_id),' +
        'properties:property_id(hotel_name)',
    )
    .eq('status', 'scheduled')
    .eq('scheduled_date', tomorrowDay);

  if (error) throw new Error(`Failed to query tomorrow visits: ${error.message}`);

  const visits = (visitsRaw ?? []) as Array<{
    id: string;
    lead_uuid: string;
    scheduled_date: string;
    property_id: string;
    leads: { lead_name: string | null; chatwoot_conversation_id: number | null } | null;
    properties: { hotel_name: string } | null;
  }>;

  let attempted = 0;
  for (const visit of visits) {
    await notify({
      kind: 'visit_reminder',
      suppressible: true,
      visitId: visit.id,
      leadId: visit.lead_uuid,
      leadName: visit.leads?.lead_name ?? visit.lead_uuid,
      propertyId: visit.property_id,
      propertyName: visit.properties?.hotel_name ?? visit.property_id,
      visitAt: visit.scheduled_date,
      conversationId: visit.leads?.chatwoot_conversation_id ?? null,
    });
    attempted++;
  }

  return attempted;
}
