/**
 * Imports Chatwoot dump messages into old_lead_messages.
 * Run: pnpm exec tsx scripts/import-old-lead-messages.ts [--write] [--dump path] [--limit N]
 */
import { config } from 'dotenv';
import { resolve } from 'path';

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
  batchSize: number;
}

function parseArgs(argv: string[]): CliOptions {
  let write = false;
  let dumpPath = resolve(process.cwd(), 'readable_database.sql');
  let limit: number | null = null;
  let batchSize = 500;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--write') write = true;
    else if (arg === '--dry-run') write = false;
    else if (arg === '--dump') dumpPath = resolve(process.cwd(), argv[++i] ?? dumpPath);
    else if (arg === '--limit') limit = Number.parseInt(argv[++i] ?? '', 10);
    else if (arg === '--batch-size') batchSize = Number.parseInt(argv[++i] ?? '500', 10);
  }

  return { write, dumpPath, limit, batchSize };
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  const { loadChatwootMessagesDump } = await import('../lib/import/chatwoot-dump-parser');
  const { buildOldLeadMessageRows } = await import('../lib/import/build-old-lead-messages');
  const { buildConversationLeadMap } = await import('../lib/import/build-conversation-lead-map');
  const { createServiceClient } = await import('../lib/supabase/service');

  console.log(`Loading dump: ${options.dumpPath}`);
  const { users, messages } = loadChatwootMessagesDump(options.dumpPath);
  console.log(`Parsed ${messages.length} messages, ${users.size} users`);

  const client = createServiceClient();

  const leadRows: Array<{
    uuid: string;
    lead_name: string | null;
    chatwoot_conversation_id: number | null;
    source_details: Record<string, unknown> | null;
  }> = [];

  const pageSize = 1000;
  let from = 0;

  while (true) {
    const { data: page, error: leadsError } = await client
      .from('old_leads')
      .select('uuid, lead_name, chatwoot_conversation_id, source_details')
      .range(from, from + pageSize - 1);

    if (leadsError) {
      throw new Error(`Failed to load old_leads: ${leadsError.message}`);
    }

    if (!page?.length) break;

    for (const row of page) {
      leadRows.push({
        uuid: row.uuid,
        lead_name: row.lead_name,
        chatwoot_conversation_id: row.chatwoot_conversation_id,
        source_details:
          row.source_details &&
          typeof row.source_details === 'object' &&
          !Array.isArray(row.source_details)
            ? (row.source_details as Record<string, unknown>)
            : null,
      });
    }

    if (page.length < pageSize) break;
    from += pageSize;
  }

  if (!leadRows.length) {
    throw new Error('old_leads is empty. Run import:old-leads:write first.');
  }

  const convMap = buildConversationLeadMap(leadRows);
  if (convMap.collisionCount > 0) {
    console.warn(
      `Warning: ${convMap.collisionCount} conversation ID collisions (skipped duplicates).`,
    );
  }

  const built = buildOldLeadMessageRows(messages, users, leadRows);
  let rows = built.rows;
  if (options.limit != null && options.limit > 0) {
    rows = rows.slice(0, options.limit);
  }

  console.log('\n=== Message import dry-run summary ===');
  console.log(`Old leads loaded:          ${leadRows.length}`);
  console.log(`Conversation mappings:     ${convMap.conversationToLead.size}`);
  console.log(`Messages parsed:           ${built.stats.messagesParsed}`);
  console.log(`Messages mapped:           ${built.stats.mapped}`);
  console.log(`Orphaned (no lead):        ${built.stats.orphaned}`);
  console.log(`Skipped (unknown type):    ${built.stats.skippedType}`);
  console.log(`Private messages:          ${built.stats.privateCount}`);
  console.log(`With sender name:          ${built.stats.withSenderName}`);
  console.log(
    `By type:                   incoming=${built.stats.byType.incoming} outgoing=${built.stats.byType.outgoing} activity=${built.stats.byType.activity}`,
  );
  console.log(`Rows to insert:            ${rows.length}`);

  if (!options.write) {
    console.log('\nDry-run complete. Re-run with --write to insert into Supabase.');
    return;
  }

  const { count: existingCount, error: countError } = await client
    .from('old_lead_messages')
    .select('*', { count: 'exact', head: true });

  if (countError) {
    throw new Error(`Failed to count old_lead_messages: ${countError.message}`);
  }

  if ((existingCount ?? 0) > 0) {
    throw new Error(
      `old_lead_messages already has ${existingCount} rows. Truncate before re-import or use ON CONFLICT manually.`,
    );
  }

  console.log(`\nInserting ${rows.length} messages in batches of ${options.batchSize}...`);

  let inserted = 0;
  for (let i = 0; i < rows.length; i += options.batchSize) {
    const batch = rows.slice(i, i + options.batchSize);
    const { error: insertError } = await client.from('old_lead_messages').insert(batch);

    if (insertError) {
      throw new Error(
        `old_lead_messages insert failed at batch ${i / options.batchSize + 1}: ${insertError.message}`,
      );
    }

    inserted += batch.length;
    console.log(`  inserted ${inserted}/${rows.length}`);
  }

  console.log(`\nImport complete. ${inserted} messages inserted.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
