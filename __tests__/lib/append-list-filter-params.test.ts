/**
 * Unit tests for appendListFilterParams.
 */
import { describe, expect, it } from 'vitest';
import { LEAD_FILTER_FIELD_META } from '@/lib/query/filter-field-config';
import { LEAD_LIST_FILTER_FIELDS } from '@/lib/constants';
import { appendListFilterParams } from '@/lib/ui/append-list-filter-params';
import { DEFAULT_EXTENDED_LIST_FILTER_FIELDS } from '@/lib/ui/list-filter-types';

describe('appendListFilterParams', () => {
  it('emits parent_phone presence filter on leads table', () => {
    const params = new URLSearchParams();
    appendListFilterParams(params, {
      allowedFields: new Set(LEAD_LIST_FILTER_FIELDS),
      fieldMeta: LEAD_FILTER_FIELD_META,
      extended: {
        ...DEFAULT_EXTENDED_LIST_FILTER_FIELDS,
        hasParentPhone: 'yes',
      },
    });
    expect(params.get('filter[parent_phone][is]')).toBe('not.null');
  });

  it('emits interested hotel array contains filter', () => {
    const params = new URLSearchParams();
    appendListFilterParams(params, {
      allowedFields: new Set(LEAD_LIST_FILTER_FIELDS),
      fieldMeta: LEAD_FILTER_FIELD_META,
      extended: {
        ...DEFAULT_EXTENDED_LIST_FILTER_FIELDS,
        interestedHotel: 'Academic House',
      },
    });
    expect(params.get('filter[interested_hotel][cs]')).toBe('{"Academic House"}');
  });
});
