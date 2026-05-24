/**
 * Tests for archived leads query string builder.
 */
import { describe, expect, it } from 'vitest';
import { buildArchivedLeadsQueryString } from '@/lib/ui/build-archived-leads-query-string';

describe('buildArchivedLeadsQueryString', () => {
  it('includes default limit', () => {
    const qs = buildArchivedLeadsQueryString({});
    expect(qs).toContain('limit=50');
  });

  it('includes archive filters and search params', () => {
    const qs = buildArchivedLeadsQueryString({
      archiveReason: 'lost',
      leadSource: 'whatsapp',
      assignedTo: 'abc-123',
      archivedFrom: '2026-01-01',
      archivedTo: '2026-01-31',
      search: 'Ayse',
      fuzzy: true,
      cursor: '2026-01-15T00:00:00Z',
    });

    expect(qs).toContain('archive_reason=lost');
    expect(qs).toContain('lead_source=whatsapp');
    expect(qs).toContain('assigned_to=abc-123');
    expect(qs).toContain('archived_from=2026-01-01');
    expect(qs).toContain('archived_to=2026-01-31');
    expect(qs).toContain('search=Ayse');
    expect(qs).toContain('fuzzy=1');
    expect(qs).toContain('cursor=2026-01-15T00%3A00%3A00Z');
  });
});
