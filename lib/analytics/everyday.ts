/**
 * Everyday tab analytics payload.
 */
import { createServiceClient } from '@/lib/supabase/service';
import { bucketByIstanbulDay, enumerateIstanbulDays } from '@/lib/analytics/trend-buckets';
import { resolveEffectiveRange, type OverviewRangeSelection } from '@/lib/analytics/overview-range';
import {
  CALL_TYPES,
  computeMedianTimeInStage,
  countEverReached,
  fetchAllRows,
  fetchContactsForLeads,
  toPieSlices,
  type ConversionStageDepth,
  type OverviewLineSeries,
  type OverviewPropertyOption,
} from '@/lib/analytics/overview-shared';

export interface EverydayQueryParams {
  global: OverviewRangeSelection;
  sectionTop: OverviewRangeSelection;
  sectionFunnel: OverviewRangeSelection;
  sectionActivity: OverviewRangeSelection;
  sectionVisits: OverviewRangeSelection;
  widgetMessages: OverviewRangeSelection;
  widgetCalls: OverviewRangeSelection;
  widgetVisitsTrend: OverviewRangeSelection;
  widgetFunnelByStage: OverviewRangeSelection;
  widgetMedianTimeInStage: OverviewRangeSelection;
  widgetVisitsByProperty: OverviewRangeSelection;
  conversionStage: ConversionStageDepth;
  messagesDirection: 'both' | 'incoming' | 'outgoing';
  visitsPropertyId: string | 'all';
}

export interface EverydayPayload {
  topCards: {
    totalLeads: number;
    conversionRate: number | null;
    totalDeals: number;
    unclaimedLeads: number;
    avgResponseMinutes: number | null;
  };
  funnel: {
    byStage: ReturnType<typeof toPieSlices>;
    medianTimeInStage: ReturnType<typeof computeMedianTimeInStage>;
  };
  activity: {
    avgDailyIncoming: number;
    avgDailyOutgoing: number;
    avgDailyCalls: number;
    messagesOverTime: OverviewLineSeries;
    callsOverTime: OverviewLineSeries;
  };
  visits: {
    totalVisits: number;
    showRate: number | null;
    successfulVisits: number;
    failedVisits: number;
    visitsOverTime: OverviewLineSeries;
    byProperty: ReturnType<typeof toPieSlices>;
    properties: OverviewPropertyOption[];
  };
}

function daysInRange(from: Date, to: Date): number {
  return Math.max(1, enumerateIstanbulDays(from, to).length);
}

export async function getEverydayPayload(params: EverydayQueryParams): Promise<EverydayPayload> {
  const client = createServiceClient();

  const rangeTop = resolveEffectiveRange(params.global, params.sectionTop);
  const rangeActivity = resolveEffectiveRange(params.global, params.sectionActivity);
  const rangeVisits = resolveEffectiveRange(params.global, params.sectionVisits);
  const rangeMessages = resolveEffectiveRange(
    params.global,
    params.sectionActivity,
    params.widgetMessages,
  );
  const rangeCalls = resolveEffectiveRange(
    params.global,
    params.sectionActivity,
    params.widgetCalls,
  );
  const rangeVisitsTrend = resolveEffectiveRange(
    params.global,
    params.sectionVisits,
    params.widgetVisitsTrend,
  );
  const rangeFunnelByStage = resolveEffectiveRange(
    params.global,
    params.sectionFunnel,
    params.widgetFunnelByStage,
  );
  const rangeMedianTime = resolveEffectiveRange(
    params.global,
    params.sectionFunnel,
    params.widgetMedianTimeInStage,
  );
  const rangeVisitsByProperty = resolveEffectiveRange(
    params.global,
    params.sectionVisits,
    params.widgetVisitsByProperty,
  );

  const topFrom = rangeTop.from.toISOString();
  const topTo = rangeTop.to.toISOString();

  const [
    leadsInTopRange,
    unclaimedCount,
    funnelByStage,
    stageHistoryFull,
    messagesActivity,
    messagesTrend,
    callsActivity,
    callsTrend,
    visitsActivity,
    visitsTrend,
    visitsByProperty,
    propertiesRes,
  ] = await Promise.all([
    fetchAllRows<{ uuid: string; created_at: string }>((a, b) =>
      client
        .from('leads')
        .select('uuid, created_at')
        .eq('is_deleted', false)
        .gte('created_at', topFrom)
        .lte('created_at', topTo)
        .range(a, b),
    ),
    client
      .from('leads')
      .select('uuid', { count: 'exact', head: true })
      .eq('is_deleted', false)
      .eq('is_archived', false)
      .is('assigned_to', null),
    fetchAllRows<{ funnel_status: string }>((a, b) =>
      client
        .from('leads')
        .select('funnel_status')
        .eq('is_deleted', false)
        .eq('is_archived', false)
        .eq('has_moved_in', false)
        .neq('funnel_status', 'lost')
        .gte('created_at', rangeFunnelByStage.from.toISOString())
        .lte('created_at', rangeFunnelByStage.to.toISOString())
        .range(a, b),
    ),
    fetchAllRows<{ lead_uuid: string; to_status: string; changed_at: string }>((a, b) =>
      client
        .from('lead_stage_history')
        .select('lead_uuid, to_status, changed_at')
        .order('changed_at', { ascending: true })
        .range(a, b),
    ),
    fetchAllRows<{ created_at: string; direction: string }>((a, b) =>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (client as any)
        .from('lead_messages')
        .select('created_at, direction')
        .gte('created_at', rangeActivity.from.toISOString())
        .lte('created_at', rangeActivity.to.toISOString())
        .range(a, b),
    ),
    fetchAllRows<{ created_at: string; direction: string }>((a, b) =>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (client as any)
        .from('lead_messages')
        .select('created_at, direction')
        .gte('created_at', rangeMessages.from.toISOString())
        .lte('created_at', rangeMessages.to.toISOString())
        .range(a, b),
    ),
    fetchAllRows<{ created_at: string; interaction_type: string }>((a, b) =>
      client
        .from('contact_history')
        .select('lead_uuid, created_at, interaction_type')
        .gte('created_at', rangeActivity.from.toISOString())
        .lte('created_at', rangeActivity.to.toISOString())
        .range(a, b),
    ),
    fetchAllRows<{ created_at: string; interaction_type: string }>((a, b) =>
      client
        .from('contact_history')
        .select('lead_uuid, created_at, interaction_type')
        .gte('created_at', rangeCalls.from.toISOString())
        .lte('created_at', rangeCalls.to.toISOString())
        .range(a, b),
    ),
    fetchAllRows<{ property_id: string; scheduled_date: string; status: string }>((a, b) =>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (client as any)
        .from('visits')
        .select('property_id, scheduled_date, status')
        .gte('scheduled_date', rangeVisits.from.toISOString())
        .lte('scheduled_date', rangeVisits.to.toISOString())
        .range(a, b),
    ),
    fetchAllRows<{ property_id: string; scheduled_date: string; status: string }>((a, b) => {
      let q = // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (client as any)
          .from('visits')
          .select('property_id, scheduled_date, status')
          .gte('scheduled_date', rangeVisitsTrend.from.toISOString())
          .lte('scheduled_date', rangeVisitsTrend.to.toISOString());
      if (params.visitsPropertyId !== 'all') {
        q = q.eq('property_id', params.visitsPropertyId);
      }
      return q.range(a, b);
    }),
    fetchAllRows<{ property_id: string; scheduled_date: string; status: string }>((a, b) =>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (client as any)
        .from('visits')
        .select('property_id, scheduled_date, status')
        .gte('scheduled_date', rangeVisitsByProperty.from.toISOString())
        .lte('scheduled_date', rangeVisitsByProperty.to.toISOString())
        .range(a, b),
    ),
    client.from('properties').select('id, hotel_name').order('hotel_name'),
  ]);

  const [firstContacts, totalDeals] = await Promise.all([
    fetchContactsForLeads(
      client,
      leadsInTopRange.map((l) => l.uuid),
    ),
    countEverReached(client, topFrom, topTo, params.conversionStage),
  ]);

  const totalLeads = leadsInTopRange.length;
  const conversionRate =
    totalLeads > 0 ? Math.round((totalDeals / totalLeads) * 1000) / 1000 : null;

  const earliestByLead = new Map<string, number>();
  for (const c of firstContacts) {
    const ts = new Date(c.created_at).getTime();
    const prev = earliestByLead.get(c.lead_uuid);
    if (prev === undefined || ts < prev) earliestByLead.set(c.lead_uuid, ts);
  }
  const responseMinutes: number[] = [];
  for (const lead of leadsInTopRange) {
    const firstTs = earliestByLead.get(lead.uuid);
    if (firstTs === undefined) continue;
    const delta = (firstTs - new Date(lead.created_at).getTime()) / 60_000;
    if (delta >= 0) responseMinutes.push(delta);
  }
  const avgResponseMinutes =
    responseMinutes.length > 0
      ? responseMinutes.reduce((s, v) => s + v, 0) / responseMinutes.length
      : null;

  const funnelCounts = new Map<string, number>();
  for (const row of funnelByStage) {
    const st = row.funnel_status ?? 'unknown';
    funnelCounts.set(st, (funnelCounts.get(st) ?? 0) + 1);
  }

  const activityDays = daysInRange(rangeActivity.from, rangeActivity.to);
  let incoming = 0;
  let outgoing = 0;
  for (const m of messagesActivity) {
    if (m.direction === 'incoming') incoming++;
    else if (m.direction === 'outgoing') outgoing++;
  }
  let callCount = 0;
  for (const c of callsActivity) {
    if (CALL_TYPES.has(c.interaction_type)) callCount++;
  }

  const messageDays = enumerateIstanbulDays(rangeMessages.from, rangeMessages.to);
  const incomingTs: string[] = [];
  const outgoingTs: string[] = [];
  for (const m of messagesTrend) {
    if (m.direction === 'incoming') incomingTs.push(m.created_at);
    else if (m.direction === 'outgoing') outgoingTs.push(m.created_at);
  }

  const callDays = enumerateIstanbulDays(rangeCalls.from, rangeCalls.to);
  const callTs = callsTrend
    .filter((c) => CALL_TYPES.has(c.interaction_type))
    .map((c) => c.created_at);

  let successfulVisits = 0;
  let failedVisits = 0;
  for (const v of visitsActivity) {
    if (v.status === 'attended') successfulVisits++;
    else if (v.status === 'failed') failedVisits++;
  }
  const resolvedVisits = successfulVisits + failedVisits;

  const propertyCounts = new Map<string, number>();
  for (const v of visitsByProperty) {
    propertyCounts.set(v.property_id, (propertyCounts.get(v.property_id) ?? 0) + 1);
  }

  const properties: OverviewPropertyOption[] = (propertiesRes.data ?? []).map(
    (p: { id: string; hotel_name: string }) => ({ id: p.id, name: p.hotel_name }),
  );

  return {
    topCards: {
      totalLeads,
      conversionRate,
      totalDeals,
      unclaimedLeads: unclaimedCount.count ?? 0,
      avgResponseMinutes,
    },
    funnel: {
      byStage: toPieSlices(funnelCounts),
      medianTimeInStage: computeMedianTimeInStage(stageHistoryFull, rangeMedianTime),
    },
    activity: {
      avgDailyIncoming: Math.round((incoming / activityDays) * 10) / 10,
      avgDailyOutgoing: Math.round((outgoing / activityDays) * 10) / 10,
      avgDailyCalls: Math.round((callCount / activityDays) * 10) / 10,
      messagesOverTime: {
        days: messageDays,
        values:
          params.messagesDirection === 'incoming'
            ? bucketByIstanbulDay(incomingTs, messageDays)
            : params.messagesDirection === 'outgoing'
              ? bucketByIstanbulDay(outgoingTs, messageDays)
              : bucketByIstanbulDay([...incomingTs, ...outgoingTs], messageDays),
      },
      callsOverTime: {
        days: callDays,
        values: bucketByIstanbulDay(callTs, callDays),
      },
    },
    visits: {
      totalVisits: visitsActivity.length,
      showRate:
        resolvedVisits > 0 ? Math.round((successfulVisits / resolvedVisits) * 1000) / 1000 : null,
      successfulVisits,
      failedVisits,
      visitsOverTime: {
        days: enumerateIstanbulDays(rangeVisitsTrend.from, rangeVisitsTrend.to),
        values: bucketByIstanbulDay(
          visitsTrend.map((v) => v.scheduled_date),
          enumerateIstanbulDays(rangeVisitsTrend.from, rangeVisitsTrend.to),
        ),
      },
      byProperty: toPieSlices(propertyCounts),
      properties,
    },
  };
}
