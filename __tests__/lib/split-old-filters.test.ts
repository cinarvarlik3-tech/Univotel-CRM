/**
 * Unit tests for splitOldFilters.
 */
import { describe, expect, it } from 'vitest';
import { requiresOldLeadDetailsJoin, splitOldFilters } from '@/lib/query/split-old-filters';

describe('splitOldFilters', () => {
  it('splits table vs details filters', () => {
    const result = splitOldFilters([
      { field: 'lead_source', operator: 'eq', value: 'whatsapp' },
      { field: 'university', operator: 'eq', value: 'ITU' },
      { field: 'message_from', operator: 'eq', value: 'instagram' },
    ]);

    expect(result.oldLeads).toHaveLength(2);
    expect(result.oldLeadDetails).toHaveLength(1);
    expect(result.oldLeadDetails[0]?.field).toBe('university');
  });

  it('detects details join requirement', () => {
    expect(
      requiresOldLeadDetailsJoin([{ field: 'student_gender', operator: 'eq', value: 'male' }]),
    ).toBe(true);
    expect(
      requiresOldLeadDetailsJoin([{ field: 'funnel_status', operator: 'eq', value: 'yeni' }]),
    ).toBe(false);
  });
});
