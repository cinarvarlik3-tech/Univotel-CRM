/**
 * Bootstrap script: map Chatwoot agents to CRM salespeople by email then display name.
 * Run: pnpm exec tsx scripts/sync-chatwoot-agents.ts
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

async function main(): Promise<void> {
  const { listChatwootAgents } = await import('../lib/chatwoot/client');
  const { normalizeDisplayName, normalizeEmail } = await import('../lib/chatwoot/normalize');
  const { createServiceClient } = await import('../lib/supabase/service');

  const agents = await listChatwootAgents();
  const client = createServiceClient();

  const { data: salespeople, error } = await client
    .from('salespeople')
    .select('id, full_name, email, chatwoot_user_id')
    .eq('is_active', true);

  if (error) {
    throw new Error(error.message);
  }

  let mapped = 0;
  let skipped = 0;

  for (const person of salespeople ?? []) {
    if (person.chatwoot_user_id != null) {
      skipped++;
      continue;
    }

    const email = normalizeEmail(person.email);
    let match = email ? agents.filter((a) => normalizeEmail(a.email) === email) : [];

    if (match.length !== 1) {
      const name = normalizeDisplayName(person.full_name);
      match = name ? agents.filter((a) => normalizeDisplayName(a.name) === name) : [];
    }

    if (match.length !== 1) {
      console.warn(
        `No unique Chatwoot match for ${person.full_name} (${person.email}) — matches=${match.length}`,
      );
      continue;
    }

    const agent = match[0];
    const { error: updateError } = await client
      .from('salespeople')
      .update({
        chatwoot_user_id: agent.id,
        chatwoot_agent_email: agent.email,
      })
      .eq('id', person.id);

    if (updateError) {
      console.error(`Failed to update ${person.full_name}:`, updateError.message);
      continue;
    }

    console.log(`Mapped ${person.full_name} → Chatwoot id ${agent.id}`);
    mapped++;
  }

  console.log(`Done. mapped=${mapped} skipped_already_mapped=${skipped}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
