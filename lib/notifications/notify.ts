/**
 * Single entry point for the notification pipeline.
 *
 *   event → resolveRecipients → render → cooldown/ledger → dispatch → writeLedger
 *
 * new_message is handled as enqueue → pending_notifications (flushed by cron).
 * visit_resolution_ping and nurture_nudge carry a pre-resolved recipientChatId;
 * they are dispatched directly without a ledger entry.
 * All other types are dispatched inline with throttle + ledger.
 */
import { createServiceClient } from '@/lib/supabase/service';
import { dispatch } from '@/lib/notifications/dispatch';
import { renderEvent } from '@/lib/notifications/render';
import { insertNotificationRow } from '@/lib/notifications/record-alert';
import { isThrottled } from '@/lib/notifications/throttle';
import {
  assigneeOnly,
  allStaff,
  superadminsOnly,
  visitRecipients,
  managersAndAbove,
} from '@/lib/notifications/recipients';
import type { NotificationEvent } from '@/lib/notifications/events';

const SNIPPET_MAX = 200;

function truncate(text: string, max = SNIPPET_MAX): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  return clean.length <= max ? clean : `${clean.slice(0, max - 1)}…`;
}

/** Enqueues a new_message event to pending_notifications. Recipients are resolved now. */
async function enqueueNewMessage(
  event: Extract<NotificationEvent, { kind: 'new_message' }>,
): Promise<void> {
  const client = createServiceClient();

  // Resolve recipients at enqueue time so the snapshot is correct even if
  // assignment changes before the flush cron runs.
  const assignee = await assigneeOnly(event.leadId);
  const isUnclaimed = assignee.length === 0;
  const recipientChatIds = isUnclaimed ? await allStaff() : assignee;

  if (recipientChatIds.length === 0) return;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (client as any).from('pending_notifications').insert({
    lead_id: event.leadId,
    lead_name: event.leadName,
    conversation_id: event.conversationId,
    message_snippet: truncate(event.messageBody),
    is_unclaimed: isUnclaimed,
    recipient_chat_ids: recipientChatIds,
  });
}

/** Handles all inline-dispatch events: resolve → render → dedup → dispatch → ledger. */
async function dispatchInline(
  event: Exclude<
    NotificationEvent,
    { kind: 'new_message' | 'visit_resolution_ping' | 'nurture_nudge' }
  >,
): Promise<void> {
  let chatIds: string[];
  let leadUuid: string | null = null;

  switch (event.kind) {
    case 'webhook_failure': {
      chatIds = await superadminsOnly();
      break;
    }
    case 'visit_scheduled': {
      leadUuid = event.leadId;
      const throttled = await isThrottled({ alertType: 'visit_scheduled', leadUuid });
      if (throttled) return;
      chatIds = await visitRecipients({ propertyId: event.propertyId });
      break;
    }
    case 'visit_reminder': {
      leadUuid = event.leadId;
      const throttled = await isThrottled({ alertType: 'visit_reminder', leadUuid });
      if (throttled) return;
      chatIds = await visitRecipients({ propertyId: event.propertyId, leadId: event.leadId });
      break;
    }
    case 'deal_signed': {
      leadUuid = event.leadId;
      const throttled = await isThrottled({ alertType: 'deal_signed', leadUuid });
      if (throttled) return;
      chatIds = await managersAndAbove();
      break;
    }
    case 'move_in_tomorrow': {
      leadUuid = event.leadId;
      const throttled = await isThrottled({ alertType: 'move_in_tomorrow', leadUuid });
      if (throttled) return;
      chatIds = await visitRecipients({ propertyId: event.propertyId });
      break;
    }
    case 'move_in_today': {
      leadUuid = event.leadId;
      const throttled = await isThrottled({ alertType: 'move_in_today', leadUuid });
      if (throttled) return;
      chatIds = await visitRecipients({ propertyId: event.propertyId });
      break;
    }
  }

  if (chatIds.length === 0) return;

  const message = renderEvent(event);
  await dispatch(chatIds, message, event.suppressible);

  await insertNotificationRow({
    alertType: event.kind as Parameters<typeof insertNotificationRow>[0]['alertType'],
    message,
    sentTo: chatIds,
    leadUuid,
  });
}

/**
 * Dispatches a per-recipient event (visit_resolution_ping or nurture_nudge) directly.
 * The job runner already fans out per agent; no throttle or ledger entry here.
 */
async function dispatchPerRecipient(
  event: Extract<NotificationEvent, { kind: 'visit_resolution_ping' | 'nurture_nudge' }>,
): Promise<void> {
  const message = renderEvent(event);
  await dispatch([event.recipientChatId], message, event.suppressible);
}

/**
 * Fires a notification event through the pipeline.
 * new_message → enqueue; per-recipient types → direct dispatch; others → inline dispatch.
 */
export async function notify(event: NotificationEvent): Promise<void> {
  try {
    if (event.kind === 'new_message') {
      await enqueueNewMessage(event);
    } else if (event.kind === 'visit_resolution_ping' || event.kind === 'nurture_nudge') {
      await dispatchPerRecipient(event);
    } else {
      await dispatchInline(event);
    }
  } catch (err) {
    console.error(`[notify] ${event.kind} failed:`, err);
  }
}
