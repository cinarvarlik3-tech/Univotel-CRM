/**
 * Unit tests for i18n translator and enum labels.
 */
import { describe, expect, it } from 'vitest';
import { createTranslator } from '@/lib/i18n/create-translator';
import { formatEnumLabel, formatSortColumn } from '@/lib/i18n/enum-labels';
import { en } from '@/lib/i18n/messages/en';
import { tr as trMessages } from '@/lib/i18n/messages/tr';
import { DEFAULT_LOCALE, isLocale } from '@/lib/i18n/types';

describe('createTranslator', () => {
  it('resolves nested keys', () => {
    const t = createTranslator(en);
    expect(t('nav.leads')).toBe('Leads');
    expect(t('common.save')).toBe('Save');
  });

  it('interpolates placeholders', () => {
    const t = createTranslator(en);
    expect(t('common.leadsMatch', { count: 42 })).toBe('42 leads match');
  });

  it('returns key when missing', () => {
    const t = createTranslator(en);
    expect(t('missing.key')).toBe('missing.key');
  });
});

describe('formatEnumLabel', () => {
  it('returns Turkish funnel label', () => {
    expect(formatEnumLabel('tr', 'funnel', 'yeni')).toBe('Yeni');
  });

  it('returns English funnel label', () => {
    expect(formatEnumLabel('en', 'funnel', 'yeni')).toBe('New');
  });

  it('falls back to slug for unknown values', () => {
    expect(formatEnumLabel('en', 'funnel', 'custom-slug')).toBe('custom slug');
  });
});

describe('formatSortColumn', () => {
  it('returns localized sort label', () => {
    expect(formatSortColumn('tr', 'created_at')).toBe('Oluşturulma');
    expect(formatSortColumn('en', 'created_at')).toBe('Created');
  });
});

describe('locale types', () => {
  it('defaults to Turkish', () => {
    expect(DEFAULT_LOCALE).toBe('tr');
  });

  it('validates locale codes', () => {
    expect(isLocale('tr')).toBe(true);
    expect(isLocale('en')).toBe(true);
    expect(isLocale('fr')).toBe(false);
  });
});

describe('message catalogs', () => {
  it('tr catalog has same top-level sections as en', () => {
    expect(Object.keys(trMessages).sort()).toEqual(Object.keys(en).sort());
  });

  it('tr nav.leads is Turkish', () => {
    const t = createTranslator(trMessages);
    expect(t('nav.leads')).toBe('Leadler');
  });
});
