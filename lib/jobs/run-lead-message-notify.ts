/**
 * Lead-message notify cron runner.
 *
 * Drains unnotified inbound Chatwoot messages and sends per-salesperson Telegram
 * pings — off the webhook hot path so an inbound surge never blocks message ingest.
 * Suppresses pings when the rep is active in Chatwoot or outside their shift, and
 * applies a per-lead cooldown. All gating decisions are made here, at delivery time.
 */
import { loadLeadMessageNotifyConfig } from '@/lib/jobs/lead-message-config';
import {
  planLeadMessageNotifications,
  type PendingLeadMessage,
  type PlanLead,
  type PlanSalesperson,
} from '@/lib/notifications/lead-message-plan';
import { insertNotificationRow } from '@/lib/notifications/record-alert';
import { createServiceClient } from '@/lib/supabase/service';
import { sendTelegramToSalesperson } from '@/lib/telegram';

/** How far back the scan looks for pending messages (bounds query size). */
const SCAN_LOOKBACK_MINUTES = 60;
/** Hard cap on messages pulled per tick. */
const SCAN_LIMIT = 500;
/** Above this many eligible leads for one rep, collapse into a single digest. */
const MAX_LEADS_PER_TICK = 8;

/** Aggregate outcome of a single cron run. */
export interface LeadMessageNotifyStats {
  pending: number;
  sent: number;
  suppressedActive: number;
  suppressedShift: number;
  dropped: number;
  cooldownSkipped: number;
}

/**
 * Runs one notify tick: scan -> resolve -> plan -> deliver -> record.
 * @param now - Evaluation instant; defaults to current time (injectable for tests).
 */
export async function runLeadMessageNotifications(
  now: Date = new Date(),
): Promise<LeadMessageNotifyStats> {
  const empty: LeadMessageNotifyStats = {
    pending: 0,
    sent: 0,
    suppressedActive: 0,
    suppressedShift: 0,
    dropped: 0,
    cooldownSkipped: 0,
  };

  const config = await loadLeadMessageNotifyConfig();
  if (!config.enabled) return empty;

  const client = createServiceClient();
  const lookbackIso = new Date(now.getTime() - SCAN_LOOKBACK_MINUTES * 60_000).toISOString();

  // 1. Pending inbound contact messages.
  const { data: pendingRaw, error: pendingError } = await client
    .from('lead_messages')
    .select('id, lead_uuid, content, sender_name, created_at')
    .is('notified_at', null)
    .eq('message_type', 'incoming')
    .eq('sender_type', 'contact')
    .eq('is_private', false)
    .gte('created_at', lookbackIso)
    .order('created_at', { ascending: true })
    .limit(SCAN_LIMIT);

  if (pendingError) {
    throw new Error(`lead_messages scan failed: ${pendingError.message}`);
  }

  const messages: PendingLeadMessage[] = (pendingRaw ?? []).map((row) => ({
    id: row.id,
    leadUuid: row.lead_uuid,
    content: row.content,
    senderName: row.sender_name,
    createdAt: row.created_at,
  }));

  if (messages.length === 0) return empty;

  // 2. Resolve the leads these messages belong to.
  const leadUuids = [...new Set(messages.map((m) => m.leadUuid))];
  const { data: leadRows, error: leadError } = await client
    .from('leads')
    .select('uuid, lead_name, lead_phone, assigned_to, source_details')
    .in('uuid', leadUuids);

  if (leadError) {
    throw new Error(`leads lookup failed: ${leadError.message}`);
  }

  const leads = new Map<string, PlanLead>();
  for (const row of leadRows ?? []) {
    const details = (row.source_details ?? {}) as { chatwoot_url?: string | null };
    leads.set(row.uuid, {
      uuid: row.uuid,
      leadName: row.lead_name,
      leadPhone: row.lead_phone,
      assignedTo: row.assigned_to,
      chatwootUrl: typeof details.chatwoot_url === 'string' ? details.chatwoot_url : null,
    });
  }

  // 3. Resolve assigned salespeople.
  const salespersonIds = [
    ...new Set(
      [...leads.values()].map((l) => l.assignedTo).filter((id): id is string => Boolean(id)),
    ),
  ];

  const salespeople = new Map<string, PlanSalesperson>();
  if (salespersonIds.length > 0) {
    const { data: spRows, error: spError } = await client
      .from('salespeople')
      .select('id, full_name, telegram_chat_id, chatwoot_user_id, shift_start, shift_end')
      .in('id', salespersonIds);

    if (spError) {
      throw new Error(`salespeople lookup failed: ${spError.message}`);
    }

    for (const row of spRows ?? []) {
      salespeople.set(row.id, {
        id: row.id,
        fullName: row.full_name,
        telegramChatId: row.telegram_chat_id,
        chatwootUserId: row.chatwoot_user_id,
        shiftStart: row.shift_start,
        shiftEnd: row.shift_end,
      });
    }
  }

  // 4. Determine which reps are currently active in Chatwoot (recent agent messages).
  const candidateChatwootIds = [
    ...new Set(
      [...salespeople.values()]
        .map((s) => s.chatwootUserId)
        .filter((id): id is number => id != null),
    ),
  ];

  const activeChatwootUserIds = new Set<number>();
  if (candidateChatwootIds.length > 0) {
    const activeSince = new Date(now.getTime() - config.activeWindowMinutes * 60_000).toISOString();
    const { data: activityRows, error: activityError } = await client
      .from('lead_messages')
      .select('sender_id')
      .eq('sender_type', 'user')
      .in('sender_id', candidateChatwootIds)
      .gte('created_at', activeSince);

    if (activityError) {
      throw new Error(`chatwoot activity lookup failed: ${activityError.message}`);
    }

    for (const row of activityRows ?? []) {
      if (row.sender_id != null) activeChatwootUserIds.add(row.sender_id);
    }
  }

  // 5. Per-lead cooldown: leads pinged within the cooldown window are skipped this tick.
  const cooldownSince = new Date(now.getTime() - config.cooldownMinutes * 60_000).toISOString();
  const { data: recentNotifs, error: notifError } = await client
    .from('notifications')
    .select('lead_uuid')
    .eq('alert_type', 'lead_message')
    .gte('created_at', cooldownSince)
    .in('lead_uuid', leadUuids);

  if (notifError) {
    throw new Error(`cooldown lookup failed: ${notifError.message}`);
  }

  const leadsInCooldown = new Set<string>();
  for (const row of recentNotifs ?? []) {
    if (row.lead_uuid) leadsInCooldown.add(row.lead_uuid);
  }

  // 6. Plan (pure).
  const plan = planLeadMessageNotifications({
    now,
    messages,
    leads,
    salespeople,
    activeChatwootUserIds,
    leadsInCooldown,
    maxLeadsPerTick: MAX_LEADS_PER_TICK,
  });

  // 7. Deliver, then record audit rows (per lead, for cooldown tracking).
  for (const send of plan.sends) {
    await sendTelegramToSalesperson(send.chatId, send.text);
    for (const leadUuid of send.leadUuids) {
      await insertNotificationRow({
        alertType: 'lead_message',
        message: send.text,
        sentTo: [send.chatId],
        leadUuid,
      });
    }
  }

  // 8. Stamp processed messages so they leave the pending scan.
  if (plan.markNotifiedIds.length > 0) {
    const { error: markError } = await client
      .from('lead_messages')
      .update({ notified_at: now.toISOString() })
      .in('id', plan.markNotifiedIds);

    if (markError) {
      throw new Error(`lead_messages notified_at update failed: ${markError.message}`);
    }
  }

  return { pending: messages.length, ...plan.stats };
}
