/**
 * Unit tests for buildLeadsQueryString.
 */
import { describe, expect, it } from 'vitest';
import { buildLeadsQueryString } from '@/lib/ui/build-leads-query-string';
import { DEFAULT_EXTENDED_LIST_FILTER_FIELDS } from '@/lib/ui/list-filter-types';

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
      filters: { funnel_status: 'yeni', sla_status: 'breached', message_from: 'whatsapp' },
    });
    expect(qs).toContain('filter%5Bfunnel_status%5D%5Beq%5D=yeni');
    expect(qs).toContain('filter%5Bsla_status%5D%5Beq%5D=breached');
    expect(qs).toContain('filter%5Bmessage_from%5D%5Beq%5D=whatsapp');
  });

  it('includes university filter as ilike partial match', () => {
    const qs = buildLeadsQueryString({
      filters: { university: 'Bogazici' },
    });
    expect(qs).toContain('filter%5Buniversity%5D%5Bilike%5D=%25Bogazici%25');
  });

  it('includes date range gte/lte', () => {
    const qs = buildLeadsQueryString({
      dateFilters: [{ field: 'created_at', from: '2026-01-01', to: '2026-12-31' }],
    });
    expect(qs).toContain('filter%5Bcreated_at%5D%5Bgte%5D=2026-01-01');
    expect(qs).toContain('filter%5Bcreated_at%5D%5Blte%5D=2026-12-31');
  });

  it('includes mine flag when enabled', () => {
    const qs = buildLeadsQueryString({ mine: true });
    expect(qs).toContain('mine=1');
  });

  it('includes gender and budget extended filters', () => {
    const qs = buildLeadsQueryString({
      filters: { student_gender: 'female' },
      extended: {
        ...DEFAULT_EXTENDED_LIST_FILTER_FIELDS,
        budgetMin: '5000',
        budgetMax: '15000',
        lastContactFrom: '2026-01-01',
      },
      dateFilters: [
        {
          field: 'last_contact_at',
          from: '2026-01-01T00:00:00Z',
          to: '2026-01-31T23:59:59Z',
        },
      ],
    });
    expect(qs).toContain('filter%5Bstudent_gender%5D%5Beq%5D=female');
    expect(qs).toContain('filter%5Bbudget_min%5D%5Bgte%5D=5000');
    expect(qs).toContain('filter%5Bbudget_max%5D%5Blte%5D=15000');
  });

  it('includes unassigned and missing data filters', () => {
    const qs = buildLeadsQueryString({
      extended: {
        ...DEFAULT_EXTENDED_LIST_FILTER_FIELDS,
        unassignedOnly: true,
        missingUniversity: true,
        missingGender: true,
        hasRecHotel: 'yes',
      },
    });
    expect(qs).toContain('filter%5Bassigned_to%5D%5Bis%5D=null');
    expect(qs).toContain('filter%5Buniversity%5D%5Bis%5D=null');
    expect(qs).toContain('filter%5Bstudent_gender%5D%5Bis%5D=null');
    expect(qs).toContain('filter%5Brec_hotel%5D%5Bis%5D=not.null');
  });

  it('includes dorm awaiting overlap filter', () => {
    const qs = buildLeadsQueryString({
      extended: {
        ...DEFAULT_EXTENDED_LIST_FILTER_FIELDS,
        dormAwaiting: ['kyk-sonuc-bekliyor'],
      },
    });
    expect(qs).toContain('filter%5Bdorm_awaiting%5D%5Bov%5D');
  });
});
