/**
 * Lead-message notify cron runner — flush path.
 *
 * Drains unflushed rows from pending_notifications (written by the webhook
 * enqueue path) into per-recipient Telegram digests.  Runs every 60 s so
 * messages sent close together coalesce into one ping.
 *
 * Shift-window suppression is applied per recipient at flush time.
 * Suppressed rows are marked flushed (dropped) — a 60-second-late message
 * is fine; a 6-hour-late "you had messages" is noise.
 */
import { createServiceClient } from '@/lib/supabase/service';
import { isWithinShift } from '@/lib/notifications/shift';
import { renderNewMessageDigest } from '@/lib/notifications/render';
import { dispatch } from '@/lib/notifications/dispatch';

/** Shape returned by the cron endpoint. */
export interface LeadMessageNotifyStats {
  pending: number;
  flushed: number;
  recipients: number;
  suppressedShift: number;
}

/** A single row from pending_notifications. */
interface PendingRow {
  id: string;
  lead_id: string;
  lead_name: string;
  conversation_id: number | null;
  message_snippet: string;
  is_unclaimed: boolean;
  recipient_chat_ids: string[];
}

/** Salesperson fields needed for shift-window check. */
interface ShiftInfo {
  telegram_chat_id: string;
  shift_start: string | null;
  shift_end: string | null;
}

/**
 * Runs one flush tick: read → fan-out → shift-gate → digest → send → mark flushed.
 */
export async function runLeadMessageNotifications(
  now: Date = new Date(),
): Promise<LeadMessageNotifyStats> {
  const client = createServiceClient();

  // 1. Read all unflushed rows.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: rawRows, error: readError } = await (client as any)
    .from('pending_notifications')
    .select(
      'id, lead_id, lead_name, conversation_id, message_snippet, is_unclaimed, recipient_chat_ids',
    )
    .is('flushed_at', null)
    .order('created_at', { ascending: true })
    .limit(500);

  if (readError) throw new Error(`pending_notifications read failed: ${readError.message}`);
  const rows: PendingRow[] = rawRows ?? [];
  if (rows.length === 0) return { pending: 0, flushed: 0, recipients: 0, suppressedShift: 0 };

  // 2. Collect all unique chat IDs across rows.
  const allChatIds = [...new Set(rows.flatMap((r) => r.recipient_chat_ids))];

  // 3. Fetch shift info for each chat ID.
  const { data: spRows } = await client
    .from('salespeople')
    .select('telegram_chat_id, shift_start, shift_end')
    .in('telegram_chat_id', allChatIds)
    .eq('is_active', true);

  const shiftByChatId = new Map<string, ShiftInfo>();
  for (const sp of spRows ?? []) {
    if (sp.telegram_chat_id) shiftByChatId.set(sp.telegram_chat_id, sp as ShiftInfo);
  }

  // 4. Fan out: recipient chat ID → list of rows for that recipient.
  const byRecipient = new Map<string, PendingRow[]>();
  for (const row of rows) {
    for (const chatId of row.recipient_chat_ids) {
      const bucket = byRecipient.get(chatId);
      if (bucket) bucket.push(row);
      else byRecipient.set(chatId, [row]);
    }
  }

  // 5. Per recipient: apply shift gate, build digest, send.
  let recipientCount = 0;
  let suppressedShift = 0;

  for (const [chatId, recipientRows] of byRecipient) {
    const shift = shiftByChatId.get(chatId);
    if (shift && !isWithinShift(shift.shift_start, shift.shift_end, now)) {
      suppressedShift++;
      continue;
    }

    const digestRows = recipientRows.map((r) => ({
      leadName: r.lead_name,
      messageSnippet: r.message_snippet,
      isUnclaimed: r.is_unclaimed,
      conversationId: r.conversation_id,
    }));

    const message = renderNewMessageDigest(digestRows);
    await dispatch([chatId], message);
    recipientCount++;
  }

  // 6. Mark all processed rows flushed (including shift-suppressed — drop them).
  const processedIds = rows.map((r) => r.id);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: markError } = await (client as any)
    .from('pending_notifications')
    .update({ flushed_at: now.toISOString() })
    .in('id', processedIds);

  if (markError) throw new Error(`pending_notifications mark-flushed failed: ${markError.message}`);

  return {
    pending: rows.length,
    flushed: rows.length,
    recipients: recipientCount,
    suppressedShift,
  };
}
