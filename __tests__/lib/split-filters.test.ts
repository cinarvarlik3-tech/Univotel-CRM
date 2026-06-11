/**
 * Unit tests for splitFilters.
 */
import { describe, expect, it } from 'vitest';
import { requiresLeadDetailsJoin, splitFilters } from '@/lib/query/split-filters';

describe('splitFilters', () => {
  it('splits university to leadDetails', () => {
    const result = splitFilters([
      { field: 'funnel_status', operator: 'eq', value: 'yeni' },
      { field: 'university', operator: 'eq', value: 'Bogazici' },
    ]);
    expect(result.leads).toHaveLength(1);
    expect(result.leadDetails).toHaveLength(1);
    expect(result.leadDetails[0].field).toBe('university');
  });

  it('keeps lead_score on leads', () => {
    const result = splitFilters([{ field: 'lead_score', operator: 'gte', value: '50' }]);
    expect(result.leads).toHaveLength(1);
    expect(result.leadDetails).toHaveLength(0);
  });

  it('detects join requirement', () => {
    expect(
      requiresLeadDetailsJoin([{ field: 'budget_tier', operator: 'eq', value: 'ortalama' }]),
    ).toBe(true);
    expect(
      requiresLeadDetailsJoin([{ field: 'funnel_status', operator: 'eq', value: 'yeni' }]),
    ).toBe(false);
  });
});
