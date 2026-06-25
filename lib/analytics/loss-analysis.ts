/**
 * Loss Analysis tab analytics payload.
 */
import { createServiceClient } from '@/lib/supabase/service';
import {
  bucketByIstanbulDay,
  enumerateIstanbulDays,
  istanbulDayKey,
} from '@/lib/analytics/trend-buckets';
import { resolveEffectiveRange, type OverviewRangeSelection } from '@/lib/analytics/overview-range';
import {
  initSourceCounts,
  resolveSourceBucket,
  sourceBucketCardCount,
  SOURCE_BUCKET_IDS,
} from '@/lib/analytics/source-buckets';
import {
  fetchAllRows,
  toPieSlices,
  type OverviewLineSeries,
  type OverviewRateLineSeries,
  type OverviewSourceBar,
} from '@/lib/analytics/overview-shared';

export type LossOverTimeMode = 'rate' | 'count';

export interface LossAnalysisQueryParams {
  global: OverviewRangeSelection;
  sectionLoss: OverviewRangeSelection;
  widgetLostByReason: OverviewRangeSelection;
  widgetStagesBeforeLoss: OverviewRangeSelection;
  widgetLossOverTime: OverviewRangeSelection;
  widgetLostBySource: OverviewRangeSelection;
  lossOverTimeMode: LossOverTimeMode;
}

export interface LossAnalysisPayload {
  byReason: ReturnType<typeof toPieSlices>;
  stagesBeforeLoss: ReturnType<typeof toPieSlices>;
  lossOverTimeRate: OverviewRateLineSeries;
  lossOverTimeCount: OverviewLineSeries;
  bySource: OverviewSourceBar[];
  cohortLeadCount: number;
}

const MATURING_BUCKET_COUNT = 2;

type LossLeadRow = {
  loss_reason: string | null;
  funnel_status_before_lost: string | null;
  lead_source: string | null;
};

function buildCohortLossRateSeries(
  leads: Array<{ created_at: string; funnel_status: string }>,
  rangeFrom: Date,
  rangeTo: Date,
): OverviewRateLineSeries {
  const days = enumerateIstanbulDays(rangeFrom, rangeTo);
  const createdByDay = new Map<string, number>();
  const lostByDay = new Map<string, number>();

  for (const lead of leads) {
    const key = istanbulDayKey(new Date(lead.created_at));
    if (!days.includes(key)) continue;
    createdByDay.set(key, (createdByDay.get(key) ?? 0) + 1);
    if (lead.funnel_status === 'lost') {
      lostByDay.set(key, (lostByDay.get(key) ?? 0) + 1);
    }
  }

  const values = days.map((day) => {
    const total = createdByDay.get(day) ?? 0;
    const lost = lostByDay.get(day) ?? 0;
    if (total <= 0) return 0;
    return Math.round((lost / total) * 1000) / 10;
  });

  const maturingIndices: number[] = [];
  for (let i = Math.max(0, days.length - MATURING_BUCKET_COUNT); i < days.length; i++) {
    if ((createdByDay.get(days[i]!) ?? 0) > 0) maturingIndices.push(i);
  }

  return { days, values, maturingIndices };
}

function aggregateLossPies(rows: LossLeadRow[]) {
  const lossReasonCounts = new Map<string, number>();
  const stagesBeforeLossCounts = new Map<string, number>();
  for (const row of rows) {
    const reason = row.loss_reason ?? 'unknown';
    lossReasonCounts.set(reason, (lossReasonCounts.get(reason) ?? 0) + 1);
    const stage = row.funnel_status_before_lost ?? 'unknown';
    stagesBeforeLossCounts.set(stage, (stagesBeforeLossCounts.get(stage) ?? 0) + 1);
  }
  return { lossReasonCounts, stagesBeforeLossCounts };
}

async function fetchLostLeadsInRange(fromIso: string, toIso: string): Promise<LossLeadRow[]> {
  const client = createServiceClient();
  return fetchAllRows<LossLeadRow>((a, b) =>
    client
      .from('leads')
      .select('loss_reason, funnel_status_before_lost, lead_source')
      .eq('is_deleted', false)
      .eq('funnel_status', 'lost')
      .gte('created_at', fromIso)
      .lte('created_at', toIso)
      .range(a, b),
  );
}

export async function getLossAnalysisPayload(
  params: LossAnalysisQueryParams,
): Promise<LossAnalysisPayload> {
  const client = createServiceClient();

  const rangeByReason = resolveEffectiveRange(
    params.global,
    params.sectionLoss,
    params.widgetLostByReason,
  );
  const rangeStagesBefore = resolveEffectiveRange(
    params.global,
    params.sectionLoss,
    params.widgetStagesBeforeLoss,
  );
  const rangeLossOverTime = resolveEffectiveRange(
    params.global,
    params.sectionLoss,
    params.widgetLossOverTime,
  );
  const rangeBySource = resolveEffectiveRange(
    params.global,
    params.sectionLoss,
    params.widgetLostBySource,
  );

  const [
    lossLeadsByReason,
    lossLeadsStagesBefore,
    lossLeadsBySource,
    cohortLeads,
    lossTransitions,
  ] = await Promise.all([
    fetchLostLeadsInRange(rangeByReason.from.toISOString(), rangeByReason.to.toISOString()),
    fetchLostLeadsInRange(rangeStagesBefore.from.toISOString(), rangeStagesBefore.to.toISOString()),
    fetchLostLeadsInRange(rangeBySource.from.toISOString(), rangeBySource.to.toISOString()),
    fetchAllRows<{ created_at: string; funnel_status: string }>((a, b) =>
      client
        .from('leads')
        .select('created_at, funnel_status')
        .eq('is_deleted', false)
        .gte('created_at', rangeLossOverTime.from.toISOString())
        .lte('created_at', rangeLossOverTime.to.toISOString())
        .range(a, b),
    ),
    fetchAllRows<{ changed_at: string }>((a, b) =>
      client
        .from('lead_stage_history')
        .select('changed_at')
        .eq('to_status', 'lost')
        .gte('changed_at', rangeLossOverTime.from.toISOString())
        .lte('changed_at', rangeLossOverTime.to.toISOString())
        .range(a, b),
    ),
  ]);

  const byReasonAgg = aggregateLossPies(lossLeadsByReason);
  const stagesAgg = aggregateLossPies(lossLeadsStagesBefore);

  const sourceCounts = initSourceCounts();
  for (const row of lossLeadsBySource) {
    sourceCounts[resolveSourceBucket(row.lead_source)]++;
  }

  const lossOverTimeRate = buildCohortLossRateSeries(
    cohortLeads,
    rangeLossOverTime.from,
    rangeLossOverTime.to,
  );

  const countDays = enumerateIstanbulDays(rangeLossOverTime.from, rangeLossOverTime.to);
  const lossOverTimeCount: OverviewLineSeries = {
    days: countDays,
    values: bucketByIstanbulDay(
      lossTransitions.map((r) => r.changed_at),
      countDays,
    ),
  };

  const bySource: OverviewSourceBar[] = SOURCE_BUCKET_IDS.map((id) => ({
    id,
    count: sourceBucketCardCount(id, sourceCounts[id]),
  }))
    .filter((b) => b.count > 0)
    .sort((a, b) => b.count - a.count);

  return {
    byReason: toPieSlices(byReasonAgg.lossReasonCounts),
    stagesBeforeLoss: toPieSlices(stagesAgg.stagesBeforeLossCounts),
    lossOverTimeRate,
    lossOverTimeCount,
    bySource,
    cohortLeadCount: cohortLeads.length,
  };
}
