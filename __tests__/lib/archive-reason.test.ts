/**
 * Tests for archive reason mapping from funnel status.
 */
import { describe, expect, it } from 'vitest';
import { mapArchiveReasonFromFunnel } from '@/lib/leads/archive';

describe('mapArchiveReasonFromFunnel', () => {
  it('maps signed contract to won', () => {
    expect(mapArchiveReasonFromFunnel('sozlesme-imzalandi')).toBe('won');
  });

  it('maps lost status to lost', () => {
    expect(mapArchiveReasonFromFunnel('lost')).toBe('lost');
  });

  it('returns null for non-terminal statuses', () => {
    expect(mapArchiveReasonFromFunnel('yeni')).toBeNull();
    expect(mapArchiveReasonFromFunnel('ziyaret')).toBeNull();
  });
});
