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

  it('includes eq filters for enum fields', () => {
    const qs = buildLeadsQueryString({
      fieldFilters: {
        funnel_status: { mode: 'match', value: 'yeni' },
        sla_status: { mode: 'match', value: 'breached' },
        message_from: { mode: 'match', value: 'whatsapp' },
      },
    });
    expect(qs).toContain('filter%5Bfunnel_status%5D%5Beq%5D=yeni');
    expect(qs).toContain('filter%5Bsla_status%5D%5Beq%5D=breached');
    expect(qs).toContain('filter%5Bmessage_from%5D%5Beq%5D=whatsapp');
  });

  it('includes university filter as ilike partial match when fuzzy', () => {
    const qs = buildLeadsQueryString({
      fieldFilters: {
        university: { mode: 'match', value: 'Bogazici', fuzzy: true },
      },
    });
    expect(qs).toContain('filter%5Buniversity%5D%5Bilike%5D=%25Bogazici%25');
  });

  it('includes university eq when fuzzy disabled', () => {
    const qs = buildLeadsQueryString({
      fieldFilters: {
        university: { mode: 'match', value: 'Bogazici University', fuzzy: false },
      },
    });
    expect(qs).toContain('filter%5Buniversity%5D%5Beq%5D=Bogazici+University');
  });

  it('includes date range gte/lte from sistem shortcuts', () => {
    const qs = buildLeadsQueryString({
      createdFrom: '2026-01-01',
      createdTo: '2026-12-31',
    });
    expect(qs).toContain('filter%5Bcreated_at%5D%5Bgte%5D=2026-01-01T00%3A00%3A00Z');
    expect(qs).toContain('filter%5Bcreated_at%5D%5Blte%5D=2026-12-31T23%3A59%3A59Z');
  });

  it('includes per-field created_at comparison in detay', () => {
    const qs = buildLeadsQueryString({
      fieldFilters: {
        created_at: { mode: 'match', operator: 'gte', value: '2026-06-01' },
      },
    });
    expect(qs).toContain('filter%5Bcreated_at%5D%5Bgte%5D=2026-06-01');
  });

  it('includes mine flag when enabled', () => {
    const qs = buildLeadsQueryString({ mine: true });
    expect(qs).toContain('mine=1');
  });

  it('includes gender and budget field filters', () => {
    const qs = buildLeadsQueryString({
      fieldFilters: {
        student_gender: { mode: 'match', value: 'female' },
        budget_tier: { mode: 'match', value: 'yuksek-butce' },
      },
      lastContactFrom: '2026-01-01',
      lastContactTo: '2026-01-31',
    });
    expect(qs).toContain('filter%5Bstudent_gender%5D%5Beq%5D=female');
    expect(qs).toContain('filter%5Bbudget_tier%5D%5Beq%5D=yuksek-butce');
    expect(qs).toContain('filter%5Blast_contact_at%5D%5Bgte%5D=2026-01-01T00%3A00%3A00Z');
  });

  it('includes filled and empty filters', () => {
    const qs = buildLeadsQueryString({
      fieldFilters: {
        assigned_to: { mode: 'empty' },
        university: { mode: 'filled' },
        rec_hotel: { mode: 'match', value: 'yes' },
      },
    });
    expect(qs).toContain('filter%5Bassigned_to%5D%5Bis%5D=null');
    expect(qs).toContain('filter%5Buniversity%5D%5Bis%5D=not.null');
    expect(qs).toContain('filter%5Brec_hotel%5D%5Bis%5D=not.null');
  });

  it('includes dorm awaiting overlap filter', () => {
    const qs = buildLeadsQueryString({
      fieldFilters: {
        dorm_awaiting: { mode: 'match', values: ['kyk-sonuc-bekliyor'] },
      },
    });
    expect(qs).toContain('filter%5Bdorm_awaiting%5D%5Bov%5D');
  });

  it('skips funnel_status in pipeline mode', () => {
    const qs = buildLeadsQueryString({
      fieldFilters: {
        funnel_status: { mode: 'match', value: 'yeni' },
        persona_type: { mode: 'match', value: 'ogrenci' },
      },
      skipFields: new Set(['funnel_status']),
    });
    expect(qs).not.toContain('funnel_status');
    expect(qs).toContain('filter%5Bpersona_type%5D%5Beq%5D=ogrenci');
  });

  it('forces deal_awaiting false for pipeline', () => {
    const qs = buildLeadsQueryString({
      forceFieldFilters: {
        deal_awaiting: { mode: 'match', value: 'false' },
      },
    });
    expect(qs).toContain('filter%5Bdeal_awaiting%5D%5Beq%5D=false');
  });
});
