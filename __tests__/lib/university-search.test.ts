/**
 * Unit tests for university combobox search.
 */
import { describe, expect, it } from 'vitest';
import { filterUniversitiesForSearch, matchesUniversitySearch } from '@/lib/universities/search';
import type { UniversityRow } from '@/types/domain';

const sample: UniversityRow[] = [
  {
    id: '1',
    uni_name: 'İTÜ - Ayazağa',
    uni_shortname: 'İTÜ',
    district: 'Ayazağa',
    city: 'İstanbul',
    country: 'Türkiye',
    yok_code: null,
    is_active: true,
    created_at: '',
    updated_at: '',
  },
  {
    id: '2',
    uni_name: 'Boğaziçi - Ana Kampüs',
    uni_shortname: 'Boğaziçi',
    district: 'Ana Kampüs',
    city: 'İstanbul',
    country: 'Türkiye',
    yok_code: null,
    is_active: true,
    created_at: '',
    updated_at: '',
  },
  {
    id: '3',
    uni_name: 'Bahçeşehir Üniversitesi - Göztepe',
    uni_shortname: 'Bahçeşehir Üniversitesi',
    district: 'Göztepe',
    city: 'İstanbul',
    country: 'Türkiye',
    yok_code: null,
    is_active: true,
    created_at: '',
    updated_at: '',
  },
];

describe('university search', () => {
  it('matches Turkish shortname', () => {
    expect(matchesUniversitySearch(sample[0], 'İTÜ')).toBe(true);
    expect(matchesUniversitySearch(sample[0], 'itü')).toBe(true);
  });

  it('matches ASCII-folded shortname queries', () => {
    expect(matchesUniversitySearch(sample[0], 'ITU')).toBe(true);
    expect(matchesUniversitySearch(sample[0], 'itu')).toBe(true);
  });

  it('matches shortname substring for multi-campus institutions', () => {
    expect(matchesUniversitySearch(sample[1], 'Boğaziçi')).toBe(true);
    expect(matchesUniversitySearch(sample[1], 'bogazici')).toBe(true);
  });

  it('matches campus district', () => {
    expect(matchesUniversitySearch(sample[2], 'Göztepe')).toBe(true);
    expect(matchesUniversitySearch(sample[2], 'goztepe')).toBe(true);
  });

  it('ranks exact shortname matches first', () => {
    const results = filterUniversitiesForSearch(sample, 'ITU');
    expect(results[0]?.uni_name).toBe('İTÜ - Ayazağa');
  });
});
