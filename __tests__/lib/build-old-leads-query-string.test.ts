/**
 * Unit tests for buildOldLeadsQueryString.
 */
import { describe, expect, it } from 'vitest';
import { buildOldLeadsQueryString } from '@/lib/ui/build-old-leads-query-string';
import { DEFAULT_EXTENDED_LIST_FILTER_FIELDS } from '@/lib/ui/list-filter-types';

describe('buildOldLeadsQueryString', () => {
  it('includes default sort and limit', () => {
    const qs = buildOldLeadsQueryString({});
    expect(qs).toContain('sort=created_at');
    expect(qs).toContain('limit=50');
  });

  it('includes channel filter for message_from', () => {
    const qs = buildOldLeadsQueryString({
      filters: { message_from: 'whatsapp', funnel_status: 'yeni' },
    });
    expect(qs).toContain('filter%5Bmessage_from%5D%5Beq%5D=whatsapp');
    expect(qs).toContain('filter%5Bfunnel_status%5D%5Beq%5D=yeni');
  });

  it('includes last_contact_at date range', () => {
    const qs = buildOldLeadsQueryString({
      dateFilters: [
        {
          field: 'last_contact_at',
          from: '2026-01-01T00:00:00Z',
          to: '2026-01-31T23:59:59Z',
        },
      ],
    });
    expect(qs).toContain('filter%5Blast_contact_at%5D%5Bgte%5D=2026-01-01T00%3A00%3A00Z');
    expect(qs).toContain('filter%5Blast_contact_at%5D%5Blte%5D=2026-01-31T23%3A59%3A59Z');
  });

  it('includes student_gender filter for old_lead_details', () => {
    const qs = buildOldLeadsQueryString({
      filters: { student_gender: 'female' },
    });
    expect(qs).toContain('filter%5Bstudent_gender%5D%5Beq%5D=female');
  });

  it('includes university as ilike partial match', () => {
    const qs = buildOldLeadsQueryString({
      filters: { university: 'ITU' },
    });
    expect(qs).toContain('filter%5Buniversity%5D%5Bilike%5D=%25ITU%25');
  });

  it('uses composite param for old lead rec_hotel presence', () => {
    const qs = buildOldLeadsQueryString({
      extended: {
        ...DEFAULT_EXTENDED_LIST_FILTER_FIELDS,
        hasRecHotel: 'yes',
      },
    });
    expect(qs).toContain('composite=old_rec_hotel_present');
  });
});
