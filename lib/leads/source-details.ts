/**
 * source_details JSONB builder functions.
 * All webhook sources write the same schema with null for missing values.
 * Keys must match collected_data column names for Phase 4 parity.
 */

/** computed source_confidence values stored in source_details. */
export type SourceConfidence = 'full' | 'lossy' | 'inferred' | 'unknown';

/** computed path_lost_at values stored in source_details. */
export type PathLostAt =
  | 'full'
  | 'lost_after_click'
  | 'lost_at_channel'
  | 'lost_at_source'
  | 'lost_at_session'
  | 'unknown';

/** Standardized source_details JSONB shape stored on leads. */
export interface SourceDetails {
  channel: 'whatsapp' | 'instagram' | 'whatsapp_call' | 'netgsm_call';
  external_id: string;
  called_number: string | null;
  call_duration: number | null;
  ref_code: string | null;
  ad_id: string | null;
  campaign_id: string | null;
  adset_id: string | null;
  placement: string | null;
  chatwoot_url: string | null;
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
  source_confidence: SourceConfidence | null;
  path_lost_at: PathLostAt | null;
  ga4_enriched: boolean | null;
  ga4_enriched_at: string | null;
  ga4_fetch_attempts: number | null;
  is_organic: boolean | null;
  normalization_failed: boolean;
  /** Original phone string when normalization_failed is true (legacy field). */
  raw_phone: string | null;
}

/** Human-readable labels for source_details keys in the UI. */
export const SOURCE_DETAILS_LABELS: Record<keyof SourceDetails, string> = {
  channel: 'Channel',
  external_id: 'External ID',
  called_number: 'Called number',
  call_duration: 'Call duration',
  ref_code: 'Ref code',
  ad_id: 'Ad ID',
  campaign_id: 'Campaign ID',
  adset_id: 'Ad set ID',
  placement: 'Placement',
  chatwoot_url: 'Chatwoot',
  utm_source: 'UTM source',
  utm_medium: 'UTM medium',
  utm_campaign: 'UTM campaign',
  utm_content: 'UTM content',
  landing_page: 'Landing page',
  referral_domain: 'Referral domain',
  session_start: 'Session start',
  session_duration: 'Session duration (s)',
  click_event: 'Click event',
  ga4_session_id: 'GA4 session ID',
  source_confidence: 'Source confidence',
  path_lost_at: 'Path lost at',
  ga4_enriched: 'GA4 enriched',
  ga4_enriched_at: 'GA4 enriched at',
  ga4_fetch_attempts: 'GA4 fetch attempts',
  is_organic: 'Organic',
  normalization_failed: 'Normalization failed',
  raw_phone: 'Original phone',
};

/** All required keys for source_details validation. */
export const SOURCE_DETAILS_KEYS: (keyof SourceDetails)[] = [
  'channel',
  'external_id',
  'called_number',
  'call_duration',
  'ref_code',
  'ad_id',
  'campaign_id',
  'adset_id',
  'placement',
  'chatwoot_url',
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_content',
  'landing_page',
  'referral_domain',
  'session_start',
  'session_duration',
  'click_event',
  'ga4_session_id',
  'source_confidence',
  'path_lost_at',
  'ga4_enriched',
  'ga4_enriched_at',
  'ga4_fetch_attempts',
  'is_organic',
  'normalization_failed',
  'raw_phone',
];

/**
 * Creates an empty SourceDetails object with all keys present.
 * @param overrides - Partial values to merge into defaults.
 * @returns Complete SourceDetails object.
 */
function baseSourceDetails(overrides: Partial<SourceDetails>): SourceDetails {
  return {
    channel: 'whatsapp',
    external_id: '',
    called_number: null,
    call_duration: null,
    ref_code: null,
    ad_id: null,
    campaign_id: null,
    adset_id: null,
    placement: null,
    chatwoot_url: null,
    utm_source: null,
    utm_medium: null,
    utm_campaign: null,
    utm_content: null,
    landing_page: null,
    referral_domain: null,
    session_start: null,
    session_duration: null,
    click_event: null,
    ga4_session_id: null,
    source_confidence: null,
    path_lost_at: null,
    ga4_enriched: null,
    ga4_enriched_at: null,
    ga4_fetch_attempts: null,
    is_organic: null,
    normalization_failed: false,
    raw_phone: null,
    ...overrides,
  };
}

/**
 * Builds source_details from a Chatwoot webhook payload.
 * @param payload - Parsed Chatwoot payload fields.
 * @param normalizationFailed - Whether phone normalization failed.
 * @returns SourceDetails object.
 */
export function buildChatwootSourceDetails(
  payload: {
    channel: 'whatsapp' | 'instagram';
    externalId: string;
    chatwootUrl?: string | null;
    referral?: {
      ref_code?: string;
      ad_id?: string;
      campaign_id?: string;
      adset_id?: string;
      placement?: string;
    };
    isOrganic?: boolean | null;
  },
  normalizationFailed: boolean,
): SourceDetails {
  return baseSourceDetails({
    channel: payload.channel,
    external_id: payload.externalId,
    chatwoot_url: payload.chatwootUrl ?? null,
    ref_code: payload.referral?.ref_code ?? null,
    ad_id: payload.referral?.ad_id ?? null,
    campaign_id: payload.referral?.campaign_id ?? null,
    adset_id: payload.referral?.adset_id ?? null,
    placement: payload.referral?.placement ?? null,
    is_organic: payload.isOrganic ?? null,
    normalization_failed: normalizationFailed,
  });
}

/**
 * Builds source_details from a WhatsApp Cloud API call payload.
 * @param payload - Parsed WA call payload fields.
 * @param normalizationFailed - Whether phone normalization failed.
 * @returns SourceDetails object.
 */
export function buildWhatsAppCallSourceDetails(
  payload: {
    externalId: string;
    callDuration?: number | null;
  },
  normalizationFailed: boolean,
): SourceDetails {
  return baseSourceDetails({
    channel: 'whatsapp_call',
    external_id: payload.externalId,
    call_duration: payload.callDuration ?? null,
    normalization_failed: normalizationFailed,
  });
}

/**
 * Builds source_details from a NetGSM webhook payload.
 * @param payload - Parsed NetGSM payload fields.
 * @param normalizationFailed - Whether phone normalization failed.
 * @returns SourceDetails object.
 */
export function buildNetGsmSourceDetails(
  payload: {
    externalId: string;
    calledNumber?: string | null;
    callDuration?: number | null;
  },
  normalizationFailed: boolean,
): SourceDetails {
  return baseSourceDetails({
    channel: 'netgsm_call',
    external_id: payload.externalId,
    called_number: payload.calledNumber ?? null,
    call_duration: payload.callDuration ?? null,
    normalization_failed: normalizationFailed,
  });
}

/**
 * Builds source_details for manual lead creation.
 * @param normalizationFailed - Whether phone normalization failed.
 * @returns SourceDetails object.
 */
export function buildManualSourceDetails(normalizationFailed: boolean): SourceDetails {
  return baseSourceDetails({
    channel: 'whatsapp',
    external_id: `manual_${Date.now()}`,
    normalization_failed: normalizationFailed,
  });
}
