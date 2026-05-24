/**
 * Attribution domain types for collected_data and source_details parity.
 */

/** collected_data.channel values. */
export type CollectedDataChannel = 'whatsapp' | 'instagram' | 'netgsm_call' | 'whatsapp_call';

/** computed source_confidence values. */
export type SourceConfidence = 'full' | 'lossy' | 'inferred' | 'unknown';

/** computed path_lost_at values. */
export type PathLostAt =
  | 'full'
  | 'lost_after_click'
  | 'lost_at_channel'
  | 'lost_at_source'
  | 'lost_at_session'
  | 'unknown';

/** Full collected_data row shape. */
export interface CollectedDataRow {
  id?: string;
  lead_uuid: string;
  channel: CollectedDataChannel;
  external_id: string;
  ref_code: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  landing_page: string | null;
  referral_domain: string | null;
  session_start: string | null;
  session_duration: number | null;
  click_event: string | null;
  ga4_session_id: string | null;
  ad_id: string | null;
  campaign_id: string | null;
  adset_id: string | null;
  placement: string | null;
  called_number: string | null;
  call_duration: number | null;
  chatwoot_url: string | null;
  is_organic: boolean | null;
  normalization_failed: boolean;
  source_confidence: SourceConfidence;
  path_lost_at: PathLostAt;
  ga4_enriched: boolean;
  ga4_enriched_at: string | null;
  ga4_fetch_attempts: number;
  created_at?: string;
}

/** Inputs for building collected_data at lead creation. */
export interface BuildCollectedDataInput {
  leadUuid: string;
  channel: CollectedDataChannel;
  external_id: string;
  ref_code?: string | null;
  ad_id?: string | null;
  campaign_id?: string | null;
  adset_id?: string | null;
  placement?: string | null;
  called_number?: string | null;
  call_duration?: number | null;
  chatwoot_url?: string | null;
  is_organic?: boolean | null;
  normalization_failed: boolean;
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
  utm_content?: string | null;
  landing_page?: string | null;
  referral_domain?: string | null;
  session_start?: string | null;
  session_duration?: number | null;
  click_event?: string | null;
  ga4_session_id?: string | null;
  ga4_enriched?: boolean;
  ga4_enriched_at?: string | null;
  ga4_fetch_attempts?: number;
}

/** Context passed to source_confidence computation. */
export interface ConfidenceContext {
  ref_code: string | null;
  ga4_enriched: boolean;
  ga4_fetch_attempts: number;
  ad_id: string | null;
  called_number: string | null;
  dniSource: string | null;
  channel: CollectedDataChannel;
  hasUtm: boolean;
  refSessionFound: boolean;
}
