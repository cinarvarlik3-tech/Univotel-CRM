/**
 * PMS sync reconciliation cron — full-scan univotel hotels/room_types into CRM.
 * Protected by CRON_SECRET Bearer token.
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { sendError, sendSuccess, verifyCronAuth } from '@/lib/api-helpers';
import { env, isUnivotelSyncConfigured } from '@/lib/env';
import { reconcileFromUnivotel } from '@/lib/pms/sync-univotel';
import { createServiceClient } from '@/lib/supabase/service';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return sendError(res, 'Method not allowed', 405);

  if (!verifyCronAuth(req.headers.authorization, env.CRON_SECRET)) {
    return sendError(res, 'Unauthorized', 401);
  }

  if (!isUnivotelSyncConfigured()) {
    return sendError(res, 'Univotel sync credentials not configured', 503);
  }

  try {
    const crm = createServiceClient();
    const univotel = createClient(
      env.UNIVOTEL_SUPABASE_URL!,
      env.UNIVOTEL_SUPABASE_SERVICE_ROLE_KEY!,
    );
    const result = await reconcileFromUnivotel(crm, univotel);
    return sendSuccess(res, result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Reconciliation failed';
    return sendError(res, message, 500);
  }
}
