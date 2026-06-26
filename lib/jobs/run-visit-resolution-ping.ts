/**
 * Visit resolution ping job — pings each agent who has ≥1 unresolved visit today.
 *
 * Runs daily at 14:30 UTC (17:30 Istanbul). Finds visits with scheduled_date = today
 * (Istanbul) still in 'scheduled' status, groups by the lead's assigned salesperson,
 * and sends one blanket reminder per qualifying agent.
 *
 * Recipient guard: only allStaff roles (salesperson/operator/manager/superadmin).
 * partner_operators are excluded.
 */
import { createServiceClient } from '@/lib/supabase/service';
import { notify } from '@/lib/notifications/notify';
import { istanbulCalendarDay } from '@/lib/i18n/format-date';

/**
 * Sends one visit_resolution_ping per agent with ≥1 unresolved visit today.
 * @returns Count of agents pinged.
 */
export async function runVisitResolutionPing(now: Date = new Date()): Promise<number> {
  const client = createServiceClient();
  const today = istanbulCalendarDay(now);

  // 1. Find visits that are still 'scheduled' today.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: visitsRaw, error: visitError } = await (client as any)
    .from('visits')
    .select('lead_uuid')
    .eq('status', 'scheduled')
    .eq('scheduled_date', today);

  if (visitError) throw new Error(`visits query failed: ${visitError.message}`);
  const visits = (visitsRaw ?? []) as Array<{ lead_uuid: string }>;
  if (visits.length === 0) return 0;

  const leadIds = [...new Set(visits.map((v) => v.lead_uuid))];

  // 2. Get assigned_to for each lead.
  const { data: leadsRaw, error: leadsError } = await client
    .from('leads')
    .select('uuid, assigned_to')
    .in('uuid', leadIds)
    .not('assigned_to', 'is', null);

  if (leadsError) throw new Error(`leads query failed: ${leadsError.message}`);
  const leads = (leadsRaw ?? []) as Array<{ uuid: string; assigned_to: string }>;

  const assignedToIds = [...new Set(leads.map((l) => l.assigned_to))];
  if (assignedToIds.length === 0) return 0;

  // 3. Cross-reference with allStaff roles to exclude partner_operators.
  const { data: staffRaw, error: staffError } = await client
    .from('salespeople')
    .select('id, telegram_chat_id')
    .in('id', assignedToIds)
    .eq('is_active', true)
    .in('role', ['salesperson', 'operator', 'manager', 'superadmin'])
    .not('telegram_chat_id', 'is', null);

  if (staffError) throw new Error(`salespeople query failed: ${staffError.message}`);
  const staff = (staffRaw ?? []) as Array<{ id: string; telegram_chat_id: string }>;

  const chatIdById = new Map(staff.map((s) => [s.id, s.telegram_chat_id]));
  const assignedToByLead = new Map(leads.map((l) => [l.uuid, l.assigned_to]));

  // 4. Count unresolved visits per chat ID.
  const countByChatId = new Map<string, number>();
  for (const visit of visits) {
    const assignedTo = assignedToByLead.get(visit.lead_uuid);
    if (!assignedTo) continue;
    const chatId = chatIdById.get(assignedTo);
    if (!chatId) continue;
    countByChatId.set(chatId, (countByChatId.get(chatId) ?? 0) + 1);
  }

  // 5. Send one ping per qualifying agent.
  let attempted = 0;
  for (const [chatId, unresolvedCount] of countByChatId) {
    await notify({
      kind: 'visit_resolution_ping',
      suppressible: true,
      recipientChatId: chatId,
      unresolvedCount,
    });
    attempted++;
  }

  return attempted;
}
