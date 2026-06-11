/**
 * My Day aggregation queries — all self-scoped to the requesting salesperson.
 * Called by GET /api/my-day.
 */
import { createServiceClient } from '@/lib/supabase/service';
import { FUNNEL_COMPARTMENTS } from '@/lib/constants';
import { istanbulTodayBounds, istanbulWeekStart, istanbulWeekEnd } from '@/lib/time/istanbul';

// Funnel stages that require regular nurture contact.
const NURTURE_STAGES = new Set([
  'yeni',
  'bilgi-verildi',
  'aranacak',
  'arandi',
  'arandi-acmadi',
  'bizi-aradi-konustuk',
  'ziyaret-etti',
  'teklif-gonderildi',
]);

export interface TaskCard {
  id: string;
  taskType: string;
  autoTaskType: string | null;
  isAutoCreated: boolean;
  dueWhen: string;
  notes: string | null;
  leadUuid: string;
  leadName: string | null;
  leadFunnelStatus: string | null;
}

export interface AttentionItem {
  kind: 'not_contacted' | 'unresolved_visit' | 'expecting_call';
  leadUuid: string;
  leadName: string | null;
  leadFunnelStatus: string | null;
  visitId?: string;
  scheduledDate?: string;
}

export interface MyDayCounters {
  activeLeads: number;
  notContactedToday: number;
  visitsToday: number;
  visitsThisWeek: number;
  tasksDueToday: number;
  tasksOverdue: number;
  newClaimsThisWeek: number;
}

export interface MyDayPayload {
  counters: MyDayCounters;
  tasks: { overdue: TaskCard[]; today: TaskCard[]; upcoming: TaskCard[] };
  attentionQueue: AttentionItem[];
  miniFunnel: { compartment: string; count: number }[];
}

export async function getMyDayPayload(userId: string): Promise<MyDayPayload> {
  const client = createServiceClient();
  const now = new Date();
  const { start: todayStart, end: todayEnd } = istanbulTodayBounds(now);
  const weekStart = istanbulWeekStart(now);
  const weekEnd = istanbulWeekEnd(now);

  const todayStartIso = todayStart.toISOString();
  const todayEndIso = todayEnd.toISOString();
  const weekStartIso = weekStart.toISOString();
  const weekEndIso = weekEnd.toISOString();

  // ── 1. Fetch user's active leads ──────────────────────────────────────────
  const { data: activeLeads } = await client
    .from('leads')
    .select('uuid, lead_name, funnel_status')
    .eq('assigned_to', userId)
    .eq('is_archived', false)
    .eq('is_deleted', false)
    .not('funnel_status', 'in', '("lost","sozlesme-imzalandi")');

  const myLeads = activeLeads ?? [];
  const myLeadUuids = myLeads.map((l) => l.uuid);

  // ── 2. Tasks ──────────────────────────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: rawTasks } = await (client as any)
    .from('tasks')
    .select(
      'id, task_type, auto_task_type, is_auto_created, due_when, notes, is_completed, lead_uuid',
    )
    .eq('assigned_to', userId)
    .eq('is_completed', false);

  const pendingTasks: Array<{
    id: string;
    task_type: string;
    auto_task_type: string | null;
    is_auto_created: boolean;
    due_when: string;
    notes: string | null;
    lead_uuid: string;
  }> = rawTasks ?? [];

  // Build lead lookup for task cards.
  const leadMap = new Map(myLeads.map((l) => [l.uuid, l]));

  function toTaskCard(t: (typeof pendingTasks)[number]): TaskCard {
    const lead = leadMap.get(t.lead_uuid);
    return {
      id: t.id,
      taskType: t.task_type,
      autoTaskType: t.auto_task_type,
      isAutoCreated: t.is_auto_created,
      dueWhen: t.due_when,
      notes: t.notes,
      leadUuid: t.lead_uuid,
      leadName: lead?.lead_name ?? null,
      leadFunnelStatus: lead?.funnel_status ?? null,
    };
  }

  const overdueTasks: TaskCard[] = [];
  const todayTasks: TaskCard[] = [];
  const upcomingTasks: TaskCard[] = [];

  for (const t of pendingTasks) {
    const due = t.due_when;
    if (due < todayStartIso) {
      overdueTasks.push(toTaskCard(t));
    } else if (due <= todayEndIso) {
      todayTasks.push(toTaskCard(t));
    } else if (due <= weekEndIso) {
      upcomingTasks.push(toTaskCard(t));
    }
  }

  // ── 3. Contacts today ─────────────────────────────────────────────────────
  // Find which leads were contacted today (any contact_history entry for that lead today).
  let contactedLeadUuids = new Set<string>();
  if (myLeadUuids.length > 0) {
    const { data: todayContacts } = await client
      .from('contact_history')
      .select('lead_uuid')
      .in('lead_uuid', myLeadUuids)
      .gte('created_at', todayStartIso)
      .lte('created_at', todayEndIso);

    contactedLeadUuids = new Set((todayContacts ?? []).map((c) => c.lead_uuid));
  }

  // ── 4. Visits ─────────────────────────────────────────────────────────────
  let visitsToday = 0;
  let visitsThisWeek = 0;
  const unresolvedVisitsToday: Array<{ id: string; lead_uuid: string; scheduled_date: string }> =
    [];

  if (myLeadUuids.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: weekVisits } = await (client as any)
      .from('visits')
      .select('id, lead_uuid, scheduled_date, status')
      .in('lead_uuid', myLeadUuids)
      .gte('scheduled_date', weekStartIso)
      .lte('scheduled_date', weekEndIso);

    for (const v of (weekVisits ?? []) as Array<{
      id: string;
      lead_uuid: string;
      scheduled_date: string;
      status: string;
    }>) {
      if (v.scheduled_date >= todayStartIso && v.scheduled_date <= todayEndIso) {
        visitsToday++;
        if (v.status === 'scheduled') {
          unresolvedVisitsToday.push({
            id: v.id,
            lead_uuid: v.lead_uuid,
            scheduled_date: v.scheduled_date,
          });
        }
      }
      visitsThisWeek++;
    }
  }

  // ── 5. Claims this week ───────────────────────────────────────────────────
  const { count: newClaimsThisWeek } = await client
    .from('leads')
    .select('uuid', { count: 'exact', head: true })
    .eq('assigned_to', userId)
    .gte('claimed_at', weekStartIso)
    .lte('claimed_at', weekEndIso);

  // ── 6. Attention queue ────────────────────────────────────────────────────
  // Leads with pending auto-tasks are shown in the task panel, not the attention queue.
  const taskedLeadUuids = new Set(
    pendingTasks.filter((t) => t.is_auto_created).map((t) => t.lead_uuid),
  );

  const attentionQueue: AttentionItem[] = [];

  // Not-contacted nurture leads without a pending auto-task.
  for (const lead of myLeads) {
    if (!NURTURE_STAGES.has(lead.funnel_status)) continue;
    if (contactedLeadUuids.has(lead.uuid)) continue;
    if (taskedLeadUuids.has(lead.uuid)) continue;

    const kind = lead.funnel_status === 'aranacak' ? 'expecting_call' : 'not_contacted';
    attentionQueue.push({
      kind,
      leadUuid: lead.uuid,
      leadName: lead.lead_name,
      leadFunnelStatus: lead.funnel_status,
    });
  }

  // Unresolved visits today without a pending visit_resolution task.
  const taskedVisitLeadUuids = new Set(
    pendingTasks.filter((t) => t.auto_task_type === 'visit_resolution').map((t) => t.lead_uuid),
  );
  for (const v of unresolvedVisitsToday) {
    if (taskedVisitLeadUuids.has(v.lead_uuid)) continue;
    const lead = leadMap.get(v.lead_uuid);
    attentionQueue.push({
      kind: 'unresolved_visit',
      leadUuid: v.lead_uuid,
      leadName: lead?.lead_name ?? null,
      leadFunnelStatus: lead?.funnel_status ?? null,
      visitId: v.id,
      scheduledDate: v.scheduled_date,
    });
  }

  // ── 7. Mini funnel ────────────────────────────────────────────────────────
  const statusCounts = new Map<string, number>();
  for (const lead of myLeads) {
    statusCounts.set(lead.funnel_status, (statusCounts.get(lead.funnel_status) ?? 0) + 1);
  }

  const miniFunnel = Object.entries(FUNNEL_COMPARTMENTS).map(([compartment, statuses]) => ({
    compartment,
    count: statuses.reduce((sum, s) => sum + (statusCounts.get(s) ?? 0), 0),
  }));

  // ── 8. Assemble counters ──────────────────────────────────────────────────
  const notContactedToday = myLeads.filter(
    (l) => NURTURE_STAGES.has(l.funnel_status) && !contactedLeadUuids.has(l.uuid),
  ).length;

  return {
    counters: {
      activeLeads: myLeads.length,
      notContactedToday,
      visitsToday,
      visitsThisWeek,
      tasksDueToday: todayTasks.length,
      tasksOverdue: overdueTasks.length,
      newClaimsThisWeek: newClaimsThisWeek ?? 0,
    },
    tasks: { overdue: overdueTasks, today: todayTasks, upcoming: upcomingTasks },
    attentionQueue,
    miniFunnel,
  };
}
