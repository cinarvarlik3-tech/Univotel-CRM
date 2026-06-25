/**
 * Backfills lead_messages by re-pulling each lead's full Chatwoot conversation
 * history via the Chatwoot API (idempotent upsert on chatwoot_message_id).
 *
 * Recovers messages dropped by the webhook validation gap. Safe to re-run.
 *
 * Run:
 *   pnpm exec tsx scripts/backfill-lead-messages.ts            # dry run (reports scope only)
 *   pnpm exec tsx scripts/backfill-lead-messages.ts --write    # actually sync
 *   pnpm exec tsx scripts/backfill-lead-messages.ts --write --limit 20 --delay 300
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
  limit: number | null;
  /** Delay between conversations, ms — throttles the Chatwoot API. */
  delayMs: number;
}

function parseArgs(argv: string[]): CliOptions {
  let write = false;
  let limit: number | null = null;
  let delayMs = 250;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--write') write = true;
    else if (arg === '--dry-run') write = false;
    else if (arg === '--limit') limit = Number.parseInt(argv[++i] ?? '', 10);
    else if (arg === '--delay') delayMs = Number.parseInt(argv[++i] ?? '250', 10);
  }

  return { write, limit, delayMs };
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

interface LeadRow {
  uuid: string;
  chatwoot_conversation_id: number;
  message_from: string | null;
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  const { createServiceClient } = await import('../lib/supabase/service');
  const { syncLeadMessagesFromChatwoot } = await import('../lib/leads/sync-chatwoot-messages');

  const client = createServiceClient();

  // Page through every lead that has a linked Chatwoot conversation.
  const leads: LeadRow[] = [];
  const PAGE = 1000;
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await client
      .from('leads')
      .select('uuid, chatwoot_conversation_id, message_from')
      .not('chatwoot_conversation_id', 'is', null)
      .order('chatwoot_conversation_id', { ascending: true })
      .range(from, from + PAGE - 1);

    if (error) throw new Error(`leads fetch failed: ${error.message}`);
    const rows = (data ?? []) as LeadRow[];
    leads.push(...rows);
    if (rows.length < PAGE) break;
  }

  const targets = options.limit != null ? leads.slice(0, options.limit) : leads;

  console.log(
    `Found ${leads.length} leads with a Chatwoot conversation; processing ${targets.length}.`,
  );

  if (!options.write) {
    console.log('DRY RUN — no API calls or writes. Re-run with --write to backfill.');
    return;
  }

  let processed = 0;
  let totalSynced = 0;
  let failures = 0;

  for (const lead of targets) {
    try {
      const result = await syncLeadMessagesFromChatwoot({
        leadUuid: lead.uuid,
        conversationId: lead.chatwoot_conversation_id,
        leadName: lead.message_from,
      });
      totalSynced += result.syncedCount;
      processed++;
      if (processed % 25 === 0 || processed === targets.length) {
        console.log(
          `[${processed}/${targets.length}] synced ${totalSynced} messages so far (${failures} failures)`,
        );
      }
    } catch (err) {
      failures++;
      const message = err instanceof Error ? err.message : String(err);
      console.error(
        `conversation=${lead.chatwoot_conversation_id} lead=${lead.uuid} failed: ${message}`,
      );
    }
    if (options.delayMs > 0) await sleep(options.delayMs);
  }

  console.log(
    `Done. Processed ${processed}/${targets.length} conversations, upserted ${totalSynced} messages, ${failures} failures.`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
