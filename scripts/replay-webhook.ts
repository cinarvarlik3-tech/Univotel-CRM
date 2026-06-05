/**
 * One-off script: replays a webhook_logs row by calling processChatwoot directly.
 * Usage: npx tsx scripts/replay-webhook.ts <webhook-log-id>
 */
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env') });
config({ path: resolve(process.cwd(), '.env.local'), override: true });

async function main() {
  const id = process.argv[2];
  if (!id) {
    console.error('Usage: npx tsx scripts/replay-webhook.ts <webhook-log-id>');
    process.exit(1);
  }

  const { createServiceClient } = await import('@/lib/supabase/service');
  const { processChatwoot } = await import('@/lib/webhooks/process-chatwoot');

  const client = createServiceClient();
  const { data: row, error } = await client
    .from('webhook_logs')
    .select('payload, source, event_type')
    .eq('id', id)
    .maybeSingle();

  if (error || !row) {
    console.error('Row not found:', error?.message);
    process.exit(1);
  }

  console.log(`Replaying ${row.source} / ${row.event_type} ...`);

  if (row.source === 'chatwoot') {
    await processChatwoot(row.payload);
  } else {
    console.error('Source not supported by this script:', row.source);
    process.exit(1);
  }

  console.log('Done.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
