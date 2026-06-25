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
    // D27: server-side filters — status, kind, type, lead, assignee, due window
    const { status, kind, task_type, lead_uuid, assignee, assignees, due_from, due_to } = req.query;

    let query = supabase
      .from('tasks')
      .select('*, leads!inner(lead_name, display_name, lead_phone, funnel_status)')
      .order('due_when', { ascending: true });

    if (!isManagerOrAbove(session.role)) {
      // Non-managers always see only their own tasks.
      query = query.eq('assigned_to', session.userId);
    } else if (typeof assignees === 'string' && assignees) {
      // Comma-separated list of assignee IDs (multi-agent view for managers).
      const ids = assignees.split(',').filter(Boolean);
      if (ids.length === 1) {
        query = query.eq('assigned_to', ids[0]);
      } else if (ids.length > 1) {
        query = query.in('assigned_to', ids);
      }
    } else if (typeof assignee === 'string' && assignee) {
      query = query.eq('assigned_to', assignee);
    }

    // Status filter
    if (status === 'open') {
      query = query.eq('is_completed', false).eq('is_cancelled', false);
    } else if (status === 'overdue') {
      query = query
        .eq('is_completed', false)
        .eq('is_cancelled', false)
        .lt('due_when', new Date().toISOString());
    } else if (status === 'completed') {
      query = query.eq('is_completed', true);
    } else if (status === 'cancelled') {
      query = query.eq('is_cancelled', true);
    } else {
      // Default: exclude cancelled
      query = query.eq('is_cancelled', false);
    }

    // Kind filter: auto vs manual
    if (kind === 'auto') {
      query = query.eq('is_auto_created', true);
    } else if (kind === 'manual') {
      query = query.eq('is_auto_created', false);
    }

    // Task type filter
    if (typeof task_type === 'string' && task_type) {
      query = query.eq('auto_task_type', task_type);
    }

    // Lead filter
    if (typeof lead_uuid === 'string' && lead_uuid) {
      query = query.eq('lead_uuid', lead_uuid);
    }

    // Due window
    if (typeof due_from === 'string' && due_from) {
      query = query.gte('due_when', due_from);
    }
    if (typeof due_to === 'string' && due_to) {
      query = query.lte('due_when', due_to);
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
        is_auto_created: false,
      })
      .select('*')
      .single();

    if (error) return sendError(res, 'Failed to create task', 500);
    return sendSuccess(res, data, 201);
  }

  return sendError(res, 'Method not allowed', 405);
}
