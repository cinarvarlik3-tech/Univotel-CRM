/**
 * Client-side university search for the combobox (uni_name, uni_shortname, district).
 */
import type { UniversityRow } from '@/types/domain';

/**
 * Normalises a string for Turkish-aware case-insensitive comparison.
 */
export function normalizeTR(s: string): string {
  return s.replace(/İ/g, 'i').replace(/I/g, 'ı').toLocaleLowerCase('tr');
}

/**
 * Folds Turkish letters to ASCII so queries like "ITU" match "İTÜ".
 */
export function foldAscii(s: string): string {
  return normalizeTR(s)
    .replace(/ü/g, 'u')
    .replace(/ö/g, 'o')
    .replace(/ş/g, 's')
    .replace(/ç/g, 'c')
    .replace(/ğ/g, 'g')
    .replace(/ı/g, 'i');
}

function fieldVariants(value: string | null | undefined): string[] {
  if (!value) return [];
  const normalized = normalizeTR(value);
  const folded = foldAscii(value);
  return normalized === folded ? [normalized] : [normalized, folded];
}

/**
 * Returns true when query matches university name, shortname, or campus district.
 */
export function matchesUniversitySearch(uni: UniversityRow, query: string): boolean {
  const q = query.trim();
  if (!q) return true;

  const queryVariants = fieldVariants(q);
  const haystack = [
    ...fieldVariants(uni.uni_name),
    ...fieldVariants(uni.uni_shortname),
    ...fieldVariants(uni.district),
  ];

  return queryVariants.some((qv) => haystack.some((h) => h.includes(qv)));
}

/** Lower rank = higher priority in sorted results. */
export function universitySearchRank(uni: UniversityRow, query: string): number {
  const q = query.trim();
  if (!q) return 0;

  const qNorm = normalizeTR(q);
  const qFold = foldAscii(q);
  const shortNorm = normalizeTR(uni.uni_shortname);
  const shortFold = foldAscii(uni.uni_shortname);

  if (shortNorm === qNorm || shortFold === qFold) return 0;
  if (shortNorm.startsWith(qNorm) || shortFold.startsWith(qFold)) return 1;
  if (shortNorm.includes(qNorm) || shortFold.includes(qFold)) return 2;

  const nameNorm = normalizeTR(uni.uni_name);
  const nameFold = foldAscii(uni.uni_name);
  if (nameNorm.startsWith(qNorm) || nameFold.startsWith(qFold)) return 3;
  if (nameNorm.includes(qNorm) || nameFold.includes(qFold)) return 4;

  const districtNorm = uni.district ? normalizeTR(uni.district) : '';
  const districtFold = uni.district ? foldAscii(uni.district) : '';
  if (districtNorm.includes(qNorm) || districtFold.includes(qFold)) return 5;

  return 6;
}

/**
 * Filters and sorts universities for combobox search.
 */
export function filterUniversitiesForSearch(
  universities: UniversityRow[],
  query: string,
  maxResults = 50,
): UniversityRow[] {
  const trimmed = query.trim();
  const results = universities.filter((u) => matchesUniversitySearch(u, trimmed));

  if (!trimmed) {
    return [...results].sort((a, b) => a.uni_name.localeCompare(b.uni_name, 'tr'));
  }

  results.sort((a, b) => {
    const rankDiff = universitySearchRank(a, trimmed) - universitySearchRank(b, trimmed);
    if (rankDiff !== 0) return rankDiff;
    return a.uni_name.localeCompare(b.uni_name, 'tr');
  });

  return results.length > maxResults ? results.slice(0, maxResults) : results;
}
