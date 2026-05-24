/**
 * GA4 enrichment retry cron endpoint — protected by CRON_SECRET Bearer token.
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { sendError, sendSuccess, verifyCronAuth } from '@/lib/api-helpers';
import { env } from '@/lib/env';
import { runGa4Enrichment } from '@/lib/jobs/run-ga4-enrichment';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return sendError(res, 'Method not allowed', 405);

  if (!verifyCronAuth(req.headers.authorization, env.CRON_SECRET)) {
    return sendError(res, 'Unauthorized', 401);
  }

  try {
    const processed = await runGa4Enrichment();
    return sendSuccess(res, { processed });
  } catch {
    return sendError(res, 'Failed to run GA4 enrichment', 500);
  }
}
