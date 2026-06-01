/**
 * Unit tests for SLA deadline calculation.
 */
import { describe, expect, it, vi, afterEach } from 'vitest';
import { calculateSlaDeadline, getSlaStartTime, isWithinSlaBusinessHours } from '@/lib/leads/sla';
import * as constants from '@/lib/constants';

describe('isWithinSlaBusinessHours', () => {
  it('returns true during business hours', () => {
    expect(isWithinSlaBusinessHours(new Date('2026-05-01T07:00:00Z'))).toBe(true); // 10:00 Istanbul
  });

  it('returns false before 09:00 Istanbul', () => {
    expect(isWithinSlaBusinessHours(new Date('2026-05-01T04:00:00Z'))).toBe(false); // 07:00 Istanbul
  });

  it('returns false at and after 17:00 Istanbul', () => {
    expect(isWithinSlaBusinessHours(new Date('2026-05-01T14:00:00Z'))).toBe(false); // 17:00 Istanbul
    expect(isWithinSlaBusinessHours(new Date('2026-05-01T15:00:00Z'))).toBe(false); // 18:00 Istanbul
  });
});

describe('getSlaStartTime', () => {
  it('returns createdAt when lead arrives during business hours', () => {
    const createdAt = new Date('2026-05-01T07:00:00Z'); // 10:00 Istanbul
    expect(getSlaStartTime(createdAt).getTime()).toBe(createdAt.getTime());
  });

  it('defers to same-day 09:00 when lead arrives before business hours', () => {
    const createdAt = new Date('2026-05-01T04:00:00Z'); // 07:00 Istanbul
    expect(getSlaStartTime(createdAt).toISOString()).toBe('2026-05-01T06:00:00.000Z'); // 09:00 Istanbul
  });

  it('defers to next-day 09:00 when lead arrives after business hours', () => {
    const createdAt = new Date('2026-05-01T15:00:00Z'); // 18:00 Istanbul
    expect(getSlaStartTime(createdAt).toISOString()).toBe('2026-05-02T06:00:00.000Z');
  });

  it('defers leads arriving exactly at 17:00 Istanbul', () => {
    const createdAt = new Date('2026-05-01T14:00:00Z'); // 17:00 Istanbul
    expect(getSlaStartTime(createdAt).toISOString()).toBe('2026-05-02T06:00:00.000Z');
  });
});

describe('calculateSlaDeadline', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns 1 hour deadline from creation during business hours', () => {
    const createdAt = new Date('2026-05-01T07:00:00Z'); // 10:00 Istanbul
    const result = calculateSlaDeadline('netgsm_call', createdAt);
    expect(result.deadline.getTime()).toBe(createdAt.getTime() + 60 * 60 * 1000);
  });

  it('uses same 1 hour SLA for all lead sources', () => {
    const createdAt = new Date('2026-05-01T07:00:00Z');
    const whatsapp = calculateSlaDeadline('whatsapp', createdAt);
    const manual = calculateSlaDeadline('manual', createdAt);
    expect(whatsapp.deadline.getTime()).toBe(manual.deadline.getTime());
  });

  it('defers deadline when lead arrives before 09:00', () => {
    const createdAt = new Date('2026-05-01T04:00:00Z'); // 07:00 Istanbul
    const result = calculateSlaDeadline('whatsapp', createdAt);
    expect(result.deadline.toISOString()).toBe('2026-05-01T07:00:00.000Z'); // 10:00 Istanbul
  });

  it('defers deadline when lead arrives after 17:00', () => {
    const createdAt = new Date('2026-05-01T15:00:00Z'); // 18:00 Istanbul
    const result = calculateSlaDeadline('whatsapp', createdAt);
    expect(result.deadline.toISOString()).toBe('2026-05-02T07:00:00.000Z'); // next day 10:00 Istanbul
  });

  it('applies peak season override when active', () => {
    vi.spyOn(constants, 'isPeakSeasonActive').mockReturnValue(true);
    const createdAt = new Date('2026-05-01T07:00:00Z');
    const result = calculateSlaDeadline('whatsapp', createdAt);
    expect(result.deadline.getTime()).toBe(
      createdAt.getTime() + constants.PEAK_SEASON_SLA_MINUTES * 60 * 1000,
    );
  });
});
