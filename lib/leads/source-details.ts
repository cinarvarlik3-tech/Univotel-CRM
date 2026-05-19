/**
 * source_details JSONB builder functions.
 * All webhook sources write the same schema with null for missing values.
 */

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
  is_organic: boolean | null;
  referral_domain: string | null;
  normalization_failed: boolean;
}

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
  'is_organic',
  'referral_domain',
  'normalization_failed',
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
    is_organic: null,
    referral_domain: null,
    normalization_failed: false,
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
 * Builds source_details from a NetGSM webhook payload (stub).
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
