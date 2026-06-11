/**
 * Unit tests for buildOldLeadsQueryString.
 */
import { describe, expect, it } from 'vitest';
import { buildOldLeadsQueryString } from '@/lib/ui/build-old-leads-query-string';

describe('buildOldLeadsQueryString', () => {
  it('includes default sort and limit', () => {
    const qs = buildOldLeadsQueryString({});
    expect(qs).toContain('sort=created_at');
    expect(qs).toContain('limit=50');
  });

  it('includes channel filter for message_from', () => {
    const qs = buildOldLeadsQueryString({
      fieldFilters: {
        message_from: { mode: 'match', value: 'whatsapp' },
        funnel_status: { mode: 'match', value: 'yeni' },
      },
    });
    expect(qs).toContain('filter%5Bmessage_from%5D%5Beq%5D=whatsapp');
    expect(qs).toContain('filter%5Bfunnel_status%5D%5Beq%5D=yeni');
  });

  it('includes last_contact_at date range', () => {
    const qs = buildOldLeadsQueryString({
      lastContactFrom: '2026-01-01',
      lastContactTo: '2026-01-31',
    });
    expect(qs).toContain('filter%5Blast_contact_at%5D%5Bgte%5D=2026-01-01T00%3A00%3A00Z');
    expect(qs).toContain('filter%5Blast_contact_at%5D%5Blte%5D=2026-01-31T23%3A59%3A59Z');
  });

  it('includes student_gender filter for old_lead_details', () => {
    const qs = buildOldLeadsQueryString({
      fieldFilters: {
        student_gender: { mode: 'match', value: 'female' },
      },
    });
    expect(qs).toContain('filter%5Bstudent_gender%5D%5Beq%5D=female');
  });

  it('includes university as ilike partial match when fuzzy', () => {
    const qs = buildOldLeadsQueryString({
      fieldFilters: {
        university: { mode: 'match', value: 'ITU', fuzzy: true },
      },
    });
    expect(qs).toContain('filter%5Buniversity%5D%5Bilike%5D=%25ITU%25');
  });

  it('uses composite param for old lead rec_hotel presence', () => {
    const qs = buildOldLeadsQueryString({
      fieldFilters: {
        rec_hotel: { mode: 'match', value: 'yes' },
      },
    });
    expect(qs).toContain('composite=old_rec_hotel_present');
  });
});
