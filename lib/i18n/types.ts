/**
 * Locale types and defaults for CRM UI internationalization.
 */

/** Supported UI locales. */
export type Locale = 'tr' | 'en';

/** Default locale when no preference is stored. */
export const DEFAULT_LOCALE: Locale = 'tr';

/** All supported locales. */
export const SUPPORTED_LOCALES: readonly Locale[] = ['tr', 'en'] as const;

/** localStorage key for persisted locale preference. */
export const LOCALE_STORAGE_KEY = 'univotel-locale';

/**
 * Returns true when the string is a supported locale code.
 * @param value - Raw stored or query value.
 */
export function isLocale(value: string | null | undefined): value is Locale {
  return value === 'tr' || value === 'en';
}

/**
 * BCP 47 tag used for date/number formatting.
 * @param locale - UI locale.
 */
export function localeToBcp47(locale: Locale): string {
  return locale === 'tr' ? 'tr-TR' : 'en-GB';
}
