/**
 * Unit tests for DNI virtual number normalization.
 */
import { describe, expect, it } from 'vitest';
import {
  normalizeVirtualNumberDigits,
  virtualNumberToE164,
  virtualNumbersMatch,
} from '@/lib/dni/normalize-virtual-number';

describe('normalizeVirtualNumberDigits', () => {
  it('normalizes 0850 format to 90 prefix', () => {
    expect(normalizeVirtualNumberDigits('08501234567')).toBe('908501234567');
  });

  it('matches +90 and 0 prefixed numbers', () => {
    expect(virtualNumbersMatch('+908501234567', '08501234567')).toBe(true);
  });

  it('converts to E.164', () => {
    expect(virtualNumberToE164('08501234567')).toBe('+908501234567');
  });
});
