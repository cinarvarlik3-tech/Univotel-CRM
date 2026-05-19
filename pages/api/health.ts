/**
 * Health check API route — verifies Supabase connectivity.
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { sendError, sendSuccess } from '@/lib/api-helpers';
import { checkDatabaseHealth } from '@/lib/jobs/check-health';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return sendError(res, 'Method not allowed', 405);
  }

  try {
    const ok = await checkDatabaseHealth();

    if (!ok) {
      return sendError(res, 'Database unreachable', 503);
    }

    return sendSuccess(res, { status: 'ok', timestamp: new Date().toISOString() });
  } catch {
    return sendError(res, 'Health check failed', 503);
  }
}

export const config = {
  api: { bodyParser: true },
};
