/**
 * SWR hooks for analytics tab payloads (Everyday, Marketing, Loss Analysis).
 */
import useSWR from 'swr';
import {
  DEFAULT_GLOBAL_RANGE,
  serializeOverviewRangeParam,
  type OverviewRangeSelection,
} from '@/lib/analytics/overview-range';
import type { ConversionStageDepth } from '@/lib/analytics/overview-shared';
import type { EverydayPayload } from '@/lib/analytics/everyday';
import type { MarketingPayload } from '@/lib/analytics/marketing';
import type { LossAnalysisPayload, LossOverTimeMode } from '@/lib/analytics/loss-analysis';

export interface AnalyticsFilterState {
  global: OverviewRangeSelection;
  sectionTop: OverviewRangeSelection;
  sectionFunnel: OverviewRangeSelection;
  sectionActivity: OverviewRangeSelection;
  sectionVisits: OverviewRangeSelection;
  sectionSource: OverviewRangeSelection;
  sectionLoss: OverviewRangeSelection;
  widgetMessages: OverviewRangeSelection;
  widgetCalls: OverviewRangeSelection;
  widgetVisitsTrend: OverviewRangeSelection;
  widgetFunnelByStage: OverviewRangeSelection;
  widgetMedianTimeInStage: OverviewRangeSelection;
  widgetVisitsByProperty: OverviewRangeSelection;
  widgetLeadsBySource: OverviewRangeSelection;
  widgetConversionsBySource: OverviewRangeSelection;
  widgetLostByReason: OverviewRangeSelection;
  widgetStagesBeforeLoss: OverviewRangeSelection;
  widgetLossOverTime: OverviewRangeSelection;
  widgetLostBySource: OverviewRangeSelection;
  conversionStage: ConversionStageDepth;
  messagesDirection: 'both' | 'incoming' | 'outgoing';
  visitsPropertyId: string;
  lossOverTimeMode: LossOverTimeMode;
}

export const DEFAULT_ANALYTICS_FILTERS: AnalyticsFilterState = {
  global: DEFAULT_GLOBAL_RANGE,
  sectionTop: { mode: 'off' },
  sectionFunnel: { mode: 'off' },
  sectionActivity: { mode: 'off' },
  sectionVisits: { mode: 'off' },
  sectionSource: { mode: 'off' },
  sectionLoss: { mode: 'off' },
  widgetMessages: { mode: 'preset', preset: 'this_month' },
  widgetCalls: { mode: 'preset', preset: 'this_month' },
  widgetVisitsTrend: { mode: 'preset', preset: 'this_month' },
  widgetFunnelByStage: { mode: 'preset', preset: 'this_month' },
  widgetMedianTimeInStage: { mode: 'preset', preset: 'this_month' },
  widgetVisitsByProperty: { mode: 'preset', preset: 'this_month' },
  widgetLeadsBySource: { mode: 'preset', preset: 'this_month' },
  widgetConversionsBySource: { mode: 'preset', preset: 'this_month' },
  widgetLostByReason: { mode: 'preset', preset: 'this_month' },
  widgetStagesBeforeLoss: { mode: 'preset', preset: 'this_month' },
  widgetLossOverTime: { mode: 'preset', preset: 'this_month' },
  widgetLostBySource: { mode: 'preset', preset: 'this_month' },
  conversionStage: 'sozlesme-imzalandi',
  messagesDirection: 'both',
  visitsPropertyId: 'all',
  lossOverTimeMode: 'rate',
};

async function fetcher<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch');
  const json = await res.json();
  return json.data;
}

function buildEverydayUrl(filters: AnalyticsFilterState): string {
  const params = new URLSearchParams({
    global: serializeOverviewRangeParam(filters.global),
    sectionTop: serializeOverviewRangeParam(filters.sectionTop),
    sectionFunnel: serializeOverviewRangeParam(filters.sectionFunnel),
    sectionActivity: serializeOverviewRangeParam(filters.sectionActivity),
    sectionVisits: serializeOverviewRangeParam(filters.sectionVisits),
    widgetMessages: serializeOverviewRangeParam(filters.widgetMessages),
    widgetCalls: serializeOverviewRangeParam(filters.widgetCalls),
    widgetVisitsTrend: serializeOverviewRangeParam(filters.widgetVisitsTrend),
    widgetFunnelByStage: serializeOverviewRangeParam(filters.widgetFunnelByStage),
    widgetMedianTimeInStage: serializeOverviewRangeParam(filters.widgetMedianTimeInStage),
    widgetVisitsByProperty: serializeOverviewRangeParam(filters.widgetVisitsByProperty),
    conversionStage: filters.conversionStage,
    messagesDirection: filters.messagesDirection,
    visitsPropertyId: filters.visitsPropertyId,
  });
  return `/api/analytics/everyday?${params.toString()}`;
}

function buildMarketingUrl(filters: AnalyticsFilterState): string {
  const params = new URLSearchParams({
    global: serializeOverviewRangeParam(filters.global),
    sectionSource: serializeOverviewRangeParam(filters.sectionSource),
    widgetLeadsBySource: serializeOverviewRangeParam(filters.widgetLeadsBySource),
    widgetConversionsBySource: serializeOverviewRangeParam(filters.widgetConversionsBySource),
  });
  return `/api/analytics/marketing?${params.toString()}`;
}

function buildLossUrl(filters: AnalyticsFilterState): string {
  const params = new URLSearchParams({
    global: serializeOverviewRangeParam(filters.global),
    sectionLoss: serializeOverviewRangeParam(filters.sectionLoss),
    widgetLostByReason: serializeOverviewRangeParam(filters.widgetLostByReason),
    widgetStagesBeforeLoss: serializeOverviewRangeParam(filters.widgetStagesBeforeLoss),
    widgetLossOverTime: serializeOverviewRangeParam(filters.widgetLossOverTime),
    widgetLostBySource: serializeOverviewRangeParam(filters.widgetLostBySource),
    lossOverTimeMode: filters.lossOverTimeMode,
  });
  return `/api/analytics/loss-analysis?${params.toString()}`;
}

export function useAnalyticsEveryday(enabled: boolean, filters: AnalyticsFilterState) {
  return useSWR<EverydayPayload>(enabled ? buildEverydayUrl(filters) : null, fetcher, {
    keepPreviousData: true,
  });
}

export function useAnalyticsMarketing(enabled: boolean, filters: AnalyticsFilterState) {
  return useSWR<MarketingPayload>(enabled ? buildMarketingUrl(filters) : null, fetcher, {
    keepPreviousData: true,
  });
}

export function useAnalyticsLossAnalysis(enabled: boolean, filters: AnalyticsFilterState) {
  return useSWR<LossAnalysisPayload>(enabled ? buildLossUrl(filters) : null, fetcher, {
    keepPreviousData: true,
  });
}
