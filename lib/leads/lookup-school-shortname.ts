/**
 * Resolves school_shortname (uni_shortname) from a lead_details.university value.
 */
import { resolveSchoolShortnameFromUniversity } from '@/lib/data/chatwoot-universities';
import type { UniversityRow } from '@/types/domain';

/**
 * Looks up the abbreviation for a university campus label.
 * Prefers live Supabase rows when provided, then falls back to the static Chatwoot list.
 */
export function lookupSchoolShortname(
  university: string | null | undefined,
  universities?: readonly UniversityRow[],
): string | null {
  if (!university?.trim()) return null;

  const trimmed = university.trim();
  const fromTable = universities?.find((u) => u.uni_name === trimmed)?.uni_shortname;
  if (fromTable) return fromTable;

  return resolveSchoolShortnameFromUniversity(trimmed);
}
