/**
 * Room type seasonal price periods — list and create (manager only).
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import { sendError, sendSuccess } from '@/lib/api-helpers';
import { getSessionUser } from '@/lib/auth/get-session-user';
import { isManagerOrAbove } from '@/lib/auth/roles';
import { createServerSupabase } from '@/lib/supabase/server';
import { MOVE_IN_MONTH_RE } from '@/lib/finance/move-in-month';

const CreateSchema = z.object({
  room_type_id: z.string().uuid(),
  price: z.number().min(0),
  valid_from_month: z.string().regex(MOVE_IN_MONTH_RE),
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

  const supabase = createServerSupabase(req, res);
  const propertyId = typeof req.query.propertyId === 'string' ? req.query.propertyId : null;

  if (req.method === 'GET') {
    if (!propertyId) return sendError(res, 'propertyId required', 400);

    const { data: roomTypes, error: rtErr } = await supabase
      .from('room_types')
      .select('id, name')
      .eq('hotel_id', propertyId)
      .order('name');

    if (rtErr) return sendError(res, rtErr.message, 500);
    if (!roomTypes?.length) return sendSuccess(res, { roomTypes: [], prices: [] });

    const ids = roomTypes.map((r) => r.id);
    const { data: prices, error: pErr } = await supabase
      .from('room_type_prices')
      .select('*')
      .in('room_type_id', ids)
      .order('valid_from_month', { ascending: false });

    if (pErr) return sendError(res, pErr.message, 500);
    return sendSuccess(res, { roomTypes, prices: prices ?? [] });
  }

  if (req.method === 'POST') {
    const parsed = CreateSchema.safeParse(req.body);
    if (!parsed.success) {
      return sendError(res, 'Invalid input', 400, parsed.error.flatten().fieldErrors);
    }

    const row = parsed.data;
    const { data, error } = await supabase
      .from('room_type_prices')
      .insert({
        room_type_id: row.room_type_id,
        price: row.price,
        valid_from_month: toMonthDate(row.valid_from_month),
        valid_until_month: row.valid_until_month ? toMonthDate(row.valid_until_month) : null,
        label: row.label ?? null,
      })
      .select('*')
      .single();

    if (error) return sendError(res, error.message, 500);
    return sendSuccess(res, data, 201);
  }

  return sendError(res, 'Method not allowed', 405);
}
