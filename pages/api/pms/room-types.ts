/**
 * PMS room types API — active types for a property (change-room dialog).
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { sendError, sendSuccess } from '@/lib/api-helpers';
import { getSessionUser } from '@/lib/auth/get-session-user';
import { createServerSupabase } from '@/lib/supabase/server';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getSessionUser(req, res);
  if (!session) return sendError(res, 'Unauthorized', 401);
  if (req.method !== 'GET') return sendError(res, 'Method not allowed', 405);

  const propertyId = req.query.propertyId;
  if (typeof propertyId !== 'string') {
    return sendError(res, 'propertyId is required', 400);
  }

  const supabase = createServerSupabase(req, res);
  const { data, error } = await supabase
    .from('room_types')
    .select('id, name, capacity')
    .eq('hotel_id', propertyId)
    .eq('is_active', true)
    .order('name');

  if (error) return sendError(res, 'Failed to fetch room types', 500);
  return sendSuccess(res, data ?? []);
}
