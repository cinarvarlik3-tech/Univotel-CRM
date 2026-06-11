/**
 * Generates SQL INSERT tuples for migration 0059 from chatwoot-universities data.
 * Run: node scripts/gen-university-migration.mjs
 */
import { readFileSync } from 'fs';

const src = readFileSync('lib/data/chatwoot-universities.ts', 'utf8');
const block = src.match(/export const CHATWOOT_UNIVERSITY_NAMES = \[([\s\S]*?)\] as const;/);
if (!block) throw new Error('Could not parse CHATWOOT_UNIVERSITY_NAMES');

const names = [...block[1].matchAll(/'([^']*)'/g)].map((m) => m[1]);

function parse(name) {
  const dashIdx = name.indexOf(' - ');
  if (dashIdx !== -1) {
    return {
      uni_name: name,
      uni_shortname: name.slice(0, dashIdx),
      district: name.slice(dashIdx + 3),
    };
  }
  if (name === 'İstanbul Üniversitesi Cerrahpaşa') {
    return { uni_name: name, uni_shortname: 'İstanbul Üniversitesi', district: 'Cerrahpaşa' };
  }
  const prefix = 'Doğuş Üniversitesi ';
  if (name.startsWith(prefix)) {
    return {
      uni_name: name,
      uni_shortname: 'Doğuş Üniversitesi',
      district: name.slice(prefix.length),
    };
  }
  return { uni_name: name, uni_shortname: name, district: null };
}

const rows = names.map(parse);
const esc = (s) => s.replace(/'/g, "''");

for (const r of rows) {
  const d = r.district ? `'${esc(r.district)}'` : 'NULL';
  console.log(`  ('${esc(r.uni_name)}', '${esc(r.uni_shortname)}', ${d})`);
}
console.error(`-- ${rows.length} rows`);
