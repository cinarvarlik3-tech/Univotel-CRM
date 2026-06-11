/**
 * Unit tests for Chatwoot university list parsing and lookup.
 */
import { describe, expect, it } from 'vitest';
import {
  CHATWOOT_UNIVERSITY_NAMES,
  CHATWOOT_UNIVERSITY_ROWS,
  parseChatwootUniversityName,
  resolveSchoolShortnameFromUniversity,
} from '@/lib/data/chatwoot-universities';

describe('chatwoot universities', () => {
  it('has 81 unique campus entries matching Chatwoot list', () => {
    expect(CHATWOOT_UNIVERSITY_NAMES.length).toBe(81);
    expect(new Set(CHATWOOT_UNIVERSITY_NAMES).size).toBe(81);
    expect(CHATWOOT_UNIVERSITY_ROWS.length).toBe(81);
  });

  it('parses dashed campus labels', () => {
    expect(parseChatwootUniversityName('İTÜ - Ayazağa')).toEqual({
      uni_name: 'İTÜ - Ayazağa',
      uni_shortname: 'İTÜ',
      district: 'Ayazağa',
    });
  });

  it('parses embedded campus without dash', () => {
    expect(parseChatwootUniversityName('Doğuş Üniversitesi Çengelköy')).toEqual({
      uni_name: 'Doğuş Üniversitesi Çengelköy',
      uni_shortname: 'Doğuş Üniversitesi',
      district: 'Çengelköy',
    });
    expect(parseChatwootUniversityName('İstanbul Üniversitesi Cerrahpaşa')).toEqual({
      uni_name: 'İstanbul Üniversitesi Cerrahpaşa',
      uni_shortname: 'İstanbul Üniversitesi',
      district: 'Cerrahpaşa',
    });
  });

  it('resolves school shortname from exact Chatwoot university value', () => {
    expect(resolveSchoolShortnameFromUniversity('Boğaziçi - Ana Kampüs')).toBe('Boğaziçi');
    expect(resolveSchoolShortnameFromUniversity('Bahçeşehir Üniversitesi - Göztepe')).toBe(
      'Bahçeşehir Üniversitesi',
    );
    expect(resolveSchoolShortnameFromUniversity('Unknown Uni')).toBeNull();
  });
});
