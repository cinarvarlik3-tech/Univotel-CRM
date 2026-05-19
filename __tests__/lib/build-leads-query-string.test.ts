/**
 * Unit tests for buildLeadsQueryString.
 */
import { describe, expect, it } from 'vitest';
import { buildLeadsQueryString } from '@/lib/ui/build-leads-query-string';

describe('buildLeadsQueryString', () => {
  it('includes default sort and limit', () => {
    const qs = buildLeadsQueryString({});
    expect(qs).toContain('sort=created_at');
    expect(qs).toContain('limit=50');
  });

  it('includes cursor when provided', () => {
    const qs = buildLeadsQueryString({ cursor: '2026-05-01T12:00:00Z' });
    expect(qs).toContain('cursor=2026-05-01T12%3A00%3A00Z');
  });

  it('includes search param instead of ilike filter', () => {
    const qs = buildLeadsQueryString({ search: 'ahmet' });
    expect(qs).toContain('search=ahmet');
    expect(qs).not.toContain('lead_name');
  });

  it('includes fuzzy flag when enabled', () => {
    const qs = buildLeadsQueryString({ search: 'ahmet', fuzzy: true });
    expect(qs).toContain('fuzzy=1');
  });

  it('includes eq filters for whitelisted fields', () => {
    const qs = buildLeadsQueryString({
      filters: { funnel_status: 'yeni', sla_status: 'breached' },
    });
    expect(qs).toContain('filter%5Bfunnel_status%5D%5Beq%5D=yeni');
    expect(qs).toContain('filter%5Bsla_status%5D%5Beq%5D=breached');
  });

  it('includes university filter for lead_details', () => {
    const qs = buildLeadsQueryString({
      filters: { university: 'Bogazici' },
    });
    expect(qs).toContain('filter%5Buniversity%5D%5Beq%5D=Bogazici');
  });

  it('includes date range gte/lte', () => {
    const qs = buildLeadsQueryString({
      dateFilters: [{ field: 'created_at', from: '2026-01-01', to: '2026-12-31' }],
    });
    expect(qs).toContain('filter%5Bcreated_at%5D%5Bgte%5D=2026-01-01');
    expect(qs).toContain('filter%5Bcreated_at%5D%5Blte%5D=2026-12-31');
  });
});
