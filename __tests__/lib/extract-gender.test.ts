/**
 * Tests for gender keyword extraction from inbound messages.
 */
import { describe, expect, it } from 'vitest';
import { extractGenderFromMessages } from '@/lib/import/extract-gender';

describe('extractGenderFromMessages', () => {
  it('detects female from kiz keyword', () => {
    const result = extractGenderFromMessages(['Merhaba, kız öğrenciyim']);
    expect(result.gender).toBe('female');
    expect(result.matchedPhrase).toBe('kiz');
  });

  it('detects male from erkek keyword', () => {
    const result = extractGenderFromMessages(['Erkek öğrenci yurt arıyorum']);
    expect(result.gender).toBe('male');
    expect(result.matchedPhrase).toBe('erkek ogrenci');
  });

  it('uses first matching message in chronological order', () => {
    const result = extractGenderFromMessages(['Erkek öğrenci', 'Kız öğrenci']);
    expect(result.gender).toBe('male');
    expect(result.messageIndex).toBe(0);
  });

  it('skips ambiguous message and continues', () => {
    const result = extractGenderFromMessages(['Erkek mi kız mı kararsızım', 'Kız öğrenciyim']);
    expect(result.gender).toBe('female');
    expect(result.messageIndex).toBe(1);
  });

  it('returns null when no gender signal', () => {
    const result = extractGenderFromMessages(['Yurt fiyatları nedir?']);
    expect(result.gender).toBeNull();
  });

  it('normalizes Turkish diacritics', () => {
    const result = extractGenderFromMessages(['Kadın öğrenci için oda']);
    expect(result.gender).toBe('female');
    expect(result.matchedPhrase).toBe('kadin');
  });
});
