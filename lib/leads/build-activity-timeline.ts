/**
 * Assembles the per-lead activity timeline from four single-purpose sources.
 * Each source stays append-only; merging happens at query time.
 */
import { createServiceClient } from '@/lib/supabase/service';

export type ActivityEventKind =
  | 'stage_change'
  | 'contact'
  | 'visit'
  | 'task_created'
  | 'task_completed';

export interface ActivityEvent {
  id: string;
  kind: ActivityEventKind;
  happenedAt: string;
  summary: string;
  meta: Record<string, unknown>;
}

/**
 * Fetches and merges all activity events for a lead, sorted newest first.
 * @param leadUuid - The lead's UUID.
 */
export async function buildActivityTimeline(leadUuid: string): Promise<ActivityEvent[]> {
  const client = createServiceClient();

  const [stageRes, contactRes, visitRes, taskRes] = await Promise.all([
    client
      .from('lead_stage_history')
      .select('id, from_status, to_status, changed_by, changed_at, source')
      .eq('lead_uuid', leadUuid)
      .order('changed_at', { ascending: false }),

    client
      .from('contact_history')
      .select(
        'id, interaction_type, interaction_source, notes, created_at, funnel_status_at_time, status_changed, salesperson_id',
      )
      .eq('lead_uuid', leadUuid)
      .order('created_at', { ascending: false }),

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (client as any)
      .from('visits')
      .select('id, status, scheduled_date, notes, created_by, created_at')
      .eq('lead_uuid', leadUuid)
      .order('scheduled_date', { ascending: false }),

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (client as any)
      .from('tasks')
      .select(
        'id, task_type, auto_task_type, is_auto_created, is_completed, due_when, completed_at, created_at, notes',
      )
      .eq('lead_uuid', leadUuid)
      .order('created_at', { ascending: false }),
  ]);

  const events: ActivityEvent[] = [];

  for (const row of stageRes.data ?? []) {
    events.push({
      id: `stage-${row.id}`,
      kind: 'stage_change',
      happenedAt: row.changed_at,
      summary: row.from_status
        ? `${row.from_status} → ${row.to_status}`
        : `Aşama: ${row.to_status}`,
      meta: {
        fromStatus: row.from_status,
        toStatus: row.to_status,
        changedBy: row.changed_by,
        source: row.source,
      },
    });
  }

  for (const row of contactRes.data ?? []) {
    events.push({
      id: `contact-${row.id}`,
      kind: 'contact',
      happenedAt: row.created_at,
      summary: row.notes ?? row.interaction_type,
      meta: {
        interactionType: row.interaction_type,
        interactionSource: row.interaction_source,
        statusChanged: row.status_changed,
        funnelStatusAtTime: row.funnel_status_at_time,
        salespersonId: row.salesperson_id,
      },
    });
  }

  for (const row of (visitRes.data ?? []) as Record<string, unknown>[]) {
    events.push({
      id: `visit-${row.id}`,
      kind: 'visit',
      happenedAt: row.scheduled_date as string,
      summary: `Visit ${row.status}`,
      meta: {
        status: row.status,
        scheduledDate: row.scheduled_date,
        notes: row.notes,
        createdBy: row.created_by,
      },
    });
  }

  for (const row of (taskRes.data ?? []) as Record<string, unknown>[]) {
    const kind: ActivityEventKind = row.is_completed ? 'task_completed' : 'task_created';
    const happenedAt = (row.is_completed ? row.completed_at : row.created_at) as string;
    events.push({
      id: `task-${row.id}`,
      kind,
      happenedAt,
      summary: row.is_completed
        ? `Task completed: ${row.auto_task_type ?? row.task_type}`
        : `Task created: ${row.auto_task_type ?? row.task_type}`,
      meta: {
        taskType: row.task_type,
        autoTaskType: row.auto_task_type,
        isAutoCreated: row.is_auto_created,
        dueWhen: row.due_when,
        notes: row.notes,
      },
    });
  }

  events.sort((a, b) => new Date(b.happenedAt).getTime() - new Date(a.happenedAt).getTime());
  return events;
}
