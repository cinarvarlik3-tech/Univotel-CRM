/**
 * Move-in reminder job — broadcasts move_in_tomorrow and move_in_today events.
 *
 * Runs daily at 06:30 UTC (09:30 Istanbul). Queries leads whose move_in date is
 * tomorrow or today (Istanbul calendar day), then fires the appropriate event.
 * Recipients: managersAndAbove ∪ propertyResponsible (broadcast to allStaff if none).
 * Dedupe: 24h throttle per lead per event kind inside notify().
 */
import { createServiceClient } from '@/lib/supabase/service';
import { notify } from '@/lib/notifications/notify';
import { istanbulCalendarDay } from '@/lib/i18n/format-date';

const TERMINAL_STATUSES = ['sozlesme-imzalandi', 'lost', 'deal_awaiting'] as const;

interface LeadDetails {
  lead_uuid: string;
  purchased_room: string | null;
}

interface ActiveLead {
  uuid: string;
  lead_name: string | null;
}

interface RunMoveInStats {
  tomorrow: number;
  today: number;
}

async function notifyForDate(
  client: ReturnType<typeof createServiceClient>,
  targetDate: string,
  eventKind: 'move_in_tomorrow' | 'move_in_today',
): Promise<number> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: detailRows, error: detailsError } = await (client as any)
    .from('lead_details')
    .select('lead_uuid, purchased_room')
    .eq('move_in', targetDate);

  if (detailsError) throw new Error(`lead_details query failed: ${detailsError.message}`);
  const details: LeadDetails[] = detailRows ?? [];
  if (details.length === 0) return 0;

  const leadIds = details.map((d) => d.lead_uuid);

  // Filter to leads that are active (not deleted/archived/terminal)
  let query = client
    .from('leads')
    .select('uuid, lead_name')
    .in('uuid', leadIds)
    .eq('is_deleted', false)
    .eq('is_archived', false);

  for (const status of TERMINAL_STATUSES) {
    query = query.not('funnel_status', 'eq', status);
  }

  const { data: leadRows, error: leadsError } = await query;
  if (leadsError) throw new Error(`leads query failed: ${leadsError.message}`);

  const activeLeads = new Map<string, ActiveLead>(
    ((leadRows ?? []) as ActiveLead[]).map((l) => [l.uuid, l]),
  );

  let attempted = 0;

  for (const detail of details) {
    const lead = activeLeads.get(detail.lead_uuid);
    if (!lead) continue;

    let roomType = 'bilinmeyen oda';
    let propertyName = 'bilinmeyen otel';
    let propertyId = '';

    if (detail.purchased_room) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: room } = await (client as any)
        .from('rooms')
        .select('room_type_id, property_id')
        .eq('id', detail.purchased_room)
        .maybeSingle();

      if (room) {
        propertyId = room.property_id as string;
        const [rtRow, propRow] = await Promise.all([
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (client as any)
            .from('room_types')
            .select('name')
            .eq('id', room.room_type_id)
            .maybeSingle(),
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (client as any)
            .from('properties')
            .select('hotel_name')
            .eq('id', room.property_id)
            .maybeSingle(),
        ]);
        roomType = (rtRow.data as { name: string } | null)?.name ?? roomType;
        propertyName = (propRow.data as { hotel_name: string } | null)?.hotel_name ?? propertyName;
      }
    }

    await notify({
      kind: eventKind,
      suppressible: true,
      leadId: lead.uuid,
      leadName: lead.lead_name ?? lead.uuid,
      propertyId,
      propertyName,
      roomType,
    });

    attempted++;
  }

  return attempted;
}

/**
 * Sends move_in_tomorrow for tomorrow's move-ins and move_in_today for today's.
 */
export async function runMoveInReminder(now: Date = new Date()): Promise<RunMoveInStats> {
  const client = createServiceClient();

  const todayDate = istanbulCalendarDay(now);
  const tomorrowDate = istanbulCalendarDay(new Date(now.getTime() + 24 * 60 * 60 * 1000));

  const [todayCount, tomorrowCount] = await Promise.all([
    notifyForDate(client, todayDate, 'move_in_today'),
    notifyForDate(client, tomorrowDate, 'move_in_tomorrow'),
  ]);

  return { tomorrow: tomorrowCount, today: todayCount };
}
