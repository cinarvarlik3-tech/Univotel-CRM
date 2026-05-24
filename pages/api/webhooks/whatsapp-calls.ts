/**
 * WhatsApp Cloud API webhook — calls + message statuses (campaign delivery/read).
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { env } from '@/lib/env';
import { createWebhookHandler } from '@/lib/webhooks/create-webhook-handler';
import { whatsAppIdempotencyKey } from '@/lib/webhooks/idempotency-key';
import { processWhatsApp } from '@/lib/webhooks/process-whatsapp';
import { verifyWhatsAppSignature } from '@/lib/webhooks/verify';
import { WhatsAppWebhookPayloadSchema } from '@/types/webhooks';

const postHandler = createWebhookHandler({
  source: 'whatsapp_calls',
  verify: (rawBody, req) =>
    verifyWhatsAppSignature(rawBody, req.headers['x-hub-signature-256'] as string | undefined),
  getIdempotencyKey: (parsed) => {
    const result = WhatsAppWebhookPayloadSchema.safeParse(parsed);
    if (!result.success) return `whatsapp_invalid_${Date.now()}`;
    return whatsAppIdempotencyKey(result.data);
  },
  process: (parsed) => processWhatsApp(parsed),
});

/**
 * Handles Meta webhook verification GET challenge.
 * @param req - Next.js API request with hub.* query params.
 * @param res - Next.js API response.
 */
function handleMetaVerification(req: NextApiRequest, res: NextApiResponse): void {
  const mode = req.query['hub.mode'];
  const verifyToken = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  const challengeValue = Array.isArray(challenge) ? challenge[0] : challenge;

  if (
    mode === 'subscribe' &&
    typeof verifyToken === 'string' &&
    verifyToken === env.WHATSAPP_WEBHOOK_SECRET &&
    typeof challengeValue === 'string' &&
    challengeValue.length > 0
  ) {
    res.status(200).send(challengeValue);
    return;
  }

  res.status(403).end();
}

export default async function handler(req: NextApiRequest, res: NextApiResponse): Promise<void> {
  if (req.method === 'GET') {
    handleMetaVerification(req, res);
    return;
  }

  await postHandler(req, res);
}

export const config = {
  api: {
    bodyParser: false,
  },
};
