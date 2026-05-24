/**
 * GA4 enrichment worker — attempt 1 via waitUntil, attempts 2–4 via cron batch.
 */
import { recomputeAfterGa4Attempt } from '@/lib/attribution/compute-confidence';
import { collectedDataToSourceDetails } from '@/lib/attribution/build-collected-data';
import { lookupDniSource } from '@/lib/dni/list-active-numbers';
import { queryGa4SessionByRefCode, canUseGa4Api } from '@/lib/ga4/client';
import { lookupRefSession } from '@/lib/ref/create-ref-session';
import { createServiceClient } from '@/lib/supabase/service';
import type { CollectedDataChannel, PathLostAt, SourceConfidence } from '@/lib/attribution/types';
import type { Json } from '@/types/database';

const MAX_GA4_ATTEMPTS = 4;

/** Delay before cron should retry after attempt 2 and 3 (milliseconds). */
export const GA4_RETRY_DELAYS_MS: Record<number, number> = {
  2: 0,
  3: 5 * 60 * 1000,
  4: 10 * 60 * 1000,
};

/** collected_data row subset used during enrichment. */
interface CollectedDataEnrichmentRow {
  lead_uuid: string;
  ref_code: string | null;
  ga4_enriched: boolean;
  ga4_fetch_attempts: number;
  ga4_enriched_at: string | null;
  ga4_session_id: string | null;
  session_start: string | null;
  session_duration: number | null;
  ad_id: string | null;
  called_number: string | null;
  channel: CollectedDataChannel;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  source_confidence: SourceConfidence;
  path_lost_at: PathLostAt;
  external_id: string;
  utm_content: string | null;
  landing_page: string | null;
  referral_domain: string | null;
  click_event: string | null;
  campaign_id: string | null;
  adset_id: string | null;
  placement: string | null;
  call_duration: number | null;
  chatwoot_url: string | null;
  is_organic: boolean | null;
  normalization_failed: boolean;
  created_at: string;
}

/**
 * Runs a single GA4 enrichment attempt for a lead (waitUntil or cron).
 * @param leadUuid - Lead UUID to enrich.
 */
export async function enrichFromGA4(leadUuid: string): Promise<void> {
  if (!canUseGa4Api()) return;

  const client = createServiceClient();
  const { data, error } = await client
    .from('collected_data')
    .select('*')
    .eq('lead_uuid', leadUuid)
    .maybeSingle();

  if (error || !data) return;

  const row = data as CollectedDataEnrichmentRow;
  if (!row.ref_code || row.ga4_enriched || row.ga4_fetch_attempts >= MAX_GA4_ATTEMPTS) {
    return;
  }

  await runGa4Attempt(row);
}

/**
 * Processes pending GA4 enrichment rows for cron (attempts 2–4).
 * @returns Count of rows processed.
 */
export async function processGa4EnrichmentBatch(): Promise<number> {
  if (!canUseGa4Api()) return 0;

  const client = createServiceClient();
  const { data, error } = await client
    .from('collected_data')
    .select('*')
    .eq('ga4_enriched', false)
    .not('ref_code', 'is', null)
    .lt('ga4_fetch_attempts', MAX_GA4_ATTEMPTS)
    .order('created_at', { ascending: true })
    .limit(50);

  if (error || !data) return 0;

  let processed = 0;
  for (const raw of data) {
    const row = raw as CollectedDataEnrichmentRow;
    if (row.ga4_fetch_attempts < 1) continue;

    const nextAttempt = row.ga4_fetch_attempts + 1;
    const delay = GA4_RETRY_DELAYS_MS[nextAttempt] ?? 0;
    const createdAt = new Date(row.created_at).getTime();
    if (Date.now() < createdAt + delay) continue;

    await runGa4Attempt(row);
    processed += 1;
  }

  return processed;
}

/**
 * Executes one GA4 lookup attempt and updates collected_data + source_details.
 * @param row - Current collected_data row.
 */
async function runGa4Attempt(row: CollectedDataEnrichmentRow): Promise<void> {
  const refCode = row.ref_code;
  if (!refCode) return;

  const ga4Result = await queryGa4SessionByRefCode(refCode);
  const nextAttempts = row.ga4_fetch_attempts + 1;

  if (ga4Result) {
    await applyGa4Success(row, ga4Result, nextAttempts);
    return;
  }

  if (nextAttempts >= MAX_GA4_ATTEMPTS) {
    await applyGa4GiveUp(row, nextAttempts);
    return;
  }

  const client = createServiceClient();
  await client
    .from('collected_data')
    .update({ ga4_fetch_attempts: nextAttempts })
    .eq('lead_uuid', row.lead_uuid);
}

/**
 * Writes successful GA4 enrichment to collected_data and source_details.
 * @param row - Current row.
 * @param ga4Result - GA4 session lookup result.
 * @param attempts - Updated attempt count.
 */
async function applyGa4Success(
  row: CollectedDataEnrichmentRow,
  ga4Result: {
    ga4_session_id: string;
    session_start: string | null;
    session_duration: number | null;
  },
  attempts: number,
): Promise<void> {
  const refSession = row.ref_code ? await lookupRefSession(row.ref_code) : null;
  const dniMatch = await lookupDniSource(row.called_number);

  const updated = {
    ...row,
    ga4_session_id: ga4Result.ga4_session_id,
    session_start: ga4Result.session_start ?? row.session_start,
    session_duration: ga4Result.session_duration ?? row.session_duration,
    ga4_enriched: true,
    ga4_enriched_at: new Date().toISOString(),
    ga4_fetch_attempts: attempts,
  };

  const confidence = recomputeAfterGa4Attempt(
    updated,
    dniMatch?.source ?? null,
    Boolean(refSession),
  );

  const client = createServiceClient();
  await client
    .from('collected_data')
    .update({
      ga4_session_id: updated.ga4_session_id,
      session_start: updated.session_start,
      session_duration: updated.session_duration,
      ga4_enriched: true,
      ga4_enriched_at: updated.ga4_enriched_at,
      ga4_fetch_attempts: attempts,
      source_confidence: confidence.source_confidence,
      path_lost_at: confidence.path_lost_at,
    })
    .eq('lead_uuid', row.lead_uuid);

  await syncSourceDetailsFromCollected(row.lead_uuid, {
    ...updated,
    source_confidence: confidence.source_confidence,
    path_lost_at: confidence.path_lost_at,
  });
}

/**
 * Marks GA4 enrichment as given up after max attempts.
 * @param row - Current row.
 * @param attempts - Final attempt count (4).
 */
async function applyGa4GiveUp(row: CollectedDataEnrichmentRow, attempts: number): Promise<void> {
  const refSession = row.ref_code ? await lookupRefSession(row.ref_code) : null;
  const dniMatch = await lookupDniSource(row.called_number);

  const confidence = recomputeAfterGa4Attempt(
    { ...row, ga4_fetch_attempts: attempts, ga4_enriched: false },
    dniMatch?.source ?? null,
    Boolean(refSession),
  );

  const client = createServiceClient();
  await client
    .from('collected_data')
    .update({
      ga4_fetch_attempts: attempts,
      source_confidence: confidence.source_confidence,
      path_lost_at: confidence.path_lost_at,
    })
    .eq('lead_uuid', row.lead_uuid);

  await syncSourceDetailsFromCollected(row.lead_uuid, {
    ...row,
    ga4_fetch_attempts: attempts,
    source_confidence: confidence.source_confidence,
    path_lost_at: confidence.path_lost_at,
  });
}

/**
 * Updates leads.source_details JSONB from enriched collected_data fields.
 * @param leadUuid - Lead UUID.
 * @param row - Updated attribution fields.
 */
async function syncSourceDetailsFromCollected(
  leadUuid: string,
  row: CollectedDataEnrichmentRow & {
    source_confidence: SourceConfidence;
    path_lost_at: PathLostAt;
    ga4_enriched?: boolean;
    ga4_enriched_at?: string | null;
  },
): Promise<void> {
  const client = createServiceClient();
  const { data: lead } = await client
    .from('leads')
    .select('source_details')
    .eq('uuid', leadUuid)
    .maybeSingle();

  const existing = (lead?.source_details ?? {}) as Record<string, unknown>;
  const rawPhone = typeof existing.raw_phone === 'string' ? existing.raw_phone : null;

  const sourceDetails = collectedDataToSourceDetails(
    {
      lead_uuid: leadUuid,
      channel: row.channel,
      external_id: row.external_id,
      ref_code: row.ref_code,
      utm_source: row.utm_source,
      utm_medium: row.utm_medium,
      utm_campaign: row.utm_campaign,
      utm_content: row.utm_content,
      landing_page: row.landing_page,
      referral_domain: row.referral_domain,
      session_start: row.session_start,
      session_duration: row.session_duration,
      click_event: row.click_event,
      ga4_session_id: row.ga4_session_id,
      ad_id: row.ad_id,
      campaign_id: row.campaign_id,
      adset_id: row.adset_id,
      placement: row.placement,
      called_number: row.called_number,
      call_duration: row.call_duration,
      chatwoot_url: row.chatwoot_url,
      is_organic: row.is_organic,
      normalization_failed: row.normalization_failed,
      source_confidence: row.source_confidence,
      path_lost_at: row.path_lost_at,
      ga4_enriched: row.ga4_enriched ?? false,
      ga4_enriched_at: row.ga4_enriched_at ?? null,
      ga4_fetch_attempts: row.ga4_fetch_attempts,
    },
    rawPhone,
  );

  await client
    .from('leads')
    .update({ source_details: sourceDetails as unknown as Json })
    .eq('uuid', leadUuid);
}

/**
 * Runs immediate GA4 attempts 1 and 2 inside waitUntil after lead creation.
 * @param leadUuid - Newly created lead UUID.
 */
export async function enrichFromGA4Immediate(leadUuid: string): Promise<void> {
  await enrichFromGA4(leadUuid);

  const client = createServiceClient();
  const { data } = await client
    .from('collected_data')
    .select('ga4_enriched, ga4_fetch_attempts, ref_code')
    .eq('lead_uuid', leadUuid)
    .maybeSingle();

  if (!data || data.ga4_enriched || !data.ref_code) return;
  if ((data.ga4_fetch_attempts as number) >= 1) {
    await enrichFromGA4(leadUuid);
  }
}
