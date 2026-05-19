/**
 * WhatsApp Cloud API call webhook endpoint.
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { processWhatsAppCalls } from '@/lib/webhooks/process-whatsapp-calls';
import { runAfterResponse } from '@/lib/webhooks/wait-until';
import { getRawBodyString, verifyWhatsAppSignature } from '@/lib/webhooks/verify';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.status(405).end();
    return;
  }

  const rawBody = getRawBodyString(req.body);
  const signature = req.headers['x-hub-signature-256'] as string | undefined;

  const valid = await verifyWhatsAppSignature(rawBody, signature);
  if (!valid) {
    res.status(401).end();
    return;
  }

  res.status(200).end();

  const body = typeof req.body === 'object' ? req.body : JSON.parse(rawBody);
  runAfterResponse(processWhatsAppCalls(body));
}

export const config = {
  api: { bodyParser: true },
};
