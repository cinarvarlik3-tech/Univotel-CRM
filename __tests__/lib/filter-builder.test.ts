/**
 * Unit tests for filter builder whitelist validation.
 */
import { describe, expect, it } from 'vitest';
import { parseFilterParams, validateFilters } from '@/lib/query/filter-builder';

describe('filter-builder', () => {
  it('parses filter query params', () => {
    const filters = parseFilterParams({
      'filter[funnel_status][eq]': 'yeni',
      'filter[sla_status][eq]': 'breached',
    });
    expect(filters).toHaveLength(2);
    expect(filters[0]).toEqual({ field: 'funnel_status', operator: 'eq', value: 'yeni' });
  });

  it('rejects unknown column with error', () => {
    const filters = parseFilterParams({ 'filter[unknown_field][eq]': 'value' });
    const result = validateFilters(filters);
    expect(result).toEqual({ error: 'Unknown filter field: unknown_field' });
  });

  it('accepts valid filters', () => {
    const filters = parseFilterParams({ 'filter[lead_phone][ilike]': '%532%' });
    expect(validateFilters(filters)).toBeNull();
  });

  it('rejects unknown operator', () => {
    const filters = [{ field: 'funnel_status', operator: 'regex', value: 'yeni' }];
    expect(validateFilters(filters)).toEqual({ error: 'Unknown filter operator: regex' });
  });
});
