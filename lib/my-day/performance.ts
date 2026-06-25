/**
 * Performance aggregation queries for GET /api/my-day/genel-performans (the Performansım tab).
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

  if (rangeParam === 'today') {
    const { start, end } = istanbulTodayBounds(now);
    return { from: start, to: end };
  }

  if (rangeParam === 'all_time') {
    return {
      from: new Date(0),
      to: new Date('2099-12-31T23:59:59+03:00'),
    };
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
  /** KPI tiles for the redesigned Performansım tab. */
  kpi: {
    leads: number;
    messages: number;
    calls: number;
    visits: number;
    downpayments: number;
    dealsSigned: number;
  };
  /** Connect rate: answered outbound calls / total outbound calls. */
  connectRate: { answered: number; total: number; rate: number | null };
  /** Top loss reasons by lead count (up to 5 + other). */
  lossReasons: Array<{ reason: string; count: number }>;
  /** Leads stuck in 'yeni' status for 7+ days. */
  stuckNewLeads: number;
}

export async function getPerformancePayload(
  userId: string,
  range: PerformanceDateRange,
  opts?: { allTimeLeads?: boolean },
): Promise<PerformancePayload> {
  const client = createServiceClient();
  const fromIso = range.from.toISOString();
  const toIso = range.to.toISOString();

  // ── Conversion funnel ─────────────────────────────────────────────────────
  // leadBase feeds both kpi.leads and conversionFunnel[0] so they always agree.
  // allTimeLeads: total portfolio (assigned_to = userId, no date filter, includes claimed_at = NULL).
  // windowed:     leads claimed within the selected range.
  let leadBase: number;
  if (opts?.allTimeLeads) {
    const { count: portfolioCount } = await client
      .from('leads')
      .select('uuid', { count: 'exact', head: true })
      .eq('assigned_to', userId)
      .eq('is_deleted', false);
    leadBase = portfolioCount ?? 0;
  } else {
    const { count: claimedCount } = await client
      .from('leads')
      .select('uuid', { count: 'exact', head: true })
      .eq('assigned_to', userId)
      .gte('claimed_at', fromIso)
      .lte('claimed_at', toIso);
    leadBase = claimedCount ?? 0;
  }

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

  // Visited: distinct leads where this rep booked a resolved visit in range.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: visitedLeads } = await (client as any)
    .from('visits')
    .select('lead_uuid')
    .eq('created_by', userId)
    .in('status', ['attended', 'failed'])
    .gte('scheduled_date', fromIso)
    .lte('scheduled_date', toIso);
  const visitedCount = new Set(
    ((visitedLeads ?? []) as Array<{ lead_uuid: string }>).map((v) => v.lead_uuid),
  ).size;

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
    { stage: 'claimed', count: leadBase },
    { stage: 'contacted', count: contactedCount },
    { stage: 'visited', count: visitedCount },
    { stage: 'downpayment', count: downpaymentLeads.size },
    { stage: 'deal_signed', count: signedLeads.size },
  ];

  // ── Visit show-rate ───────────────────────────────────────────────────────
  let attended = 0;
  let failed = 0;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: resolvedVisits } = await (client as any)
    .from('visits')
    .select('status')
    .eq('created_by', userId)
    .in('status', ['attended', 'failed'])
    .gte('scheduled_date', fromIso)
    .lte('scheduled_date', toIso);
  for (const v of (resolvedVisits ?? []) as Array<{ status: string }>) {
    if (v.status === 'attended') attended++;
    else failed++;
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
    else if (row.interaction_type === 'message_sent') messages++;
    else contacts++;
  }

  // Message count from lead_messages — scope per-rep via chatwoot_user_id join (flagged check #2).
  // sender_agent_id in lead_messages stores Chatwoot user IDs as strings; we join to
  // salespeople.chatwoot_user_id to ensure only this rep's messages are counted.
  const { data: spRow } = await client
    .from('salespeople')
    .select('chatwoot_user_id')
    .eq('id', userId)
    .maybeSingle();

  const chatwootUserId = (spRow as Record<string, unknown> | null)?.chatwoot_user_id;
  if (chatwootUserId != null) {
    const { count: sentMessages } = await client
      .from('lead_messages')
      .select('id', { count: 'exact', head: true })
      .eq('direction', 'outgoing')
      .eq('sender_agent_id', String(chatwootUserId))
      .gte('created_at', fromIso)
      .lte('created_at', toIso);
    messages = Math.max(messages, sentMessages ?? 0);
  }

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

  // ── KPI tiles ─────────────────────────────────────────────────────────────
  // leads = leadBase (same value used in conversionFunnel[0] — always in sync)
  const kpiLeads = leadBase;
  const kpiMessages = messages;
  const kpiCalls = calls;
  const kpiVisits = visitedCount;
  const kpiDownpayments = downpaymentLeads.size;
  const kpiDealsSigned = signedLeads.size;

  // ── Connect rate (outbound CDR calls answered vs total) ───────────────────
  const { data: outboundCallsRaw } = await client
    .from('contact_history')
    .select('metadata')
    .eq('salesperson_id', userId)
    .eq('interaction_type', 'call')
    .eq('interaction_source', 'netgsm')
    .gte('created_at', fromIso)
    .lte('created_at', toIso);

  let answeredCalls = 0;
  let totalOutbound = 0;
  for (const row of (outboundCallsRaw ?? []) as Array<{
    metadata: Record<string, unknown> | null;
  }>) {
    const meta = row.metadata ?? {};
    if ((meta.direction as string | undefined) !== 'outbound') continue;
    totalOutbound++;
    const dur = (meta.duration_seconds as number | undefined) ?? 0;
    if (dur > 0) answeredCalls++;
  }
  const connectRate = {
    answered: answeredCalls,
    total: totalOutbound,
    rate: totalOutbound > 0 ? Math.round((answeredCalls / totalOutbound) * 100) / 100 : null,
  };

  // ── Loss reasons (my leads lost in range) ─────────────────────────────────
  const { data: lostLeadsRaw } = await client
    .from('leads')
    .select('loss_reason')
    .eq('assigned_to', userId)
    .eq('funnel_status', 'lost')
    .gte('last_contact_at', fromIso)
    .lte('last_contact_at', toIso);

  const lossReasonMap = new Map<string, number>();
  for (const row of (lostLeadsRaw ?? []) as Array<{ loss_reason: string | null }>) {
    const reason = row.loss_reason ?? 'other';
    lossReasonMap.set(reason, (lossReasonMap.get(reason) ?? 0) + 1);
  }

  const sortedReasons = [...lossReasonMap.entries()].sort((a, b) => b[1] - a[1]);
  const lossReasons: Array<{ reason: string; count: number }> = sortedReasons
    .slice(0, 5)
    .map(([reason, count]) => ({ reason, count }));

  if (sortedReasons.length > 5) {
    const otherCount = sortedReasons.slice(5).reduce((sum, [, n]) => sum + n, 0);
    lossReasons.push({ reason: 'other', count: otherCount });
  }

  // ── Stuck leads (assigned now, in 'yeni' for 7+ days) ─────────────────────
  const sevenDaysAgoIso = new Date(Date.now() - 7 * 24 * 3_600_000).toISOString();
  const { count: stuckNewLeads } = await client
    .from('leads')
    .select('uuid', { count: 'exact', head: true })
    .eq('assigned_to', userId)
    .eq('funnel_status', 'yeni')
    .eq('is_archived', false)
    .eq('is_deleted', false)
    .lte('last_contact_at', sevenDaysAgoIso);

  return {
    conversionFunnel,
    visitShowRate,
    activityVolume,
    taskCompletion,
    kpi: {
      leads: kpiLeads,
      messages: kpiMessages,
      calls: kpiCalls,
      visits: kpiVisits,
      downpayments: kpiDownpayments,
      dealsSigned: kpiDealsSigned,
    },
    connectRate,
    lossReasons,
    stuckNewLeads: stuckNewLeads ?? 0,
  };
}
