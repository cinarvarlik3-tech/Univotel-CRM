/**
 * Superadmin-only kill switch for suppressible Telegram notifications.
 *
 * GET  — returns { enabled: boolean }
 * POST — { enabled: boolean } → upserts cron_settings key 'notifications_enabled'
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { sendError, sendSuccess } from '@/lib/api-helpers';
import { getSessionUser } from '@/lib/auth/get-session-user';
import { isSuperadmin } from '@/lib/auth/roles';
import { createServiceClient } from '@/lib/supabase/service';
import { z } from 'zod';

const PostBody = z.object({ enabled: z.boolean() });

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getSessionUser(req, res);
  if (!session) return sendError(res, 'Unauthorized', 401);
  if (!isSuperadmin(session.role)) return sendError(res, 'Forbidden', 403);

  const client = createServiceClient();

  if (req.method === 'GET') {
    const { data } = await client
      .from('cron_settings')
      .select('value')
      .eq('key', 'notifications_enabled')
      .maybeSingle();

    return sendSuccess(res, { enabled: data?.value !== 'false' });
  }

  if (req.method === 'POST') {
    const parsed = PostBody.safeParse(req.body);
    if (!parsed.success) return sendError(res, 'Invalid body', 400);

    const { error } = await client
      .from('cron_settings')
      .upsert({ key: 'notifications_enabled', value: parsed.data.enabled ? 'true' : 'false' });

    if (error) return sendError(res, 'Failed to update setting', 500);

    return sendSuccess(res, { enabled: parsed.data.enabled });
  }

  return sendError(res, 'Method not allowed', 405);
}
