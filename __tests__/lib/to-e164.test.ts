import { describe, expect, it } from 'vitest';
import { normalizePhone, toE164 } from '@/lib/leads/normalize-phone';

describe('toE164', () => {
  it('converts 05xxxxxxxxx to +905xxxxxxxxx', () => {
    const { phone } = normalizePhone('0532 000 00 00');
    expect(toE164(phone)).toBe('+905320000000');
  });

  it('returns null for invalid normalized phone', () => {
    expect(toE164('invalid')).toBeNull();
  });
});
