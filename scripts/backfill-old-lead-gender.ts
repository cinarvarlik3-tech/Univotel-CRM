/**
 * Backfills old_lead_details.student_gender from inbound old_lead_messages text.
 * Run: pnpm exec tsx scripts/backfill-old-lead-gender.ts [--write] [--limit N]
 */
import { config } from 'dotenv';
import { resolve } from 'path';
import { extractGenderFromMessages } from '@/lib/import/extract-gender';

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
  batchSize: number;
  sample: number;
}

interface PendingUpdate {
  lead_uuid: string;
  student_gender: 'male' | 'female';
  matchedPhrase: string;
}

interface MessageRow {
  lead_uuid: string;
  content: string | null;
  created_at: string;
}

/**
 * Parses CLI flags for dry-run vs write mode and pagination limits.
 * @param argv - process.argv slice after node/tsx entries.
 */
function parseArgs(argv: string[]): CliOptions {
  let write = false;
  let limit: number | null = null;
  let batchSize = 200;
  let sample = 10;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--write') write = true;
    else if (arg === '--dry-run') write = false;
    else if (arg === '--limit') limit = Number.parseInt(argv[++i] ?? '', 10);
    else if (arg === '--batch-size') batchSize = Number.parseInt(argv[++i] ?? '200', 10);
    else if (arg === '--sample') sample = Number.parseInt(argv[++i] ?? '10', 10);
  }

  return { write, limit, batchSize, sample };
}

/**
 * Groups inbound message bodies by lead UUID in chronological order.
 * @param messages - Message rows from Supabase.
 */
function groupInboundContents(messages: MessageRow[]): Map<string, string[]> {
  const sorted = [...messages].sort(
    (a, b) => a.created_at.localeCompare(b.created_at) || a.lead_uuid.localeCompare(b.lead_uuid),
  );

  const grouped = new Map<string, string[]>();

  for (const message of sorted) {
    if (typeof message.content !== 'string' || message.content.trim().length === 0) {
      continue;
    }

    const existing = grouped.get(message.lead_uuid) ?? [];
    existing.push(message.content);
    grouped.set(message.lead_uuid, existing);
  }

  return grouped;
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  const { createServiceClient } = await import('@/lib/supabase/service');
  const client = createServiceClient();

  const { count: totalNull, error: countError } = await client
    .from('old_lead_details')
    .select('*', { count: 'exact', head: true })
    .is('student_gender', null);

  if (countError) {
    throw new Error(`Failed to count old_lead_details: ${countError.message}`);
  }

  const targetTotal =
    options.limit != null ? Math.min(options.limit, totalNull ?? 0) : (totalNull ?? 0);
  console.log(`Scanning up to ${targetTotal} old leads with null student_gender…`);

  let offset = 0;
  let examined = 0;
  let inferredMale = 0;
  let inferredFemale = 0;
  let skippedNoSignal = 0;
  const pending: PendingUpdate[] = [];
  const samples: PendingUpdate[] = [];

  while (examined < targetTotal) {
    const pageSize = Math.min(options.batchSize, targetTotal - examined);

    const { data: rows, error } = await client
      .from('old_lead_details')
      .select('lead_uuid')
      .is('student_gender', null)
      .order('lead_uuid')
      .range(offset, offset + pageSize - 1);

    if (error) {
      throw new Error(`Failed to fetch old_lead_details: ${error.message}`);
    }

    if (!rows || rows.length === 0) {
      break;
    }

    const leadUuids = rows.map((row) => row.lead_uuid);

    const { data: messages, error: messageError } = await client
      .from('old_lead_messages')
      .select('lead_uuid, content, created_at')
      .in('lead_uuid', leadUuids)
      .eq('message_type', 'incoming');

    if (messageError) {
      throw new Error(
        `Failed to fetch messages for batch at offset ${offset}: ${messageError.message}`,
      );
    }

    const contentsByLead = groupInboundContents(messages ?? []);

    for (const leadUuid of leadUuids) {
      examined++;

      const result = extractGenderFromMessages(contentsByLead.get(leadUuid) ?? []);
      if (!result.gender || !result.matchedPhrase) {
        skippedNoSignal++;
        continue;
      }

      const update: PendingUpdate = {
        lead_uuid: leadUuid,
        student_gender: result.gender,
        matchedPhrase: result.matchedPhrase,
      };

      pending.push(update);
      if (result.gender === 'male') inferredMale++;
      else inferredFemale++;

      if (samples.length < options.sample) {
        samples.push(update);
      }
    }

    offset += rows.length;
    console.log(
      `  Progress: ${examined}/${targetTotal} examined, ${pending.length} matches (${inferredMale} male, ${inferredFemale} female)`,
    );

    if (rows.length < pageSize) {
      break;
    }
  }

  console.log('\n=== Old lead gender backfill summary ===');
  console.log(`Mode:                      ${options.write ? 'WRITE' : 'DRY-RUN'}`);
  console.log(`Rows examined (null gender): ${examined}`);
  console.log(`Inferred male:             ${inferredMale}`);
  console.log(`Inferred female:           ${inferredFemale}`);
  console.log(`Skipped (no signal):       ${skippedNoSignal}`);
  console.log(`Updates queued:            ${pending.length}`);

  if (samples.length > 0) {
    console.log('\nSample matches:');
    for (const sample of samples) {
      console.log(`  ${sample.lead_uuid} → ${sample.student_gender} (${sample.matchedPhrase})`);
    }
  }

  if (!options.write || pending.length === 0) {
    return;
  }

  console.log('\nApplying updates…');

  for (let i = 0; i < pending.length; i += options.batchSize) {
    const batch = pending.slice(i, i + options.batchSize);

    for (const gender of ['male', 'female'] as const) {
      const leadUuids = batch
        .filter((update) => update.student_gender === gender)
        .map((update) => update.lead_uuid);

      if (leadUuids.length === 0) {
        continue;
      }

      const { error: updateError } = await client
        .from('old_lead_details')
        .update({ student_gender: gender })
        .in('lead_uuid', leadUuids)
        .is('student_gender', null);

      if (updateError) {
        throw new Error(`Failed to update batch at index ${i}: ${updateError.message}`);
      }
    }

    console.log(`  Written ${Math.min(i + batch.length, pending.length)}/${pending.length}`);
  }

  console.log(`\nApplied ${pending.length} updates.`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
