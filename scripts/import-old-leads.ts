/**
 * Imports Chatwoot dump rows into old_leads / old_lead_details.
 * Run: pnpm exec tsx scripts/import-old-leads.ts [--write] [--dump path] [--limit N]
 */
import { config } from 'dotenv';
import { resolve } from 'path';
import { writeFileSync } from 'fs';

/** Loads .env then .env.local before any module that imports lib/env. */
function loadEnvFiles(): void {
  const root = process.cwd();
  config({ path: resolve(root, '.env') });
  config({ path: resolve(root, '.env.local'), override: true });
}

loadEnvFiles();

interface CliOptions {
  write: boolean;
  dumpPath: string;
  limit: number | null;
  sample: number;
  batchSize: number;
  skipFile: string;
}

function parseArgs(argv: string[]): CliOptions {
  let write = false;
  let dumpPath = resolve(process.cwd(), 'readable_database.sql');
  let limit: number | null = null;
  let sample = 5;
  let batchSize = 500;
  let skipFile = resolve(process.cwd(), 'import-old-leads-skipped.json');

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--write') write = true;
    else if (arg === '--dry-run') write = false;
    else if (arg === '--dump') dumpPath = resolve(process.cwd(), argv[++i] ?? dumpPath);
    else if (arg === '--limit') limit = Number.parseInt(argv[++i] ?? '', 10);
    else if (arg === '--sample') sample = Number.parseInt(argv[++i] ?? '5', 10);
    else if (arg === '--batch-size') batchSize = Number.parseInt(argv[++i] ?? '500', 10);
    else if (arg === '--skip-file') skipFile = resolve(process.cwd(), argv[++i] ?? skipFile);
  }

  return { write, dumpPath, limit, sample, batchSize, skipFile };
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  const { loadChatwootDump } = await import('../lib/import/chatwoot-dump-parser');
  const { buildOldLeadRows, toSampleRow } = await import('../lib/import/build-old-lead-rows');
  const { env } = await import('../lib/env');

  console.log(`Loading dump: ${options.dumpPath}`);
  const dump = loadChatwootDump(options.dumpPath);
  const built = buildOldLeadRows(dump, env.CHATWOOT_BASE_URL);

  let rows = built.rows;
  if (options.limit != null && options.limit > 0) {
    rows = rows.slice(0, options.limit);
  }

  console.log('\n=== Import dry-run summary ===');
  console.log(`Conversations parsed:      ${built.stats.conversationsParsed}`);
  console.log(`Phone groups:              ${built.stats.phoneGroups}`);
  console.log(`Instagram groups:          ${built.stats.instagramGroups}`);
  console.log(`Merged phone groups:       ${built.stats.mergedPhoneGroups}`);
  console.log(`Merged instagram groups:   ${built.stats.mergedInstagramGroups}`);
  console.log(`Rows to insert:            ${rows.length}`);
  console.log(`Skipped conversations:     ${built.skipped.length}`);
  console.log(`Normalization failed:      ${built.stats.normalizationFailed}`);
  console.log(`University extracted:      ${built.stats.universityExtracted}`);
  console.log(
    `By channel:                whatsapp=${built.stats.byChannel.whatsapp} instagram=${built.stats.byChannel.instagram}`,
  );

  if (built.skipped.length > 0) {
    writeFileSync(options.skipFile, JSON.stringify(built.skipped, null, 2), 'utf8');
    console.log(`Skipped details written to ${options.skipFile}`);
  }

  if (options.sample > 0) {
    console.log('\nSample rows:');
    console.log(JSON.stringify(rows.slice(0, options.sample).map(toSampleRow), null, 2));
  }

  if (!options.write) {
    console.log('\nDry-run complete. Re-run with --write to insert into Supabase.');
    return;
  }

  const { createServiceClient } = await import('../lib/supabase/service');
  const client = createServiceClient();

  const { count: existingCount, error: countError } = await client
    .from('old_leads')
    .select('*', { count: 'exact', head: true });

  if (countError) {
    throw new Error(`Failed to count old_leads: ${countError.message}`);
  }

  if ((existingCount ?? 0) > 0) {
    throw new Error(
      `old_leads already has ${existingCount} rows. Truncate before re-import or use a fresh database.`,
    );
  }

  console.log(`\nInserting ${rows.length} leads in batches of ${options.batchSize}...`);

  let inserted = 0;
  for (let i = 0; i < rows.length; i += options.batchSize) {
    const batch = rows.slice(i, i + options.batchSize);
    const leadPayload = batch.map((row) => row.lead);
    const { error: leadError } = await client.from('old_leads').insert(leadPayload);

    if (leadError) {
      throw new Error(
        `old_leads insert failed at batch ${i / options.batchSize + 1}: ${leadError.message}`,
      );
    }

    const detailsPayload = batch.map((row) => row.details);
    const { error: detailsError } = await client.from('old_lead_details').insert(detailsPayload);

    if (detailsError) {
      throw new Error(
        `old_lead_details insert failed at batch ${i / options.batchSize + 1}: ${detailsError.message}`,
      );
    }

    inserted += batch.length;
    console.log(`  inserted ${inserted}/${rows.length}`);
  }

  console.log(`\nImport complete. ${inserted} old leads inserted.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
