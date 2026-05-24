/**
 * Superadmin DNI numbers admin API — update label or active flag.
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import { sendError, sendSuccess } from '@/lib/api-helpers';
import { getSessionUser } from '@/lib/auth/get-session-user';
import { canAccessDniAdmin } from '@/lib/auth/roles';
import { createServerSupabase } from '@/lib/supabase/server';

const patchSchema = z
  .object({
    display_label: z.string().min(1).optional(),
    is_active: z.boolean().optional(),
  })
  .refine((body) => body.display_label !== undefined || body.is_active !== undefined, {
    message: 'At least one field required',
  });

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getSessionUser(req, res);
  if (!session) return sendError(res, 'Unauthorized', 401);
  if (!canAccessDniAdmin(session.role)) return sendError(res, 'Forbidden', 403);

  if (req.method !== 'PATCH') return sendError(res, 'Method not allowed', 405);

  const id = req.query.id;
  if (typeof id !== 'string' || id.length === 0) {
    return sendError(res, 'Invalid id', 400);
  }

  const parsed = patchSchema.safeParse(req.body);
  if (!parsed.success) {
    return sendError(res, 'Invalid payload', 400, parsed.error.flatten().fieldErrors);
  }

  const supabase = createServerSupabase(req, res);
  const { data, error } = await supabase
    .from('dni_numbers')
    .update({
      ...parsed.data,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select('*')
    .single();

  if (error) return sendError(res, error.message, 400);
  return sendSuccess(res, data);
}
