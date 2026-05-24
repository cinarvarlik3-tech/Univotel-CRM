/**
 * Merges Chatwoot webhook source_details into an existing lead after duplicate phone match.
 */
import { createServiceClient } from '@/lib/supabase/service';
import type { SourceDetails } from '@/lib/leads/source-details';
import type { Json } from '@/types/database';

/**
 * Merges incoming Chatwoot source_details onto an existing lead row.
 * @param leadUuid - Existing lead UUID from dedup.
 * @param incoming - Source details from the current webhook.
 * @param options - Optional display fields to fill when empty on the lead.
 */
export async function mergeChatwootIntoExistingLead(
  leadUuid: string,
  incoming: SourceDetails,
  options?: { leadName?: string | null; messageFrom?: string | null },
): Promise<void> {
  const client = createServiceClient();

  const { data: row, error } = await client
    .from('leads')
    .select('source_details, lead_name, message_from')
    .eq('uuid', leadUuid)
    .single();

  if (error || !row) {
    throw new Error(`mergeChatwoot: lead lookup failed: ${error?.message ?? 'not found'}`);
  }

  const existing = (row.source_details ?? {}) as Partial<SourceDetails>;

  const merged: SourceDetails = {
    channel: incoming.channel ?? (existing.channel as SourceDetails['channel']) ?? 'whatsapp',
    external_id:
      incoming.external_id.startsWith('conv_') &&
      incoming.external_id !== 'conv_unknown_msg_unknown'
        ? incoming.external_id
        : ((existing.external_id as string) ?? incoming.external_id),
    called_number: incoming.called_number ?? existing.called_number ?? null,
    call_duration: incoming.call_duration ?? existing.call_duration ?? null,
    ref_code: incoming.ref_code ?? existing.ref_code ?? null,
    ad_id: incoming.ad_id ?? existing.ad_id ?? null,
    campaign_id: incoming.campaign_id ?? existing.campaign_id ?? null,
    adset_id: incoming.adset_id ?? existing.adset_id ?? null,
    placement: incoming.placement ?? existing.placement ?? null,
    chatwoot_url: incoming.chatwoot_url ?? existing.chatwoot_url ?? null,
    utm_source: incoming.utm_source ?? existing.utm_source ?? null,
    utm_medium: incoming.utm_medium ?? existing.utm_medium ?? null,
    utm_campaign: incoming.utm_campaign ?? existing.utm_campaign ?? null,
    utm_content: incoming.utm_content ?? existing.utm_content ?? null,
    landing_page: incoming.landing_page ?? existing.landing_page ?? null,
    referral_domain: incoming.referral_domain ?? existing.referral_domain ?? null,
    session_start: incoming.session_start ?? existing.session_start ?? null,
    session_duration: incoming.session_duration ?? existing.session_duration ?? null,
    click_event: incoming.click_event ?? existing.click_event ?? null,
    ga4_session_id: incoming.ga4_session_id ?? existing.ga4_session_id ?? null,
    source_confidence: incoming.source_confidence ?? existing.source_confidence ?? null,
    path_lost_at: incoming.path_lost_at ?? existing.path_lost_at ?? null,
    ga4_enriched: incoming.ga4_enriched ?? existing.ga4_enriched ?? null,
    ga4_enriched_at: incoming.ga4_enriched_at ?? existing.ga4_enriched_at ?? null,
    ga4_fetch_attempts: incoming.ga4_fetch_attempts ?? existing.ga4_fetch_attempts ?? null,
    is_organic: incoming.is_organic ?? existing.is_organic ?? null,
    normalization_failed: incoming.normalization_failed || Boolean(existing.normalization_failed),
    raw_phone: incoming.raw_phone ?? existing.raw_phone ?? null,
  };

  const updates: {
    source_details: Json;
    lead_name?: string;
    message_from?: string | null;
  } = {
    source_details: merged as unknown as Json,
  };

  if (!row.lead_name?.trim() && options?.leadName?.trim()) {
    updates.lead_name = options.leadName.trim();
  }

  if (options?.messageFrom) {
    updates.message_from = options.messageFrom;
  }

  const { error: updateError } = await client.from('leads').update(updates).eq('uuid', leadUuid);

  if (updateError) {
    throw new Error(`mergeChatwoot: update failed: ${updateError.message}`);
  }
}
