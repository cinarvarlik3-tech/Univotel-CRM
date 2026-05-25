/**
 * Syncs Chatwoot messages for a lead when Conversation tab is opened.
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { sendError, sendSuccess } from '@/lib/api-helpers';
import { getSessionUser } from '@/lib/auth/get-session-user';
import { isChatwootApiConfigured } from '@/lib/env';
import { fetchLeadMessagesPage } from '@/lib/leads/fetch-lead-messages-page';
import { loadLeadForChatSync } from '@/lib/leads/load-lead-for-chat-sync';
import { syncLeadMessagesFromChatwoot } from '@/lib/leads/sync-chatwoot-messages';
import { createServerSupabase } from '@/lib/supabase/server';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getSessionUser(req, res);
  if (!session) return sendError(res, 'Unauthorized', 401);
  if (req.method !== 'POST') return sendError(res, 'Method not allowed', 405);

  if (!isChatwootApiConfigured()) {
    return sendError(res, 'Chatwoot API is not configured', 503);
  }

  const { id } = req.query;
  if (typeof id !== 'string') return sendError(res, 'Invalid lead ID', 400);

  const supabase = createServerSupabase(req, res);

  try {
    const loaded = await loadLeadForChatSync(supabase, id);
    if ('error' in loaded) {
      if (loaded.error === 'not_found') return sendError(res, 'Lead not found', 404);
      return sendError(res, 'No Chatwoot conversation linked to this lead', 404);
    }

    const { lead, conversationId } = loaded;

    const syncResult = await syncLeadMessagesFromChatwoot({
      leadUuid: lead.uuid,
      conversationId,
      leadName: lead.lead_name,
    });

    const page = await fetchLeadMessagesPage(supabase, id, { limit: 50 });

    return sendSuccess(res, {
      ...page,
      syncedCount: syncResult.syncedCount,
      syncedAt: new Date().toISOString(),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to sync messages';
    console.error('[leads/messages/sync]', message);
    return sendError(res, 'Failed to sync messages from Chatwoot', 502);
  }
}
