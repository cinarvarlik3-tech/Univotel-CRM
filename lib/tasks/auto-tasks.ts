/**
 * Auto-task engine for stage-transition triggered task management.
 * Stage transitions cancel all pending auto-tasks, then create a new one for the incoming stage.
 */
import { createServiceClient } from '@/lib/supabase/service';
import type { AUTO_TASK_TYPES } from '@/lib/constants';

type AutoTaskType = (typeof AUTO_TASK_TYPES)[number];

interface AutoTaskSpec {
  type: AutoTaskType;
  dueDays: number;
}

const STAGE_AUTO_TASK: Readonly<Partial<Record<string, AutoTaskSpec>>> = {
  yeni: { type: 'nurture_reminder', dueDays: 1 },
  'bilgi-verildi': { type: 'nurture_reminder', dueDays: 2 },
  aranacak: { type: 'nurture_reminder', dueDays: 1 },
  arandi: { type: 'nurture_reminder', dueDays: 3 },
  'arandi-acmadi': { type: 'nurture_reminder', dueDays: 1 },
  'bizi-aradi-konustuk': { type: 'nurture_reminder', dueDays: 2 },
  ziyaret: { type: 'visit_resolution', dueDays: 1 },
  'ziyaret-etmedi': { type: 'failed_visit_followup', dueDays: 1 },
  'ziyaret-etti': { type: 'post_visit_nurture_reminder', dueDays: 2 },
  'teklif-gonderildi': { type: 'post_visit_nurture_reminder', dueDays: 3 },
  'kapora-alindi': { type: 'move_in_reminder', dueDays: 7 },
};

const CONTACT_COMPLETABLE_TASK_TYPES: AutoTaskType[] = [
  'nurture_reminder',
  'post_visit_nurture_reminder',
];

/**
 * Marks pending nurture/post-visit reminder tasks as completed when contact is made.
 * Called from log-contact API and Chatwoot message sync.
 * Non-fatal — errors are logged, not rethrown.
 */
export async function completeContactTasks(leadUuid: string): Promise<void> {
  try {
    const client = createServiceClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (client.from('tasks') as any)
      .update({ is_completed: true, completed_at: new Date().toISOString() })
      .eq('lead_uuid', leadUuid)
      .eq('is_completed', false)
      .in('auto_task_type', CONTACT_COMPLETABLE_TASK_TYPES);
  } catch (err) {
    console.error('[auto-tasks] completeContactTasks failed:', err);
  }
}

/**
 * Cancels all pending auto-tasks for a lead.
 * Called before creating new auto-tasks on a stage transition.
 */
export async function cancelAutoTasksForLead(leadUuid: string): Promise<void> {
  const client = createServiceClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (client.from('tasks') as any)
    .update({ is_completed: true, completed_at: new Date().toISOString() })
    .eq('lead_uuid', leadUuid)
    .eq('is_auto_created', true)
    .eq('is_completed', false);
}

/**
 * Creates the auto-task for the given funnel stage, if one is defined.
 * No-op for terminal stages (sozlesme-imzalandi, lost) — call cancelAutoTasksForLead first.
 */
export async function createAutoTasksForStage(
  leadUuid: string,
  funnelStatus: string,
  assignedTo: string | null,
): Promise<void> {
  const spec = STAGE_AUTO_TASK[funnelStatus];
  if (!spec) return;

  const dueWhen = new Date();
  dueWhen.setDate(dueWhen.getDate() + spec.dueDays);

  const client = createServiceClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (client.from('tasks') as any).insert({
    lead_uuid: leadUuid,
    task_type: spec.type,
    auto_task_type: spec.type,
    is_auto_created: true,
    due_when: dueWhen.toISOString().split('T')[0],
    assigned_to: assignedTo ?? undefined,
    created_by: 'system',
  });
}
