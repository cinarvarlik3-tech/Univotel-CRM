/**
 * Preview campaign audience size from segment filters (no campaign id required).
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import { sendError, sendSuccess } from '@/lib/api-helpers';
import { getSessionUser } from '@/lib/auth/get-session-user';
import { isManagerOrAbove } from '@/lib/auth/roles';
import { countSegmentLeads, validateCampaignSegment } from '@/lib/campaigns/resolve-segment';
import type { CampaignSegment } from '@/types/domain';

const PreviewSchema = z.object({
  segment: z.object({
    filters: z.array(
      z.object({
        field: z.string(),
        operator: z.string(),
        value: z.string(),
      }),
    ),
  }),
  language: z.string().optional().nullable(),
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getSessionUser(req, res);
  if (!session) return sendError(res, 'Unauthorized', 401);
  if (!isManagerOrAbove(session.role)) return sendError(res, 'Forbidden', 403);

  if (req.method !== 'POST') {
    return sendError(res, 'Method not allowed', 405);
  }

  const parsed = PreviewSchema.safeParse(req.body);
  if (!parsed.success) {
    return sendError(res, 'Invalid request body', 400, parsed.error.flatten().fieldErrors);
  }

  const segment = parsed.data.segment as CampaignSegment;
  const segmentError = validateCampaignSegment(segment);
  if (segmentError) return sendError(res, segmentError, 400);

  try {
    const count = await countSegmentLeads(segment, parsed.data.language ?? null);
    return sendSuccess(res, { count });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Preview failed';
    return sendError(res, message, 500);
  }
}
