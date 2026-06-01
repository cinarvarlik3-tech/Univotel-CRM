/**
 * Campaigns list and create API.
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import { sendError, sendSuccess } from '@/lib/api-helpers';
import { getSessionUser } from '@/lib/auth/get-session-user';
import { isManagerOrAbove } from '@/lib/auth/roles';
import { validateCampaignSegment } from '@/lib/campaigns/resolve-segment';
import { createServerSupabase } from '@/lib/supabase/server';
import type { CampaignSegment } from '@/types/domain';
import type { Json } from '@/types/database';

const SegmentSchema = z.object({
  filters: z.array(
    z.object({
      field: z.string(),
      operator: z.string(),
      value: z.string(),
    }),
  ),
});

const CreateCampaignSchema = z.object({
  campaign_type: z.enum(['outbound_message', 'outbound_call']).default('outbound_message'),
  segment: SegmentSchema,
  language: z.string().optional().nullable(),
  template_id: z.string().min(1),
  template_language: z.string().min(1),
  template_variables: z.record(z.string()).default({}),
  send_delay_ms: z.number().int().min(0).max(60000).optional(),
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getSessionUser(req, res);
  if (!session) return sendError(res, 'Unauthorized', 401);

  if (req.method === 'GET') {
    return handleGet(req, res, session.role, session.userId);
  }

  if (req.method === 'POST') {
    if (!isManagerOrAbove(session.role)) return sendError(res, 'Forbidden', 403);
    return handlePost(req, res, session.userId);
  }

  return sendError(res, 'Method not allowed', 405);
}

async function handleGet(req: NextApiRequest, res: NextApiResponse, role: string, userId: string) {
  const supabase = createServerSupabase(req, res);
  const limit = Math.min(
    100,
    Math.max(1, Number.parseInt(String(req.query.limit ?? '50'), 10) || 50),
  );
  const cursor = typeof req.query.cursor === 'string' ? req.query.cursor : undefined;

  let query = supabase
    .from('campaigns')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit + 1);

  if (!isManagerOrAbove(role)) {
    query = query.eq('created_by', userId);
  }

  if (cursor) {
    query = query.lt('created_at', cursor);
  }

  const { data, error } = await query;

  if (error) return sendError(res, 'Failed to fetch campaigns', 500);

  const rows = data ?? [];
  const hasMore = rows.length > limit;
  const items = hasMore ? rows.slice(0, limit) : rows;
  const nextCursor = hasMore ? (items[items.length - 1]?.created_at ?? null) : null;

  return sendSuccess(res, { items, nextCursor });
}

async function handlePost(req: NextApiRequest, res: NextApiResponse, userId: string) {
  const parsed = CreateCampaignSchema.safeParse(req.body);

  if (!parsed.success) {
    return sendError(res, 'Invalid request body', 400, parsed.error.flatten().fieldErrors);
  }

  if (parsed.data.campaign_type === 'outbound_call') {
    return sendError(res, 'outbound_call campaigns are not yet supported.', 400);
  }

  const segmentError = validateCampaignSegment(parsed.data.segment as CampaignSegment);
  if (segmentError) return sendError(res, segmentError, 400);

  const supabase = createServerSupabase(req, res);

  const { data, error } = await supabase
    .from('campaigns')
    .insert({
      campaign_type: parsed.data.campaign_type,
      segment: parsed.data.segment as unknown as Json,
      language: parsed.data.language ?? null,
      template_id: parsed.data.template_id,
      template_language: parsed.data.template_language,
      template_variables: parsed.data.template_variables as Json,
      send_delay_ms: parsed.data.send_delay_ms ?? 200,
      status: 'draft',
      created_by: userId,
    })
    .select('*')
    .single();

  if (error) return sendError(res, 'Failed to create campaign', 500);

  return sendSuccess(res, data, 201);
}
