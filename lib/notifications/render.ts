/**
 * Message renderers for each notification event kind.
 * Pure functions — no IO.
 */
import { ISTANBUL_TIMEZONE } from '@/lib/constants';
import type { NotificationEvent } from '@/lib/notifications/events';

const CHATWOOT_BASE = 'https://marketinguni.app/app/accounts/1/conversations';

function chatwootUrl(conversationId: number): string {
  return `${CHATWOOT_BASE}/${conversationId}`;
}

function formatIstanbul(iso: string): { date: string; hour: string } {
  const d = new Date(iso);
  const date = new Intl.DateTimeFormat('tr-TR', {
    timeZone: ISTANBUL_TIMEZONE,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(d);
  const hour = new Intl.DateTimeFormat('tr-TR', {
    timeZone: ISTANBUL_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(d);
  return { date, hour };
}

/** Renders a single new-message line for use inside a digest. */
export function renderNewMessageLine(
  leadName: string,
  messageBody: string,
  isUnclaimed: boolean,
  conversationId: number | null,
): string {
  const prefix = isUnclaimed ? '[UNCLAIMED] ' : '';
  const raw = messageBody.replace(/\s+/g, ' ').trim();
  const snippet = raw.length > 160 ? `${raw.slice(0, 159)}…` : raw;
  const line = `${prefix}${leadName}: ${snippet}`;
  return conversationId != null ? `${line}\n${chatwootUrl(conversationId)}` : line;
}

/** Renders a full digest for one recipient from an array of pending rows. */
export function renderNewMessageDigest(
  rows: Array<{
    leadName: string;
    messageSnippet: string;
    isUnclaimed: boolean;
    conversationId: number | null;
  }>,
): string {
  const TELEGRAM_LIMIT = 4096;
  const SOFT_CAP = 3800;

  const header = rows.length === 1 ? '[LEAD MESSAGE]' : `[NEW MESSAGES — ${rows.length} leads]`;

  const lines: string[] = [header];
  let used = header.length + 1;
  let rendered = 0;

  for (const row of rows) {
    const block = renderNewMessageLine(
      row.leadName,
      row.messageSnippet,
      row.isUnclaimed,
      row.conversationId,
    );
    const cost = block.length + 2;
    if (used + cost > SOFT_CAP) break;
    lines.push(block);
    used += cost;
    rendered++;
  }

  const remaining = rows.length - rendered;
  if (remaining > 0) {
    lines.push(`…and ${remaining} more.`);
  }

  const text = lines.join('\n\n');
  return text.length <= TELEGRAM_LIMIT ? text : text.slice(0, TELEGRAM_LIMIT - 1) + '…';
}

function formatIstanbulSince(iso: string): string {
  const { date, hour } = formatIstanbul(iso);
  return `${date.replace(/\./g, '/')} - ${hour} GMT+3`;
}

/**
 * Renders a grouped SLA breach digest for one recipient or broadcast.
 * Each lead gets one block: name, time since last inbound, and optional Chatwoot link.
 */
export function renderSlaBreachDigest(
  leads: Array<{
    uuid: string;
    lead_name: string | null;
    lead_phone: string;
    chatwoot_conversation_id: number | null;
  }>,
  lastInbound: Map<string, string>,
  isUnassigned: boolean,
): string {
  const count = leads.length;
  const header = isUnassigned
    ? `[SLA BREACHED — UNASSIGNED — ${count} lead${count === 1 ? '' : 's'}]`
    : `[SLA BREACHED — ${count} lead${count === 1 ? '' : 's'}]`;

  const blocks: string[] = [header];

  for (const lead of leads) {
    const name = lead.lead_name ?? lead.lead_phone;
    const since = lastInbound.get(lead.uuid);
    const timeStr = since ? formatIstanbulSince(since) : '—';
    const url =
      lead.chatwoot_conversation_id != null
        ? `\n${chatwootUrl(lead.chatwoot_conversation_id)}`
        : '';
    const prefix = isUnassigned ? '[UNCLAIMED] ' : '';
    blocks.push(`${prefix}${name} — since ${timeStr}${url}`);
  }

  const text = blocks.join('\n\n');
  return text.length <= 4096 ? text : `${text.slice(0, 4095)}…`;
}

export function renderWebhookFailure(
  event: Extract<NotificationEvent, { kind: 'webhook_failure' }>,
): string {
  return (
    `[WEBHOOK FAILURE] ${event.source} — ${event.status}\n` +
    `Reason: ${event.reasonCode ?? 'n/a'}\n` +
    event.errorMessage
  );
}

export function renderVisitScheduled(
  event: Extract<NotificationEvent, { kind: 'visit_scheduled' }>,
): string {
  const { date, hour } = formatIstanbul(event.visitAt);
  return `[VISIT SCHEDULED]: ${event.leadName} will visit ${event.propertyName} on ${date} at ${hour}`;
}

export function renderVisitReminder(
  event: Extract<NotificationEvent, { kind: 'visit_reminder' }>,
): string {
  const { hour } = formatIstanbul(event.visitAt);
  const url = event.conversationId != null ? `\n${chatwootUrl(event.conversationId)}` : '';
  return (
    `[VISIT REMINDER]: ${event.leadName} will visit ${event.propertyName} tomorrow at ${hour}. ` +
    `Make sure to confirm with customer and property.` +
    url
  );
}

export function renderDealSigned(
  event: Extract<NotificationEvent, { kind: 'deal_signed' }>,
): string {
  return (
    `[DEAL SIGNED]: ${event.leadName} has signed the deal for ${event.roomType} in ` +
    `${event.propertyName} and has presumably moved in.`
  );
}

export function renderVisitResolutionPing(): string {
  return 'Hey, log your visits from today if you forgot any.';
}

export function renderMoveInTomorrow(
  event: Extract<NotificationEvent, { kind: 'move_in_tomorrow' }>,
): string {
  return (
    `[MOVE-IN]: ${event.leadName} is moving into ${event.roomType} in ` +
    `${event.propertyName} tomorrow. Make sure to greet.`
  );
}

export function renderMoveInToday(
  event: Extract<NotificationEvent, { kind: 'move_in_today' }>,
): string {
  return (
    `[MOVE-IN]: ${event.leadName} is moving into ${event.roomType} in ` +
    `${event.propertyName} today. Make sure to greet.`
  );
}

export function renderNurtureNudge(): string {
  return 'Make sure to check your tasks and complete them.';
}

/** Dispatches to the correct renderer for non-new_message events. */
export function renderEvent(event: Exclude<NotificationEvent, { kind: 'new_message' }>): string {
  switch (event.kind) {
    case 'webhook_failure':
      return renderWebhookFailure(event);
    case 'visit_scheduled':
      return renderVisitScheduled(event);
    case 'visit_reminder':
      return renderVisitReminder(event);
    case 'deal_signed':
      return renderDealSigned(event);
    case 'visit_resolution_ping':
      return renderVisitResolutionPing();
    case 'move_in_tomorrow':
      return renderMoveInTomorrow(event);
    case 'move_in_today':
      return renderMoveInToday(event);
    case 'nurture_nudge':
      return renderNurtureNudge();
  }
}
