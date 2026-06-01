/**
 * Locale-aware display labels for student_gender codes.
 */
import { formatEnumLabel } from '@/lib/i18n/enum-labels';
import type { Locale } from '@/lib/i18n/types';

/**
 * Maps student_gender code to localized label for UI display.
 * @param value - student_gender from lead_details or old_lead_details.
 * @param locale - Active UI locale.
 * @returns Display label or em dash when unset.
 */
export function formatStudentGender(
  value: string | null | undefined,
  locale: Locale = 'tr',
): string {
  if (!value) return '—';
  return formatEnumLabel(locale, 'gender', value);
}

/**
 * Returns true when student_gender is valid for hotel recommendation matching.
 * @param value - student_gender from lead_details.
 */
export function isRecEligibleGender(value: string | null | undefined): value is 'male' | 'female' {
  return value === 'male' || value === 'female';
}
