/**
 * Tasks list and create API route.
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import { sendError, sendSuccess } from '@/lib/api-helpers';
import { getSessionUser } from '@/lib/auth/get-session-user';
import { isManagerOrAbove } from '@/lib/auth/roles';
import { createServerSupabase } from '@/lib/supabase/server';

const CreateTaskSchema = z.object({
  lead_uuid: z.string().uuid(),
  task_type: z.string(),
  due_when: z.string(),
  notes: z.string().optional(),
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getSessionUser(req, res);
  if (!session) return sendError(res, 'Unauthorized', 401);

  const supabase = createServerSupabase(req, res);

  if (req.method === 'GET') {
    let query = supabase.from('tasks').select('*').order('due_when', { ascending: true });

    if (!isManagerOrAbove(session.role)) {
      query = query.eq('assigned_to', session.userId);
    }

    const { data, error } = await query;
    if (error) return sendError(res, 'Failed to fetch tasks', 500);
    return sendSuccess(res, data ?? []);
  }

  if (req.method === 'POST') {
    const parsed = CreateTaskSchema.safeParse(req.body);
    if (!parsed.success) {
      return sendError(res, 'Invalid input', 400, parsed.error.flatten().fieldErrors);
    }

    const assignedTo =
      isManagerOrAbove(session.role) && req.body.assigned_to
        ? req.body.assigned_to
        : session.userId;

    const { data, error } = await supabase
      .from('tasks')
      .insert({
        ...parsed.data,
        assigned_to: assignedTo,
        created_by: isManagerOrAbove(session.role) ? 'manager' : 'salesperson',
      })
      .select('*')
      .single();

    if (error) return sendError(res, 'Failed to create task', 500);
    return sendSuccess(res, data, 201);
  }

  return sendError(res, 'Method not allowed', 405);
}
