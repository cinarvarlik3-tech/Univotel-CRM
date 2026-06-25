/**
 * Marketing tab analytics payload — source attribution.
 */
import { createServiceClient } from '@/lib/supabase/service';
import { resolveEffectiveRange, type OverviewRangeSelection } from '@/lib/analytics/overview-range';
import {
  initSourceCounts,
  resolveSourceBucket,
  sourceBucketCardCount,
  SOURCE_BUCKET_IDS,
} from '@/lib/analytics/source-buckets';
import { fetchAllRows } from '@/lib/analytics/overview-shared';

export interface MarketingQueryParams {
  global: OverviewRangeSelection;
  sectionSource: OverviewRangeSelection;
  widgetLeadsBySource: OverviewRangeSelection;
  widgetConversionsBySource: OverviewRangeSelection;
}

export interface MarketingPayload {
  cards: ReturnType<typeof initSourceCounts>;
  leadsBySource: Array<{ id: string; count: number }>;
  conversionsBySource: Array<{ id: string; count: number }>;
}

export async function getMarketingPayload(params: MarketingQueryParams): Promise<MarketingPayload> {
  const client = createServiceClient();
  const rangeCards = resolveEffectiveRange(params.global, params.sectionSource);
  const rangeLeadsBySource = resolveEffectiveRange(
    params.global,
    params.sectionSource,
    params.widgetLeadsBySource,
  );
  const rangeConversionsBySource = resolveEffectiveRange(
    params.global,
    params.sectionSource,
    params.widgetConversionsBySource,
  );

  const [leadsForCards, leadsForSourcePie, leadsForConversionsPie, convertedLeadUuids] =
    await Promise.all([
      fetchAllRows<{ uuid: string; lead_source: string | null }>((a, b) =>
        client
          .from('leads')
          .select('uuid, lead_source')
          .eq('is_deleted', false)
          .gte('created_at', rangeCards.from.toISOString())
          .lte('created_at', rangeCards.to.toISOString())
          .range(a, b),
      ),
      fetchAllRows<{ uuid: string; lead_source: string | null }>((a, b) =>
        client
          .from('leads')
          .select('uuid, lead_source')
          .eq('is_deleted', false)
          .gte('created_at', rangeLeadsBySource.from.toISOString())
          .lte('created_at', rangeLeadsBySource.to.toISOString())
          .range(a, b),
      ),
      fetchAllRows<{ uuid: string; lead_source: string | null }>((a, b) =>
        client
          .from('leads')
          .select('uuid, lead_source')
          .eq('is_deleted', false)
          .gte('created_at', rangeConversionsBySource.from.toISOString())
          .lte('created_at', rangeConversionsBySource.to.toISOString())
          .range(a, b),
      ),
      fetchAllRows<{ lead_uuid: string }>((a, b) =>
        client
          .from('lead_stage_history')
          .select('lead_uuid')
          .eq('to_status', 'sozlesme-imzalandi')
          .range(a, b),
      ),
    ]);

  const sourceCards = initSourceCounts();
  const leadsBySourceMap = initSourceCounts();
  for (const lead of leadsForCards) {
    const bucket = resolveSourceBucket(lead.lead_source);
    sourceCards[bucket]++;
  }
  for (const lead of leadsForSourcePie) {
    leadsBySourceMap[resolveSourceBucket(lead.lead_source)]++;
  }
  for (const bucketId of SOURCE_BUCKET_IDS) {
    sourceCards[bucketId] = sourceBucketCardCount(bucketId, sourceCards[bucketId]);
  }

  const convertedSet = new Set(convertedLeadUuids.map((r) => r.lead_uuid));
  const conversionsBySourceMap = initSourceCounts();
  for (const lead of leadsForConversionsPie) {
    if (!convertedSet.has(lead.uuid)) continue;
    conversionsBySourceMap[resolveSourceBucket(lead.lead_source)]++;
  }

  return {
    cards: sourceCards,
    leadsBySource: SOURCE_BUCKET_IDS.map((bucketId) => ({
      id: bucketId,
      count: sourceBucketCardCount(bucketId, leadsBySourceMap[bucketId]),
    })).filter((s) => s.count > 0),
    conversionsBySource: SOURCE_BUCKET_IDS.map((bucketId) => ({
      id: bucketId,
      count: sourceBucketCardCount(bucketId, conversionsBySourceMap[bucketId]),
    })).filter((s) => s.count > 0),
  };
}
