/**
 * Manager-only Telegram connectivity test — sends a ping to all manager chat IDs.
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { sendError, sendSuccess } from '@/lib/api-helpers';
import { getSessionUser } from '@/lib/auth/get-session-user';
import { verifyTelegramBotToken } from '@/lib/telegram/api';
import { deliverTelegramToChatIds } from '@/lib/telegram/deliver';
import { getManagerChatIds } from '@/lib/env';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getSessionUser(req, res);
  if (!session) return sendError(res, 'Unauthorized', 401);
  if (session.role !== 'manager') return sendError(res, 'Forbidden', 403);
  if (req.method !== 'POST') return sendError(res, 'Method not allowed', 405);

  const botCheck = await verifyTelegramBotToken();
  if (!botCheck.ok) {
    return sendError(res, `Telegram bot token invalid: ${botCheck.error}`, 502);
  }

  const chatIds = getManagerChatIds();
  if (chatIds.length === 0) {
    return sendError(res, 'TELEGRAM_MANAGER_CHAT_IDS is empty', 400);
  }

  const message = `[CRM] Telegram test\nBot: @${botCheck.username}\nSent by: ${session.salesperson.full_name}`;
  const results = await deliverTelegramToChatIds(chatIds, message);
  const delivered = results.filter((r) => r.ok).length;
  const failed = results.filter((r) => !r.ok);

  if (delivered === 0) {
    return sendError(res, failed[0]?.description ?? 'All Telegram deliveries failed', 502);
  }

  return sendSuccess(res, {
    delivered,
    failed: failed.map((f) => ({ chatId: f.chatId, error: f.description })),
    botUsername: botCheck.username,
  });
}
