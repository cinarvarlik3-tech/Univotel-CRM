/**
 * Manual lead archive API route — manager-only.
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import { sendError, sendSuccess } from '@/lib/api-helpers';
import { getSessionUser } from '@/lib/auth/get-session-user';
import { ARCHIVE_REASONS, MANUAL_LOSS_REASONS } from '@/lib/constants';
import { archiveLeadManual } from '@/lib/leads/archive';
import { createServerSupabase } from '@/lib/supabase/server';

const ArchiveLeadSchema = z
  .object({
    archive_reason: z.enum(ARCHIVE_REASONS),
    loss_reason: z.enum(MANUAL_LOSS_REASONS).optional(),
  })
  .refine((data) => data.archive_reason !== 'lost' || data.loss_reason !== undefined, {
    message: 'loss_reason required when archive_reason is lost',
    path: ['loss_reason'],
  });

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getSessionUser(req, res);
  if (!session) return sendError(res, 'Unauthorized', 401);
  if (session.role !== 'manager') return sendError(res, 'Forbidden', 403);
  if (req.method !== 'POST') return sendError(res, 'Method not allowed', 405);

  const { id } = req.query;
  if (typeof id !== 'string') return sendError(res, 'Invalid lead ID', 400);

  const parsed = ArchiveLeadSchema.safeParse(req.body);
  if (!parsed.success) {
    return sendError(res, 'Invalid input', 400, parsed.error.flatten().fieldErrors);
  }

  const supabase = createServerSupabase(req, res);
  const { data: existing } = await supabase
    .from('leads')
    .select('uuid, is_archived, is_deleted')
    .eq('uuid', id)
    .maybeSingle();

  if (!existing) return sendError(res, 'Lead not found', 404);
  if (existing.is_deleted) return sendError(res, 'Lead is deleted', 409);
  if (existing.is_archived) return sendError(res, 'Lead is already archived', 409);

  try {
    const result = await archiveLeadManual(
      id,
      session.userId,
      parsed.data.archive_reason,
      parsed.data.loss_reason,
    );
    return sendSuccess(res, result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Archive failed';
    return sendError(res, message, 500);
  }
}
