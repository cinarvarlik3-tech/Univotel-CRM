/**
 * Unit tests for attribution confidence decision trees.
 */
import { describe, expect, it } from 'vitest';
import {
  computeAttributionConfidence,
  recomputeAfterGa4Attempt,
} from '@/lib/attribution/compute-confidence';

describe('computeAttributionConfidence', () => {
  it('returns full confidence for Meta ad_id path', () => {
    const result = computeAttributionConfidence({
      ref_code: null,
      ga4_enriched: false,
      ga4_fetch_attempts: 0,
      ad_id: '123',
      called_number: null,
      dniSource: null,
      channel: 'whatsapp',
      hasUtm: false,
      refSessionFound: false,
    });
    expect(result.source_confidence).toBe('full');
    expect(result.path_lost_at).toBe('full');
  });

  it('returns inferred for DNI netgsm path', () => {
    const result = computeAttributionConfidence({
      ref_code: null,
      ga4_enriched: false,
      ga4_fetch_attempts: 0,
      ad_id: null,
      called_number: '+908501234567',
      dniSource: 'google-ads',
      channel: 'netgsm_call',
      hasUtm: false,
      refSessionFound: false,
    });
    expect(result.source_confidence).toBe('inferred');
    expect(result.path_lost_at).toBe('lost_at_source');
  });

  it('returns lost_at_session after GA4 give-up', () => {
    const result = recomputeAfterGa4Attempt(
      {
        ref_code: 'UV-ABCD',
        ga4_enriched: false,
        ga4_fetch_attempts: 4,
        ad_id: null,
        called_number: null,
        channel: 'whatsapp',
        utm_source: 'google',
        utm_medium: 'cpc',
        utm_campaign: null,
      },
      null,
      true,
    );
    expect(result.source_confidence).toBe('inferred');
    expect(result.path_lost_at).toBe('lost_at_session');
  });
});
