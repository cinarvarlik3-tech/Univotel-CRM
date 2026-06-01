/**
 * i18n module entry — message catalogs and translator factory.
 */
import { createTranslator } from '@/lib/i18n/create-translator';
import { en } from '@/lib/i18n/messages/en';
import { tr } from '@/lib/i18n/messages/tr';
import type { Locale } from '@/lib/i18n/types';

export { createTranslator } from '@/lib/i18n/create-translator';
export type { TranslateFn } from '@/lib/i18n/create-translator';
export type { Messages } from '@/lib/i18n/messages/en';
export { en, tr };
export * from '@/lib/i18n/types';
export * from '@/lib/i18n/enum-labels';
export * from '@/lib/i18n/format-date';

/**
 * Returns the message catalog for a locale.
 * @param locale - UI locale code.
 */
export function getMessages(locale: Locale) {
  return locale === 'tr' ? tr : en;
}

/**
 * Creates a translator for the given locale.
 * @param locale - UI locale code.
 */
export function getTranslator(locale: Locale) {
  return createTranslator(getMessages(locale));
}
