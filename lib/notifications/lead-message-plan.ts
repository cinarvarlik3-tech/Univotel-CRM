/**
 * Pure planning logic for the lead-message notify cron.
 * Decides — from already-loaded data, with no IO — which Telegram messages to send,
 * which inbound messages to mark processed, and which to leave pending (cooldown).
 *
 * Suppression order per salesperson: active-on-Chatwoot -> outside-shift -> per-lead cooldown.
 */
import { isWithinShift } from '@/lib/notifications/shift';

/** A pending inbound lead message awaiting notification. */
export interface PendingLeadMessage {
  id: string;
  leadUuid: string;
  content: string | null;
  senderName: string | null;
  createdAt: string;
}

/** Lead fields needed to route and render a notification. */
export interface PlanLead {
  uuid: string;
  leadName: string | null;
  leadPhone: string;
  assignedTo: string | null;
  chatwootUrl: string | null;
}

/** Salesperson fields needed to gate and address a notification. */
export interface PlanSalesperson {
  id: string;
  fullName: string;
  telegramChatId: string | null;
  chatwootUserId: number | null;
  shiftStart: string | null;
  shiftEnd: string | null;
}

/** Inputs to the planner — all resolved upstream by the runner. */
export interface PlanInput {
  now: Date;
  messages: PendingLeadMessage[];
  leads: Map<string, PlanLead>;
  salespeople: Map<string, PlanSalesperson>;
  /** Chatwoot user ids with recent agent activity — these reps are suppressed entirely. */
  activeChatwootUserIds: Set<number>;
  /** Lead uuids with a recent lead_message notification — within per-lead cooldown. */
  leadsInCooldown: Set<string>;
  /** Above this many eligible leads for one rep, collapse into a single digest. */
  maxLeadsPerTick: number;
}

/** A single Telegram message to deliver. */
export interface PlannedSend {
  salespersonId: string;
  chatId: string;
  text: string;
  /** Leads represented by this send — one notifications row is written per lead. */
  leadUuids: string[];
}

/** Result of planning a single cron tick. */
export interface PlanResult {
  sends: PlannedSend[];
  /** Inbound message ids to stamp notified_at (sent, suppressed, or dropped). */
  markNotifiedIds: string[];
  stats: {
    sent: number;
    suppressedActive: number;
    suppressedShift: number;
    dropped: number;
    cooldownSkipped: number;
  };
}

const SNIPPET_MAX = 160;

/**
 * Collapses whitespace and truncates message content for a preview snippet.
 * @param content - Raw message content.
 */
function snippet(content: string | null): string {
  const text = (content ?? '').replace(/\s+/g, ' ').trim();
  if (text.length <= SNIPPET_MAX) return text;
  return `${text.slice(0, SNIPPET_MAX - 1)}…`;
}

/**
 * Resolves the display name for a lead in a notification.
 * @param lead - Lead info.
 * @param senderName - Chatwoot sender name from the latest message.
 */
function displayName(lead: PlanLead, senderName: string | null): string {
  return senderName?.trim() || lead.leadName?.trim() || lead.leadPhone;
}

/**
 * Builds a single-lead notification body, WhatsApp-preview style.
 * @param name - Lead display name.
 * @param latestContent - Most recent message content.
 * @param count - Number of pending messages from this lead.
 * @param url - Chatwoot deep link, if known.
 */
export function buildLeadMessageText(
  name: string,
  latestContent: string | null,
  count: number,
  url: string | null,
): string {
  const body =
    count > 1
      ? `💬 ${name} — ${count} yeni mesaj:\n"${snippet(latestContent)}"`
      : `💬 ${name}: "${snippet(latestContent)}"`;
  return url ? `${body}\n${url}` : body;
}

/**
 * Builds a digest body when a salesperson has more pending leads than the per-tick cap.
 * @param names - Display names of the leads, in order.
 */
export function buildDigestText(names: string[]): string {
  const shown = names.slice(0, 5).join(', ');
  const extra = names.length > 5 ? ` +${names.length - 5}` : '';
  return `💬 ${names.length} müşteriden yeni mesaj: ${shown}${extra}`;
}

/** Pending messages for one lead, newest last. */
interface LeadBucket {
  lead: PlanLead;
  messages: PendingLeadMessage[];
}

/**
 * Plans one notify tick from resolved data.
 * @param input - Loaded messages, leads, salespeople, and gating sets.
 */
export function planLeadMessageNotifications(input: PlanInput): PlanResult {
  const markNotifiedIds: string[] = [];
  const sends: PlannedSend[] = [];
  const stats = {
    sent: 0,
    suppressedActive: 0,
    suppressedShift: 0,
    dropped: 0,
    cooldownSkipped: 0,
  };

  // 1. Group messages by lead (preserve chronological order from the query).
  const byLead = new Map<string, PendingLeadMessage[]>();
  for (const msg of input.messages) {
    const list = byLead.get(msg.leadUuid);
    if (list) list.push(msg);
    else byLead.set(msg.leadUuid, [msg]);
  }

  // 2. Route each lead to its assigned salesperson; drop the unroutable.
  const bySalesperson = new Map<string, LeadBucket[]>();
  for (const [leadUuid, messages] of byLead) {
    const lead = input.leads.get(leadUuid);
    const assignedTo = lead?.assignedTo ?? null;
    const sp = assignedTo ? input.salespeople.get(assignedTo) : undefined;

    if (!lead || !sp || !sp.telegramChatId) {
      // No lead, unassigned, or rep not linked to Telegram — drop so the scan stays small.
      for (const m of messages) markNotifiedIds.push(m.id);
      stats.dropped += 1;
      continue;
    }

    const bucket = bySalesperson.get(sp.id);
    if (bucket) bucket.push({ lead, messages });
    else bySalesperson.set(sp.id, [{ lead, messages }]);
  }

  // 3. Apply gates per salesperson.
  for (const [salespersonId, buckets] of bySalesperson) {
    const sp = input.salespeople.get(salespersonId)!;
    const chatId = sp.telegramChatId!;

    const isActive =
      sp.chatwootUserId != null && input.activeChatwootUserIds.has(sp.chatwootUserId);
    if (isActive) {
      // Already in Chatwoot — they'll see the messages there. Suppress everything.
      for (const b of buckets) for (const m of b.messages) markNotifiedIds.push(m.id);
      stats.suppressedActive += buckets.length;
      continue;
    }

    if (!isWithinShift(sp.shiftStart, sp.shiftEnd, input.now)) {
      // Outside shift — drop (not deferred).
      for (const b of buckets) for (const m of b.messages) markNotifiedIds.push(m.id);
      stats.suppressedShift += buckets.length;
      continue;
    }

    // Per-lead cooldown: skip without marking so it retries once the window passes.
    const eligible: LeadBucket[] = [];
    for (const b of buckets) {
      if (input.leadsInCooldown.has(b.lead.uuid)) {
        stats.cooldownSkipped += 1;
      } else {
        eligible.push(b);
      }
    }
    if (eligible.length === 0) continue;

    if (eligible.length > input.maxLeadsPerTick) {
      const names = eligible.map((b) => displayName(b.lead, lastSenderName(b.messages)));
      sends.push({
        salespersonId,
        chatId,
        text: buildDigestText(names),
        leadUuids: eligible.map((b) => b.lead.uuid),
      });
      for (const b of eligible) for (const m of b.messages) markNotifiedIds.push(m.id);
      stats.sent += eligible.length;
      continue;
    }

    for (const b of eligible) {
      const latest = b.messages[b.messages.length - 1];
      const name = displayName(b.lead, latest.senderName);
      sends.push({
        salespersonId,
        chatId,
        text: buildLeadMessageText(name, latest.content, b.messages.length, b.lead.chatwootUrl),
        leadUuids: [b.lead.uuid],
      });
      for (const m of b.messages) markNotifiedIds.push(m.id);
      stats.sent += 1;
    }
  }

  return { sends, markNotifiedIds, stats };
}

/**
 * Reads the sender name of the most recent message in a bucket.
 * @param messages - Pending messages, newest last.
 */
function lastSenderName(messages: PendingLeadMessage[]): string | null {
  return messages[messages.length - 1]?.senderName ?? null;
}
