import { describe, expect, it } from 'vitest';
import { lookupSchoolShortname } from '@/lib/leads/lookup-school-shortname';
import type { UniversityRow } from '@/types/domain';

describe('lookupSchoolShortname', () => {
  const tableRows: UniversityRow[] = [
    {
      id: '1',
      uni_name: 'İTÜ - Ayazağa',
      uni_shortname: 'İTÜ',
      district: 'Ayazağa',
    },
  ];

  it('returns null for empty university', () => {
    expect(lookupSchoolShortname(null)).toBeNull();
    expect(lookupSchoolShortname('')).toBeNull();
    expect(lookupSchoolShortname('   ')).toBeNull();
  });

  it('prefers Supabase row match by uni_name', () => {
    expect(lookupSchoolShortname('İTÜ - Ayazağa', tableRows)).toBe('İTÜ');
  });

  it('falls back to static Chatwoot list when table rows miss', () => {
    expect(lookupSchoolShortname('Boğaziçi - Ana Kampüs')).toBe('Boğaziçi');
  });

  it('returns null when university is unknown', () => {
    expect(lookupSchoolShortname('Unknown University - Campus')).toBeNull();
  });
});
