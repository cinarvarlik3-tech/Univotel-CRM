/**
 * Unit tests for resolvePerformanceRange — pure date math, no DB.
 */
import { describe, expect, it, vi, afterEach, beforeEach } from 'vitest';
import { resolvePerformanceRange } from '@/lib/my-day/performance';

// Fix "now" to 2026-06-11 Thursday 12:00 Istanbul (09:00 UTC).
const FIXED_NOW = new Date('2026-06-11T09:00:00Z');

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(FIXED_NOW);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('resolvePerformanceRange', () => {
  it('defaults to this_week when rangeParam is undefined', () => {
    const { from, to } = resolvePerformanceRange(undefined);
    // Week starts Monday 2026-06-08 00:00 Istanbul = 2026-06-07T21:00:00Z
    expect(from.toISOString()).toBe('2026-06-07T21:00:00.000Z');
    // Today end = 2026-06-11T20:59:59.999Z
    expect(to.toISOString()).toBe('2026-06-11T20:59:59.999Z');
  });

  it('returns this week range for this_week', () => {
    const { from, to } = resolvePerformanceRange('this_week');
    expect(from.toISOString()).toBe('2026-06-07T21:00:00.000Z');
    expect(to.toISOString()).toBe('2026-06-11T20:59:59.999Z');
  });

  it('returns month range for this_month', () => {
    const { from, to } = resolvePerformanceRange('this_month');
    // First day of June 2026 in Istanbul = 2026-06-01T00:00:00+03:00 = 2026-05-31T21:00:00Z
    expect(from.toISOString()).toBe('2026-05-31T21:00:00.000Z');
    // Today end unchanged
    expect(to.toISOString()).toBe('2026-06-11T20:59:59.999Z');
  });

  it('from is always before to', () => {
    for (const p of [undefined, 'this_week', 'this_month']) {
      const { from, to } = resolvePerformanceRange(p);
      expect(from.getTime()).toBeLessThan(to.getTime());
    }
  });

  it('week from is within this_month from', () => {
    const week = resolvePerformanceRange('this_week');
    const month = resolvePerformanceRange('this_month');
    expect(month.from.getTime()).toBeLessThanOrEqual(week.from.getTime());
  });
});
