/**
 * Funnel View data endpoint — pipeline, stats, and merged activity timeline for a lead.
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { sendError, sendSuccess } from '@/lib/api-helpers';
import { getSessionUser } from '@/lib/auth/get-session-user';
import { isManagerOrAbove } from '@/lib/auth/roles';
import {
  FUNNEL_STATUSES,
  STALE_THRESHOLD_DAYS_DEFAULT,
  STALE_THRESHOLDS_BY_STAGE,
} from '@/lib/constants';
import { parseRecHotel } from '@/lib/leads/parse-rec-hotel';
import { isRecEligibleGender } from '@/lib/ui/format-student-gender';
import { createServerSupabase } from '@/lib/supabase/server';

export type TimelineEntryType =
  | 'message'
  | 'call'
  | 'message_start'
  | 'task_created'
  | 'task_completed'
  | 'status_change'
  | 'history';

export interface TimelineEntry {
  id: string;
  type: TimelineEntryType;
  created_at: string;
  data: Record<string, unknown>;
}

export interface FunnelViewResponse {
  pipeline: {
    current_stage: string;
    time_in_stage_days: number | null;
    is_stale: boolean;
    stale_days: number | null;
    distribution: Record<string, number>;
  };
  missing_fields: {
    count: number;
    required_complete: boolean;
    names: string[];
  };
  rec_hotel: ReturnType<typeof parseRecHotel>;
  rec_fields_complete: boolean;
  missing_rec_field_names: string[];
  timeline: TimelineEntry[];
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return sendError(res, 'Method not allowed', 405);

  const session = await getSessionUser(req, res);
  if (!session) return sendError(res, 'Unauthorized', 401);

  const { id } = req.query;
  if (typeof id !== 'string') return sendError(res, 'Invalid lead ID', 400);

  const supabase = createServerSupabase(req, res);

  const { data: lead, error: leadError } = await supabase
    .from('leads')
    .select(
      'uuid, lead_name, lead_phone, funnel_status, last_contact_at, assigned_to, lead_details(university, student_gender, campus, budget_max, room_category, rec_hotel)',
    )
    .eq('uuid', id)
    .eq('is_deleted', false)
    .eq('is_archived', false)
    .maybeSingle();

  if (leadError) return sendError(res, 'Failed to fetch lead', 500);
  if (!lead) return sendError(res, 'Lead not found', 404);

  if (!isManagerOrAbove(session.role) && lead.assigned_to !== session.userId) {
    return sendError(res, 'Forbidden', 403);
  }

  const [distributionResult, historyResult, messagesResult, tasksResult, stageEntryResult] =
    await Promise.all([
      supabase
        .from('leads')
        .select('funnel_status')
        .eq('assigned_to', lead.assigned_to)
        .eq('is_deleted', false)
        .eq('is_archived', false),

      supabase
        .from('contact_history')
        .select(
          'id, interaction_type, interaction_source, notes, created_at, funnel_status_at_time, previous_status, status_changed, salesperson_id, metadata',
        )
        .eq('lead_uuid', id)
        .order('created_at', { ascending: false }),

      supabase
        .from('lead_messages')
        .select('id, message_type, content, sender_type, sender_name, created_at')
        .eq('lead_uuid', id)
        .eq('is_private', false)
        .order('created_at', { ascending: false }),

      supabase
        .from('tasks')
        .select(
          'id, task_type, due_when, is_completed, notes, assigned_to, created_at, completed_at',
        )
        .eq('lead_uuid', id)
        .order('created_at', { ascending: false }),

      supabase
        .from('contact_history')
        .select('created_at')
        .eq('lead_uuid', id)
        .eq('interaction_type', 'status_change')
        .eq('funnel_status_at_time', lead.funnel_status)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

  // Distribution counts
  const distribution: Record<string, number> = Object.fromEntries(
    FUNNEL_STATUSES.map((s) => [s, 0]),
  );
  for (const row of distributionResult.data ?? []) {
    if (row.funnel_status in distribution) {
      distribution[row.funnel_status]++;
    }
  }

  // Time in current stage
  const stageEntryAt = stageEntryResult.data?.created_at ?? null;
  const time_in_stage_days = stageEntryAt
    ? Math.floor((Date.now() - new Date(stageEntryAt).getTime()) / 86_400_000)
    : null;

  // Stale check — based on last_contact_at
  const thresholdDays =
    STALE_THRESHOLDS_BY_STAGE[lead.funnel_status] ?? STALE_THRESHOLD_DAYS_DEFAULT;
  const lastContact = lead.last_contact_at;
  const stale_days = lastContact
    ? Math.floor((Date.now() - new Date(lastContact).getTime()) / 86_400_000)
    : null;
  const is_stale = stale_days !== null ? stale_days >= thresholdDays : false;

  // Missing fields — leads.lead_name, leads.lead_phone + details fields
  const details = Array.isArray(lead.lead_details) ? lead.lead_details[0] : lead.lead_details;
  const CRITICAL_FIELDS: { label: string; value: unknown }[] = [
    { label: 'İsim', value: lead.lead_name },
    { label: 'Telefon', value: lead.lead_phone },
    { label: 'Üniversite', value: details?.university },
    { label: 'Cinsiyet', value: details?.student_gender },
    { label: 'Kampüs', value: details?.campus },
  ];
  const missingCritical = CRITICAL_FIELDS.filter((f) => !f.value || f.value === '');
  const missingCount = missingCritical.length;
  const missing_field_names = missingCritical.map((f) => f.label);

  // Rec hotel
  const recHotel = parseRecHotel(details?.rec_hotel ?? null);

  // Rec fields completeness (used for 'Öneri Al' button eligibility)
  const recFieldsComplete =
    isRecEligibleGender(details?.student_gender) &&
    !!details?.campus &&
    details?.budget_max != null &&
    !!details?.room_category;

  const REC_FIELDS: { label: string; missing: boolean }[] = [
    { label: 'Cinsiyet', missing: !isRecEligibleGender(details?.student_gender) },
    { label: 'Kampüs', missing: !details?.campus },
    { label: 'Bütçe (max)', missing: details?.budget_max == null },
    { label: 'Oda tipi', missing: !details?.room_category },
  ];
  const missing_rec_field_names = REC_FIELDS.filter((f) => f.missing).map((f) => f.label);

  // Build timeline
  const timeline: TimelineEntry[] = [];

  for (const msg of messagesResult.data ?? []) {
    timeline.push({
      id: msg.id,
      type: 'message',
      created_at: msg.created_at,
      data: {
        message_type: msg.message_type,
        content: msg.content,
        sender_type: msg.sender_type,
        sender_name: msg.sender_name,
      },
    });
  }

  for (const entry of historyResult.data ?? []) {
    let type: TimelineEntryType;
    if (entry.interaction_source === 'netgsm') {
      type = 'call';
    } else if (entry.interaction_type === 'message_start') {
      type = 'message_start';
    } else if (entry.interaction_type === 'status_change' && entry.status_changed) {
      type = 'status_change';
    } else {
      type = 'history';
    }

    timeline.push({
      id: entry.id,
      type,
      created_at: entry.created_at,
      data: {
        interaction_type: entry.interaction_type,
        interaction_source: entry.interaction_source,
        notes: entry.notes,
        funnel_status_at_time: entry.funnel_status_at_time,
        previous_status: entry.previous_status,
        salesperson_id: entry.salesperson_id,
        metadata: entry.metadata,
      },
    });
  }

  for (const task of tasksResult.data ?? []) {
    timeline.push({
      id: `task-created-${task.id}`,
      type: 'task_created',
      created_at: task.created_at,
      data: {
        id: task.id,
        task_type: task.task_type,
        due_when: task.due_when,
        assigned_to: task.assigned_to,
        notes: task.notes,
      },
    });

    if (task.is_completed && task.completed_at) {
      timeline.push({
        id: `task-completed-${task.id}`,
        type: 'task_completed',
        created_at: task.completed_at as string,
        data: {
          id: task.id,
          task_type: task.task_type,
          completed_at: task.completed_at,
        },
      });
    }
  }

  // Sort merged timeline newest first
  timeline.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const response: FunnelViewResponse = {
    pipeline: {
      current_stage: lead.funnel_status,
      time_in_stage_days,
      is_stale,
      stale_days,
      distribution,
    },
    missing_fields: {
      count: missingCount,
      required_complete: missingCount === 0,
      names: missing_field_names,
    },
    rec_hotel: recHotel,
    rec_fields_complete: recFieldsComplete,
    missing_rec_field_names,
    timeline,
  };

  return sendSuccess(res, response);
}
