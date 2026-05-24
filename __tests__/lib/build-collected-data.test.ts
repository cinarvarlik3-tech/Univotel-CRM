/**
 * Unit tests for collected_data ↔ source_details field parity.
 */
import { describe, expect, it } from 'vitest';
import { collectedDataToSourceDetails } from '@/lib/attribution/build-collected-data';
import { SOURCE_DETAILS_KEYS } from '@/lib/leads/source-details';

describe('collectedDataToSourceDetails', () => {
  it('maps collected_data fields to source_details keys', () => {
    const result = collectedDataToSourceDetails(
      {
        lead_uuid: 'uuid-1',
        channel: 'whatsapp',
        external_id: 'conv_1',
        ref_code: 'UV-ABCD',
        utm_source: 'google',
        utm_medium: 'cpc',
        utm_campaign: 'test',
        utm_content: null,
        landing_page: '/fiyatlar',
        referral_domain: null,
        session_start: null,
        session_duration: null,
        click_event: null,
        ga4_session_id: null,
        ad_id: null,
        campaign_id: null,
        adset_id: null,
        placement: null,
        called_number: null,
        call_duration: null,
        chatwoot_url: 'https://example.com',
        is_organic: false,
        normalization_failed: false,
        source_confidence: 'full',
        path_lost_at: 'full',
        ga4_enriched: false,
        ga4_enriched_at: null,
        ga4_fetch_attempts: 0,
      },
      null,
    );

    expect(result.ref_code).toBe('UV-ABCD');
    expect(result.source_confidence).toBe('full');
    expect(result.path_lost_at).toBe('full');
    for (const key of SOURCE_DETAILS_KEYS) {
      expect(result).toHaveProperty(key);
    }
  });
});
