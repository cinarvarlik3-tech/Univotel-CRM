/**
 * Builds collected_data rows and syncs source_details JSONB at lead creation.
 */
import { computeAttributionConfidence } from '@/lib/attribution/compute-confidence';
import type {
  BuildCollectedDataInput,
  CollectedDataRow,
  CollectedDataChannel,
} from '@/lib/attribution/types';
import { lookupDniSource } from '@/lib/dni/list-active-numbers';
import { lookupRefSession } from '@/lib/ref/create-ref-session';
import type { SourceDetails } from '@/lib/leads/source-details';
import { createServiceClient } from '@/lib/supabase/service';
import type { Json } from '@/types/database';

/**
 * Builds a collected_data row from webhook fields and ref_sessions lookup.
 * @param input - Raw attribution fields from lead creation.
 * @returns Complete collected_data insert payload.
 */
export async function buildCollectedDataRow(
  input: BuildCollectedDataInput,
): Promise<CollectedDataRow> {
  const refCode = input.ref_code ?? null;
  const refSession = refCode ? await lookupRefSession(refCode) : null;
  const dniMatch = await lookupDniSource(input.called_number ?? null);

  const utm_source =
    input.utm_source ?? refSession?.utm_source ?? (dniMatch ? dniMatch.source : null);
  const utm_medium =
    input.utm_medium ??
    refSession?.utm_medium ??
    (dniMatch && !refSession ? 'virtual-number' : null);
  const utm_campaign = input.utm_campaign ?? refSession?.utm_campaign ?? null;
  const utm_content = input.utm_content ?? refSession?.utm_content ?? null;
  const landing_page = input.landing_page ?? refSession?.landing_page ?? null;
  const referral_domain = input.referral_domain ?? refSession?.referral_domain ?? null;

  const ga4_enriched = input.ga4_enriched ?? false;
  const ga4_fetch_attempts = input.ga4_fetch_attempts ?? 0;

  const { source_confidence, path_lost_at } = computeAttributionConfidence({
    ref_code: refCode,
    ga4_enriched,
    ga4_fetch_attempts,
    ad_id: input.ad_id ?? null,
    called_number: input.called_number ?? null,
    dniSource: dniMatch?.source ?? null,
    channel: input.channel,
    hasUtm: Boolean(utm_source || utm_medium || utm_campaign),
    refSessionFound: Boolean(refSession),
  });

  return {
    lead_uuid: input.leadUuid,
    channel: input.channel,
    external_id: input.external_id,
    ref_code: refCode,
    utm_source,
    utm_medium,
    utm_campaign,
    utm_content,
    landing_page,
    referral_domain,
    session_start: input.session_start ?? null,
    session_duration: input.session_duration ?? null,
    click_event: input.click_event ?? null,
    ga4_session_id: input.ga4_session_id ?? null,
    ad_id: input.ad_id ?? null,
    campaign_id: input.campaign_id ?? null,
    adset_id: input.adset_id ?? null,
    placement: input.placement ?? null,
    called_number: input.called_number ?? null,
    call_duration: input.call_duration ?? null,
    chatwoot_url: input.chatwoot_url ?? null,
    is_organic: input.is_organic ?? null,
    normalization_failed: input.normalization_failed,
    source_confidence,
    path_lost_at,
    ga4_enriched,
    ga4_enriched_at: input.ga4_enriched_at ?? null,
    ga4_fetch_attempts,
  };
}

/**
 * Maps collected_data fields to source_details JSONB (excluding table-only columns).
 * @param row - collected_data row.
 * @param rawPhone - Original phone when normalization failed.
 * @returns SourceDetails object for leads.source_details.
 */
export function collectedDataToSourceDetails(
  row: CollectedDataRow,
  rawPhone: string | null,
): SourceDetails {
  return {
    channel: row.channel,
    external_id: row.external_id,
    called_number: row.called_number,
    call_duration: row.call_duration,
    ref_code: row.ref_code,
    ad_id: row.ad_id,
    campaign_id: row.campaign_id,
    adset_id: row.adset_id,
    placement: row.placement,
    chatwoot_url: row.chatwoot_url,
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
    source_confidence: row.source_confidence,
    path_lost_at: row.path_lost_at,
    ga4_enriched: row.ga4_enriched,
    ga4_enriched_at: row.ga4_enriched_at,
    ga4_fetch_attempts: row.ga4_fetch_attempts,
    is_organic: row.is_organic,
    normalization_failed: row.normalization_failed,
    raw_phone: rawPhone,
  };
}

/**
 * Persists collected_data and updates leads.source_details for a new lead.
 * @param row - Built collected_data row.
 * @param rawPhone - Original phone when normalization failed.
 */
export async function persistCollectedData(
  row: CollectedDataRow,
  rawPhone: string | null,
): Promise<void> {
  const client = createServiceClient();
  const sourceDetails = collectedDataToSourceDetails(row, rawPhone);

  const { error: insertError } = await client.from('collected_data').insert({
    lead_uuid: row.lead_uuid,
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
    ga4_enriched: row.ga4_enriched,
    ga4_enriched_at: row.ga4_enriched_at,
    ga4_fetch_attempts: row.ga4_fetch_attempts,
  });

  if (insertError) {
    throw new Error(`collected_data insert failed: ${insertError.message}`);
  }

  const { error: updateError } = await client
    .from('leads')
    .update({ source_details: sourceDetails as unknown as Json })
    .eq('uuid', row.lead_uuid);

  if (updateError) {
    throw new Error(`leads source_details update failed: ${updateError.message}`);
  }
}

/**
 * Maps SourceDetails channel to collected_data channel enum.
 * @param channel - SourceDetails channel value.
 * @returns CollectedDataChannel.
 */
export function toCollectedDataChannel(channel: SourceDetails['channel']): CollectedDataChannel {
  return channel;
}

/**
 * Builds BuildCollectedDataInput from SourceDetails after lead UUID is known.
 * @param leadUuid - Created lead UUID.
 * @param sourceDetails - Initial source_details from webhook builder.
 * @returns Input for buildCollectedDataRow.
 */
export function sourceDetailsToBuildInput(
  leadUuid: string,
  sourceDetails: SourceDetails,
): BuildCollectedDataInput {
  return {
    leadUuid,
    channel: sourceDetails.channel,
    external_id: sourceDetails.external_id,
    ref_code: sourceDetails.ref_code,
    ad_id: sourceDetails.ad_id,
    campaign_id: sourceDetails.campaign_id,
    adset_id: sourceDetails.adset_id,
    placement: sourceDetails.placement,
    called_number: sourceDetails.called_number,
    call_duration: sourceDetails.call_duration,
    chatwoot_url: sourceDetails.chatwoot_url,
    is_organic: sourceDetails.is_organic,
    normalization_failed: sourceDetails.normalization_failed,
    utm_source: sourceDetails.utm_source,
    utm_medium: sourceDetails.utm_medium,
    utm_campaign: sourceDetails.utm_campaign,
    utm_content: sourceDetails.utm_content,
    landing_page: sourceDetails.landing_page,
    referral_domain: sourceDetails.referral_domain,
    session_start: sourceDetails.session_start,
    session_duration: sourceDetails.session_duration,
    click_event: sourceDetails.click_event,
    ga4_session_id: sourceDetails.ga4_session_id,
    ga4_enriched: sourceDetails.ga4_enriched ?? false,
    ga4_enriched_at: sourceDetails.ga4_enriched_at,
    ga4_fetch_attempts: sourceDetails.ga4_fetch_attempts ?? 0,
  };
}
