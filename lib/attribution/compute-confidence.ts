/**
 * source_confidence and path_lost_at decision trees for Phase 4 attribution.
 */
import type { ConfidenceContext, PathLostAt, SourceConfidence } from '@/lib/attribution/types';

/** Result of attribution confidence computation. */
export interface ConfidenceResult {
  source_confidence: SourceConfidence;
  path_lost_at: PathLostAt;
}

/**
 * Computes source_confidence and path_lost_at from webhook + enrichment context.
 * @param ctx - Attribution signals available at compute time.
 * @returns Confidence and funnel drop-off classification.
 */
export function computeAttributionConfidence(ctx: ConfidenceContext): ConfidenceResult {
  const source_confidence = computeSourceConfidence(ctx);
  const path_lost_at = computePathLostAt(ctx, source_confidence);
  return { source_confidence, path_lost_at };
}

/**
 * Applies the source_confidence decision tree from Phase 4 spec section 9.1.
 * @param ctx - Attribution context.
 * @returns source_confidence value.
 */
function computeSourceConfidence(ctx: ConfidenceContext): SourceConfidence {
  if (ctx.ref_code) {
    if (ctx.ga4_enriched) return 'full';
    if (ctx.ga4_fetch_attempts >= 4) return 'inferred';
    if (ctx.refSessionFound || ctx.hasUtm) return 'full';
    return 'full';
  }

  if (ctx.ad_id) return 'full';

  if (ctx.called_number && ctx.dniSource) return 'inferred';

  if (ctx.channel) return 'lossy';

  return 'unknown';
}

/**
 * Applies the path_lost_at decision tree from Phase 4 spec section 9.2.
 * @param ctx - Attribution context.
 * @param source_confidence - Already computed confidence.
 * @returns path_lost_at value.
 */
function computePathLostAt(
  ctx: ConfidenceContext,
  source_confidence: SourceConfidence,
): PathLostAt {
  if (source_confidence === 'full' && ctx.ga4_enriched) return 'full';

  if (ctx.ref_code && ctx.ga4_fetch_attempts >= 4 && !ctx.ga4_enriched) {
    return 'lost_at_session';
  }

  if (ctx.called_number && ctx.dniSource) return 'lost_at_source';

  if (source_confidence === 'lossy') return 'lost_at_channel';

  if (source_confidence === 'unknown') return 'unknown';

  if (ctx.ref_code && !ctx.ga4_enriched) return 'full';

  if (ctx.ad_id) return 'full';

  return 'unknown';
}

/**
 * Recomputes confidence after GA4 enrichment attempt completes or gives up.
 * @param row - Current collected_data attribution fields.
 * @param dniSource - Matched DNI source if any.
 * @param refSessionFound - Whether ref_sessions lookup succeeded.
 * @returns Updated confidence pair.
 */
export function recomputeAfterGa4Attempt(
  row: {
    ref_code: string | null;
    ga4_enriched: boolean;
    ga4_fetch_attempts: number;
    ad_id: string | null;
    called_number: string | null;
    channel: ConfidenceContext['channel'];
    utm_source: string | null;
    utm_medium: string | null;
    utm_campaign: string | null;
  },
  dniSource: string | null,
  refSessionFound: boolean,
): ConfidenceResult {
  return computeAttributionConfidence({
    ref_code: row.ref_code,
    ga4_enriched: row.ga4_enriched,
    ga4_fetch_attempts: row.ga4_fetch_attempts,
    ad_id: row.ad_id,
    called_number: row.called_number,
    dniSource,
    channel: row.channel,
    hasUtm: Boolean(row.utm_source || row.utm_medium || row.utm_campaign),
    refSessionFound,
  });
}
