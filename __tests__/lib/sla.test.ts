/**
 * Unit tests for SLA deadline calculation.
 */
import { describe, expect, it, vi, afterEach } from 'vitest';
import { calculateSlaDeadline } from '@/lib/leads/sla';
import * as constants from '@/lib/constants';

describe('calculateSlaDeadline', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns 5 min deadline for netgsm_call', () => {
    const createdAt = new Date('2026-05-01T10:00:00Z');
    const result = calculateSlaDeadline('netgsm_call', createdAt);
    expect(result.deadline.getTime()).toBe(createdAt.getTime() + 5 * 60 * 1000);
  });

  it('returns 30 min deadline for whatsapp', () => {
    const createdAt = new Date('2026-05-01T10:00:00Z');
    const result = calculateSlaDeadline('whatsapp', createdAt);
    expect(result.deadline.getTime()).toBe(createdAt.getTime() + 30 * 60 * 1000);
  });

  it('returns 8 hour deadline for manual', () => {
    const createdAt = new Date('2026-05-01T10:00:00Z');
    const result = calculateSlaDeadline('manual', createdAt);
    expect(result.deadline.getTime()).toBe(createdAt.getTime() + 480 * 60 * 1000);
  });

  it('applies peak season override when active', () => {
    vi.spyOn(constants, 'isPeakSeasonActive').mockReturnValue(true);
    const createdAt = new Date('2026-08-01T10:00:00Z');
    const result = calculateSlaDeadline('whatsapp', createdAt);
    expect(result.deadline.getTime()).toBe(
      createdAt.getTime() + constants.PEAK_SEASON_SLA_MINUTES * 60 * 1000,
    );
  });
});
