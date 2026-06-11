/**
 * Unit tests for the salesperson shift-hours gate (Istanbul local time, UTC+3).
 */
import { describe, expect, it } from 'vitest';
import { isWithinShift } from '@/lib/notifications/shift';

// Istanbul is UTC+3 year-round, so 06:00Z == 09:00 Istanbul.
const at = (utc: string) => new Date(utc);

describe('isWithinShift', () => {
  it('is inside a daytime shift at the start boundary', () => {
    expect(isWithinShift('09:00', '18:00', at('2026-06-05T06:00:00Z'))).toBe(true);
  });

  it('is outside before the shift starts', () => {
    expect(isWithinShift('09:00', '18:00', at('2026-06-05T05:59:00Z'))).toBe(false);
  });

  it('treats the end boundary as exclusive', () => {
    expect(isWithinShift('09:00', '18:00', at('2026-06-05T15:00:00Z'))).toBe(false);
  });

  it('handles seconds in the time string', () => {
    expect(isWithinShift('09:00:00', '18:00:00', at('2026-06-05T10:00:00Z'))).toBe(true);
  });

  it('handles overnight shifts wrapping midnight', () => {
    // 22:00–06:00 Istanbul
    expect(isWithinShift('22:00', '06:00', at('2026-06-05T20:00:00Z'))).toBe(true); // 23:00
    expect(isWithinShift('22:00', '06:00', at('2026-06-05T02:00:00Z'))).toBe(true); // 05:00
    expect(isWithinShift('22:00', '06:00', at('2026-06-05T04:00:00Z'))).toBe(false); // 07:00
  });

  it('opens the gate when bounds are missing or unparseable', () => {
    expect(isWithinShift(null, '18:00', at('2026-06-05T00:00:00Z'))).toBe(true);
    expect(isWithinShift('09:00', undefined, at('2026-06-05T00:00:00Z'))).toBe(true);
    expect(isWithinShift('09:00', '09:00', at('2026-06-05T00:00:00Z'))).toBe(true);
  });
});
