/**
 * Unit tests for phone display helpers.
 */
import { describe, expect, it } from 'vitest';
import { displayLeadContactIdentifier, displayLeadPhone } from '@/lib/ui/display-phone';

describe('displayLeadPhone', () => {
  it('returns lead_phone when normalization succeeded', () => {
    expect(
      displayLeadPhone({
        lead_phone: '05321234567',
        source_details: { normalization_failed: false },
      }),
    ).toBe('05321234567');
  });

  it('returns raw_phone when normalization failed', () => {
    expect(
      displayLeadPhone({
        lead_phone: '05321234567',
        source_details: {
          normalization_failed: true,
          raw_phone: '+44 7700 900123',
        },
      }),
    ).toBe('+44 7700 900123');
  });

  it('falls back to lead_phone when raw_phone is missing', () => {
    expect(
      displayLeadPhone({
        lead_phone: 'invalid-input',
        source_details: { normalization_failed: true },
      }),
    ).toBe('invalid-input');
  });
});

describe('displayLeadContactIdentifier', () => {
  it('prefixes @ for instagram leads', () => {
    expect(
      displayLeadContactIdentifier({
        lead_phone: 'student.user',
        message_from: 'instagram',
      }),
    ).toBe('@student.user');
  });

  it('uses phone display for whatsapp leads', () => {
    expect(
      displayLeadContactIdentifier({
        lead_phone: '05321234567',
        message_from: 'whatsapp',
        source_details: { normalization_failed: false },
      }),
    ).toBe('05321234567');
  });
});
