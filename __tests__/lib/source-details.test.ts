/**
 * Unit tests for source_details builder — ensures all keys always present.
 */
import { describe, expect, it } from 'vitest';
import {
  SOURCE_DETAILS_KEYS,
  buildChatwootSourceDetails,
  buildManualSourceDetails,
  buildWhatsAppCallSourceDetails,
} from '@/lib/leads/source-details';

describe('source_details builder', () => {
  it('buildChatwootSourceDetails includes all keys', () => {
    const result = buildChatwootSourceDetails(
      { channel: 'whatsapp', externalId: 'conv_1_msg_1' },
      false,
    );
    for (const key of SOURCE_DETAILS_KEYS) {
      expect(result).toHaveProperty(key);
    }
  });

  it('buildWhatsAppCallSourceDetails includes all keys with nulls', () => {
    const result = buildWhatsAppCallSourceDetails({ externalId: 'call_1' }, false);
    expect(result.channel).toBe('whatsapp_call');
    expect(result.call_duration).toBeNull();
    expect(Object.keys(result).length).toBe(SOURCE_DETAILS_KEYS.length);
  });

  it('buildManualSourceDetails sets normalization_failed', () => {
    const result = buildManualSourceDetails(true);
    expect(result.normalization_failed).toBe(true);
    expect(result.utm_source).toBeNull();
  });
});
