/**
 * Single task GET and PATCH API route.
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import { sendError, sendSuccess } from '@/lib/api-helpers';
import { getSessionUser } from '@/lib/auth/get-session-user';
import { createServerSupabase } from '@/lib/supabase/server';

const UpdateTaskSchema = z.object({
  is_completed: z.boolean().optional(),
  notes: z.string().optional(),
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getSessionUser(req, res);
  if (!session) return sendError(res, 'Unauthorized', 401);

  const { id } = req.query;
  if (typeof id !== 'string') return sendError(res, 'Invalid task ID', 400);

  const supabase = createServerSupabase(req, res);

  if (req.method === 'GET') {
    const { data, error } = await supabase.from('tasks').select('*').eq('id', id).maybeSingle();

    if (error) return sendError(res, 'Failed to fetch task', 500);
    if (!data) return sendError(res, 'Task not found', 404);

    return sendSuccess(res, data);
  }

  if (req.method === 'PATCH') {
    const parsed = UpdateTaskSchema.safeParse(req.body);
    if (!parsed.success) {
      return sendError(res, 'Invalid input', 400, parsed.error.flatten().fieldErrors);
    }

    const updates: Record<string, unknown> = { ...parsed.data };

    if (parsed.data.is_completed === true) {
      updates.completed_at = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from('tasks')
      .update(updates)
      .eq('id', id)
      .select('*')
      .maybeSingle();

    if (error) return sendError(res, 'Failed to update task', 500);
    if (!data) return sendError(res, 'Task not found', 404);

    return sendSuccess(res, data);
  }

  return sendError(res, 'Method not allowed', 405);
}
