/**
 * Normalizes text for fuzzy university matching (Turkish ASCII folding).
 * @param text - Raw message content.
 */
export function normalizeMatchText(text: string): string {
  return text
    .toLowerCase()
    .replace(/ı/g, 'i')
    .replace(/İ/g, 'i')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export interface UniversityEntry {
  canonical: string;
  aliases: string[];
}

/**
 * Builds alias → canonical lookup with longest-alias-first matching.
 * @param entries - University dictionary entries.
 */
export function buildUniversityLookup(entries: UniversityEntry[]): Map<string, string> {
  const aliasToCanonical = new Map<string, string>();

  for (const entry of entries) {
    for (const alias of entry.aliases) {
      const key = normalizeMatchText(alias);
      if (key.length >= 2) {
        aliasToCanonical.set(key, entry.canonical);
      }
    }
    aliasToCanonical.set(normalizeMatchText(entry.canonical), entry.canonical);
  }

  return aliasToCanonical;
}

/**
 * Extracts canonical university name from inbound message texts (first match wins).
 * @param messages - Inbound messages in chronological order.
 * @param lookup - Alias → canonical map from buildUniversityLookup.
 */
export function extractUniversityFromMessages(
  messages: string[],
  lookup: Map<string, string>,
): string | null {
  const sortedAliases = [...lookup.keys()].sort((a, b) => b.length - a.length);
  const shortAliases = new Set(['itu', 'odtu', 'ytu', 'gsu', 'bau', 'deu', 'ieu', 'ktu', 'gtu']);

  for (const raw of messages) {
    const text = normalizeMatchText(raw);
    if (text.length === 0) continue;

    for (const alias of sortedAliases) {
      if (alias.length < 3 && !shortAliases.has(alias)) {
        continue;
      }

      const escaped = alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const pattern = new RegExp(`(^|\\s)${escaped}($|\\s)`);
      if (pattern.test(text)) {
        return lookup.get(alias) ?? null;
      }
    }
  }

  return null;
}
