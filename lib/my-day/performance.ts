/**
 * Performance aggregation queries for GET /api/my-day/performance.
 * All metrics self-scoped to the requesting salesperson.
 *
 * Conversion credit rule (from plan §6):
 *   - A deal close (sozlesme-imzalandi) credits whoever is assigned_to at that moment.
 *   - "Claimed in window" denominator = leads where assigned_to = userId AND claimed_at in window.
 *     (Approximation — full multi-hand attribution requires a claims-history table, deferred.)
 *   - Campaign messages excluded from personal message counts (sender_agent_id IS NOT NULL filters to human sends).
 */
import { createServiceClient } from '@/lib/supabase/service';
import { istanbulTodayBounds, istanbulWeekStart } from '@/lib/time/istanbul';

export interface PerformanceDateRange {
  from: Date;
  to: Date;
}

export function resolvePerformanceRange(rangeParam: string | undefined): PerformanceDateRange {
  const now = new Date();

  if (rangeParam === 'this_week') {
    return { from: istanbulWeekStart(now), to: istanbulTodayBounds(now).end };
  }

  if (rangeParam === 'this_month') {
    const { end: todayEnd } = istanbulTodayBounds(now);
    // First day of current Istanbul month.
    const monthStart = new Date(
      new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Europe/Istanbul',
        year: 'numeric',
        month: '2-digit',
      }).format(now) + '-01T00:00:00+03:00',
    );
    return { from: monthStart, to: todayEnd };
  }

  // Default: this week.
  return { from: istanbulWeekStart(now), to: istanbulTodayBounds(now).end };
}

export interface ConversionFunnelStep {
  stage: string;
  count: number;
}

export interface PerformancePayload {
  conversionFunnel: ConversionFunnelStep[];
  visitShowRate: { attended: number; failed: number; rate: number | null };
  activityVolume: { calls: number; messages: number; contacts: number; total: number };
  taskCompletion: { completed: number; total: number; rate: number | null };
}

export async function getPerformancePayload(
  userId: string,
  range: PerformanceDateRange,
): Promise<PerformancePayload> {
  const client = createServiceClient();
  const fromIso = range.from.toISOString();
  const toIso = range.to.toISOString();

  // ── Conversion funnel ─────────────────────────────────────────────────────
  // Claimed: leads assigned to this user with claimed_at in range.
  const { count: claimedCount } = await client
    .from('leads')
    .select('uuid', { count: 'exact', head: true })
    .eq('assigned_to', userId)
    .gte('claimed_at', fromIso)
    .lte('claimed_at', toIso);

  // Contacted: leads assigned to user with at least one contact_history entry in range.
  const { data: myLeadsData } = await client
    .from('leads')
    .select('uuid')
    .eq('assigned_to', userId)
    .eq('is_deleted', false);
  const myLeadUuids = (myLeadsData ?? []).map((l) => l.uuid);

  let contactedCount = 0;
  if (myLeadUuids.length > 0) {
    const { data: contactedLeads } = await client
      .from('contact_history')
      .select('lead_uuid')
      .in('lead_uuid', myLeadUuids)
      .eq('salesperson_id', userId)
      .gte('created_at', fromIso)
      .lte('created_at', toIso);
    contactedCount = new Set((contactedLeads ?? []).map((c) => c.lead_uuid)).size;
  }

  // Visited: leads where a visit was resolved (attended or failed) in range.
  let visitedCount = 0;
  if (myLeadUuids.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: visitedLeads } = await (client as any)
      .from('visits')
      .select('lead_uuid')
      .in('lead_uuid', myLeadUuids)
      .in('status', ['attended', 'failed'])
      .gte('scheduled_date', fromIso)
      .lte('scheduled_date', toIso);
    visitedCount = new Set(
      ((visitedLeads ?? []) as Array<{ lead_uuid: string }>).map((v) => v.lead_uuid),
    ).size;
  }

  // Downpayment + deal signed: transitions in lead_stage_history where changed_by = userId.
  const { data: stageTransitions } = await client
    .from('lead_stage_history')
    .select('lead_uuid, to_status')
    .eq('changed_by', userId)
    .in('to_status', ['kapora-alindi', 'sozlesme-imzalandi'])
    .gte('changed_at', fromIso)
    .lte('changed_at', toIso);

  const downpaymentLeads = new Set(
    (stageTransitions ?? []).filter((t) => t.to_status === 'kapora-alindi').map((t) => t.lead_uuid),
  );
  const signedLeads = new Set(
    (stageTransitions ?? [])
      .filter((t) => t.to_status === 'sozlesme-imzalandi')
      .map((t) => t.lead_uuid),
  );

  const conversionFunnel: ConversionFunnelStep[] = [
    { stage: 'claimed', count: claimedCount ?? 0 },
    { stage: 'contacted', count: contactedCount },
    { stage: 'visited', count: visitedCount },
    { stage: 'downpayment', count: downpaymentLeads.size },
    { stage: 'deal_signed', count: signedLeads.size },
  ];

  // ── Visit show-rate ───────────────────────────────────────────────────────
  let attended = 0;
  let failed = 0;
  if (myLeadUuids.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: resolvedVisits } = await (client as any)
      .from('visits')
      .select('status')
      .in('lead_uuid', myLeadUuids)
      .in('status', ['attended', 'failed'])
      .gte('scheduled_date', fromIso)
      .lte('scheduled_date', toIso);
    for (const v of (resolvedVisits ?? []) as Array<{ status: string }>) {
      if (v.status === 'attended') attended++;
      else failed++;
    }
  }
  const showRateTotal = attended + failed;
  const visitShowRate = {
    attended,
    failed,
    rate: showRateTotal > 0 ? Math.round((attended / showRateTotal) * 100) / 100 : null,
  };

  // ── Activity volume ───────────────────────────────────────────────────────
  const { data: activityRows } = await client
    .from('contact_history')
    .select('interaction_type')
    .eq('salesperson_id', userId)
    .gte('created_at', fromIso)
    .lte('created_at', toIso);

  let calls = 0;
  let messages = 0;
  let contacts = 0;
  for (const row of activityRows ?? []) {
    if (row.interaction_type === 'call') calls++;
    else if (row.interaction_type === 'message') messages++;
    else contacts++;
  }

  // Message count from lead_messages (salesperson-initiated only, campaigns excluded).
  const { count: sentMessages } = await client
    .from('lead_messages')
    .select('id', { count: 'exact', head: true })
    .eq('direction', 'outgoing')
    .not('sender_agent_id', 'is', null)
    .gte('created_at', fromIso)
    .lte('created_at', toIso);
  messages = Math.max(messages, sentMessages ?? 0);

  const activityVolume = { calls, messages, contacts, total: calls + messages + contacts };

  // ── Task completion rate ──────────────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: allTasks } = await (client as any)
    .from('tasks')
    .select('is_completed')
    .eq('assigned_to', userId)
    .gte('created_at', fromIso)
    .lte('created_at', toIso);

  const totalTasks = (allTasks ?? []).length;
  const completedTasks = ((allTasks ?? []) as Array<{ is_completed: boolean }>).filter(
    (t) => t.is_completed,
  ).length;

  const taskCompletion = {
    completed: completedTasks,
    total: totalTasks,
    rate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) / 100 : null,
  };

  return { conversionFunnel, visitShowRate, activityVolume, taskCompletion };
}
