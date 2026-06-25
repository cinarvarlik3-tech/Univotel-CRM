/**
 * Single task GET and PATCH API route.
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import { sendError, sendSuccess } from '@/lib/api-helpers';
import { getSessionUser } from '@/lib/auth/get-session-user';
import { isManagerOrAbove } from '@/lib/auth/roles';
import { createServerSupabase } from '@/lib/supabase/server';

const UpdateTaskSchema = z.object({
  is_completed: z.boolean().optional(),
  is_cancelled: z.boolean().optional(),
  cancel_reason: z.string().optional(),
  notes: z.string().optional(),
  assigned_to: z.string().uuid().optional(),
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

    // Only managers/superadmins can reassign tasks.
    if (parsed.data.assigned_to && !isManagerOrAbove(session.role)) {
      return sendError(res, 'Forbidden: only managers can reassign tasks', 403);
    }

    // Cancellation requires a reason.
    if (parsed.data.is_cancelled === true && !parsed.data.cancel_reason) {
      return sendError(res, 'cancel_reason is required when cancelling a task', 400);
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
