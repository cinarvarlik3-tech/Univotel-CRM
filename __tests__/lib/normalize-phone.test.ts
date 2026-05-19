/**
 * Unit tests for phone normalization logic.
 */
import { describe, expect, it } from 'vitest';
import { normalizePhone } from '@/lib/leads/normalize-phone';

describe('normalizePhone', () => {
  it('normalizes +90 prefix', () => {
    expect(normalizePhone('+905321234567')).toEqual({
      phone: '05321234567',
      failed: false,
    });
  });

  it('normalizes 90 prefix with 12 digits', () => {
    expect(normalizePhone('905321234567')).toEqual({
      phone: '05321234567',
      failed: false,
    });
  });

  it('normalizes 5 prefix with 10 digits', () => {
    expect(normalizePhone('5321234567')).toEqual({
      phone: '05321234567',
      failed: false,
    });
  });

  it('keeps valid 0 prefix', () => {
    expect(normalizePhone('05321234567')).toEqual({
      phone: '05321234567',
      failed: false,
    });
  });

  it('strips spaces and dashes', () => {
    expect(normalizePhone('0532 123 45 67')).toEqual({
      phone: '05321234567',
      failed: false,
    });
    expect(normalizePhone('0532-123-45-67')).toEqual({
      phone: '05321234567',
      failed: false,
    });
  });

  it('flags invalid numbers without blocking', () => {
    const result = normalizePhone('invalid');
    expect(result.failed).toBe(true);
    expect(result.phone).toBe('invalid');
  });
});
