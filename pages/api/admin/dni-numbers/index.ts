/**
 * Superadmin DNI numbers admin API — list and create.
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import { sendError, sendSuccess } from '@/lib/api-helpers';
import { getSessionUser } from '@/lib/auth/get-session-user';
import { canAccessDniAdmin } from '@/lib/auth/roles';
import { createServerSupabase } from '@/lib/supabase/server';

const DNI_SOURCES = [
  'google-ads',
  'meta-ads',
  'organic',
  'ituyurt',
  'galatasarayyurt',
  'kampushan',
  'academic-house',
] as const;

const createSchema = z.object({
  virtual_number: z.string().min(8),
  source: z.enum(DNI_SOURCES),
  display_label: z.string().min(1),
  is_active: z.boolean().optional(),
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getSessionUser(req, res);
  if (!session) return sendError(res, 'Unauthorized', 401);
  if (!canAccessDniAdmin(session.role)) return sendError(res, 'Forbidden', 403);

  const supabase = createServerSupabase(req, res);

  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('dni_numbers')
      .select('*')
      .order('source', { ascending: true });

    if (error) return sendError(res, 'Failed to fetch DNI numbers', 500);
    return sendSuccess(res, data ?? []);
  }

  if (req.method === 'POST') {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) {
      return sendError(res, 'Invalid payload', 400, parsed.error.flatten().fieldErrors);
    }

    const { data, error } = await supabase
      .from('dni_numbers')
      .insert({
        virtual_number: parsed.data.virtual_number,
        source: parsed.data.source,
        display_label: parsed.data.display_label,
        is_active: parsed.data.is_active ?? true,
      })
      .select('*')
      .single();

    if (error) return sendError(res, error.message, 400);
    return sendSuccess(res, data, 201);
  }

  return sendError(res, 'Method not allowed', 405);
}
