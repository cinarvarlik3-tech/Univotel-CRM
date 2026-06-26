/**
 * SLA breach alert job — once-per-hour grouped digest.
 *
 * Queries all currently-breached leads, buckets them by assignee, and sends:
 * - One message per assignee for leads assigned to them.
 * - One broadcast to all active salespeople for unassigned leads.
 */
import { TERMINAL_FUNNEL_STATUSES } from '@/lib/constants';
import { isWithinSlaBusinessHours } from '@/lib/leads/sla';
import { dispatch } from '@/lib/notifications/dispatch';
import { renderSlaBreachDigest } from '@/lib/notifications/render';
import { createServiceClient } from '@/lib/supabase/service';

interface BreachedLead {
  uuid: string;
  lead_name: string | null;
  lead_phone: string;
  assigned_to: string | null;
  chatwoot_conversation_id: number | null;
}

export async function runSlaAlerts(): Promise<number> {
  if (!isWithinSlaBusinessHours()) return 0;

  const client = createServiceClient();
  const terminalList = `(${TERMINAL_FUNNEL_STATUSES.map((s) => `"${s}"`).join(',')})`;

  // 1. All currently breached active leads.
  const { data: leads, error } = await client
    .from('leads')
    .select('uuid, lead_name, lead_phone, assigned_to, chatwoot_conversation_id')
    .eq('sla_status', 'breached')
    .eq('is_deleted', false)
    .eq('is_archived', false)
    .not('funnel_status', 'in', terminalList);

  if (error) throw new Error(`breached leads query failed: ${error.message}`);
  if (!leads?.length) return 0;

  // 2. Last inbound message timestamp per lead (for the "since" time in the digest).
  const uuids = leads.map((l) => l.uuid);
  const { data: msgs } = await client
    .from('lead_messages')
    .select('lead_uuid, created_at')
    .in('lead_uuid', uuids)
    .eq('direction', 'incoming')
    .order('created_at', { ascending: false });

  const lastInbound = new Map<string, string>();
  for (const m of msgs ?? []) {
    if (!lastInbound.has(m.lead_uuid)) lastInbound.set(m.lead_uuid, m.created_at);
  }

  // 3. Telegram chat IDs for assignees.
  const assigneeIds = [...new Set(leads.map((l) => l.assigned_to).filter(Boolean))] as string[];
  const { data: assignees } = await client
    .from('salespeople')
    .select('id, telegram_chat_id')
    .in('id', assigneeIds)
    .eq('is_active', true);

  const chatByAssignee = new Map<string, string>();
  for (const sp of assignees ?? []) {
    if (sp.id && sp.telegram_chat_id) chatByAssignee.set(sp.id, sp.telegram_chat_id);
  }

  // 4. All active salespeople for unassigned broadcast.
  const { data: allSp } = await client
    .from('salespeople')
    .select('telegram_chat_id')
    .eq('is_active', true)
    .not('telegram_chat_id', 'is', null);

  const allChatIds = (allSp ?? [])
    .map((s) => s.telegram_chat_id)
    .filter((id): id is string => id != null);

  // 5. Bucket leads: by assignee chatId, or unassigned.
  const byAssignee = new Map<string, BreachedLead[]>();
  const unassigned: BreachedLead[] = [];

  for (const lead of leads as BreachedLead[]) {
    const chatId = lead.assigned_to ? (chatByAssignee.get(lead.assigned_to) ?? null) : null;
    if (chatId) {
      const bucket = byAssignee.get(chatId) ?? [];
      bucket.push(lead);
      byAssignee.set(chatId, bucket);
    } else {
      unassigned.push(lead);
    }
  }

  // 6. Send one message per assignee.
  let dispatched = 0;
  for (const [chatId, assigneeLeads] of byAssignee) {
    const message = renderSlaBreachDigest(assigneeLeads, lastInbound, false);
    await dispatch([chatId], message);
    dispatched++;
  }

  // 7. Broadcast unassigned leads to everyone.
  if (unassigned.length > 0 && allChatIds.length > 0) {
    const message = renderSlaBreachDigest(unassigned, lastInbound, true);
    await dispatch(allChatIds, message);
    dispatched++;
  }

  return dispatched;
}
