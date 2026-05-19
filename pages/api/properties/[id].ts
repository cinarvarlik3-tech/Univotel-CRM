/**
 * Single property GET API route.
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { sendError, sendSuccess } from '@/lib/api-helpers';
import { getSessionUser } from '@/lib/auth/get-session-user';
import { createServerSupabase } from '@/lib/supabase/server';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getSessionUser(req, res);
  if (!session) return sendError(res, 'Unauthorized', 401);

  if (req.method !== 'GET') return sendError(res, 'Method not allowed', 405);

  const { id } = req.query;
  if (typeof id !== 'string') return sendError(res, 'Invalid property ID', 400);

  const supabase = createServerSupabase(req, res);
  const { data, error } = await supabase.from('properties').select('*').eq('id', id).maybeSingle();

  if (error) return sendError(res, 'Failed to fetch property', 500);
  if (!data) return sendError(res, 'Property not found', 404);

  return sendSuccess(res, data);
}
