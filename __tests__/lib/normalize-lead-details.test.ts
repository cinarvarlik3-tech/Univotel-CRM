/**
 * Unit tests for normalizeLeadDetails.
 */
import { describe, expect, it } from 'vitest';
import { normalizeLeadDetails } from '@/lib/leads/normalize-lead-details';

describe('normalizeLeadDetails', () => {
  const row = {
    lead_uuid: '11111111-1111-1111-1111-111111111111',
    university: 'Bogazici',
    budget_min: 1000,
    budget_max: 2000,
    move_in: null,
    uni_year: '1',
    parent_name: null,
    preferred_district: null,
    student_gender: null,
    nationality: null,
    interested_hotel: [],
    room_type: [],
    dorm_awaiting: [],
    kvkk_opt_in: null,
    marketing_opt_in: null,
    rec_hotel: null,
  };

  it('returns null for null/undefined', () => {
    expect(normalizeLeadDetails(null)).toBeNull();
    expect(normalizeLeadDetails(undefined)).toBeNull();
  });

  it('returns object as-is when lead_uuid present', () => {
    expect(normalizeLeadDetails(row)).toEqual(row);
  });

  it('unwraps non-empty array', () => {
    expect(normalizeLeadDetails([row])).toEqual(row);
  });

  it('returns null for empty array', () => {
    expect(normalizeLeadDetails([])).toBeNull();
  });

  it('returns null for invalid object', () => {
    expect(normalizeLeadDetails({ foo: 'bar' })).toBeNull();
  });
});
