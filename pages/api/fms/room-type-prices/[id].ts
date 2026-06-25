/**
 * Update a room type price period (manager only).
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import { sendError, sendSuccess } from '@/lib/api-helpers';
import { getSessionUser } from '@/lib/auth/get-session-user';
import { isManagerOrAbove } from '@/lib/auth/roles';
import { createServerSupabase } from '@/lib/supabase/server';
import { MOVE_IN_MONTH_RE } from '@/lib/finance/move-in-month';

const UpdateSchema = z.object({
  price: z.number().min(0).optional(),
  valid_from_month: z.string().regex(MOVE_IN_MONTH_RE).optional(),
  valid_until_month: z.string().regex(MOVE_IN_MONTH_RE).nullable().optional(),
  label: z.string().max(64).nullable().optional(),
});

function toMonthDate(ym: string): string {
  return `${ym}-01`;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getSessionUser(req, res);
  if (!session) return sendError(res, 'Unauthorized', 401);
  if (!isManagerOrAbove(session.role)) return sendError(res, 'Forbidden', 403);
  if (req.method !== 'PATCH') return sendError(res, 'Method not allowed', 405);

  const { id } = req.query;
  if (typeof id !== 'string') return sendError(res, 'Invalid price ID', 400);

  const parsed = UpdateSchema.safeParse(req.body);
  if (!parsed.success) {
    return sendError(res, 'Invalid input', 400, parsed.error.flatten().fieldErrors);
  }

  const updates: Record<string, unknown> = {};
  if (parsed.data.price !== undefined) updates.price = parsed.data.price;
  if (parsed.data.valid_from_month !== undefined) {
    updates.valid_from_month = toMonthDate(parsed.data.valid_from_month);
  }
  if (parsed.data.valid_until_month !== undefined) {
    updates.valid_until_month = parsed.data.valid_until_month
      ? toMonthDate(parsed.data.valid_until_month)
      : null;
  }
  if (parsed.data.label !== undefined) updates.label = parsed.data.label;

  if (Object.keys(updates).length === 0) {
    return sendError(res, 'No fields to update', 400);
  }

  const supabase = createServerSupabase(req, res);
  const { data, error } = await supabase
    .from('room_type_prices')
    .update(updates)
    .eq('id', id)
    .select('*')
    .single();

  if (error) return sendError(res, error.message, 500);
  return sendSuccess(res, data);
}
