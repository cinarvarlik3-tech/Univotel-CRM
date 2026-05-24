/**
 * Telegram Bot API webhook — /start, /chatid, /link command handling.
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { handleTelegramUpdate, type TelegramUpdate } from '@/lib/telegram/handle-update';
import { verifyTelegramWebhookSecret } from '@/lib/telegram/verify';

export default async function handler(req: NextApiRequest, res: NextApiResponse): Promise<void> {
  if (req.method !== 'POST') {
    res.status(405).end();
    return;
  }

  const secretHeader = req.headers['x-telegram-bot-api-secret-token'];
  const secretValue = Array.isArray(secretHeader) ? secretHeader[0] : secretHeader;

  if (!verifyTelegramWebhookSecret(secretValue)) {
    res.status(401).end();
    return;
  }

  const update = req.body as TelegramUpdate;

  try {
    await handleTelegramUpdate(update);
  } catch (err) {
    console.error('[telegram] webhook handler failed:', err);
  }

  res.status(200).end();
}

export const config = {
  api: { bodyParser: true },
};
