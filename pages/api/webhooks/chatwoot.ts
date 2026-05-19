/**
 * Chatwoot webhook endpoint — verify signature, return 200, process async.
 * Routes conversation_updated to label sync inside processChatwoot.
 * Enable conversation_updated in Chatwoot: Settings → Integrations → Webhooks.
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { processChatwoot } from '@/lib/webhooks/process-chatwoot';
import { runAfterResponse } from '@/lib/webhooks/wait-until';
import { getRawBodyString, verifyChatwootSignature } from '@/lib/webhooks/verify';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.status(405).end();
    return;
  }

  const rawBody = getRawBodyString(req.body);
  const signature = req.headers['x-chatwoot-signature'] as string | undefined;
  const timestamp = req.headers['x-chatwoot-timestamp'] as string | undefined;

  const valid = await verifyChatwootSignature(rawBody, signature, timestamp);
  if (!valid) {
    res.status(401).end();
    return;
  }

  res.status(200).end();

  const body = typeof req.body === 'object' ? req.body : JSON.parse(rawBody);
  runAfterResponse(processChatwoot(body));
}

export const config = {
  api: { bodyParser: true },
};
