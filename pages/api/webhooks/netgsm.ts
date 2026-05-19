/**
 * NetGSM webhook endpoint (stub processor).
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { processNetGsm } from '@/lib/webhooks/process-netgsm';
import { runAfterResponse } from '@/lib/webhooks/wait-until';
import { verifyNetGsmToken } from '@/lib/webhooks/verify';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.status(405).end();
    return;
  }

  const body = req.body as { token?: string };
  const valid = verifyNetGsmToken(body?.token);
  if (!valid) {
    res.status(401).end();
    return;
  }

  res.status(200).end();
  runAfterResponse(processNetGsm(body));
}

export const config = {
  api: { bodyParser: true },
};
