/**
 * Locale-aware display labels for CRM enum/slug values in UI controls.
 */
import type { Locale } from '@/lib/i18n/types';
import { en } from '@/lib/i18n/messages/en';
import { tr } from '@/lib/i18n/messages/tr';
import { createTranslator } from '@/lib/i18n/create-translator';

const FUNNEL_KEY: Record<string, string> = {
  yeni: 'funnel_yeni',
  aranacak: 'funnel_aranacak',
  arandi: 'funnel_arandi',
  'arandi-acmadi': 'funnel_arandi_acmadi',
  'bizi-aradi-konustuk': 'funnel_bizi_aradi',
  ziyaret: 'funnel_ziyaret',
  'ziyaret-etmedi': 'funnel_ziyaret_etmedi',
  'ziyaret-etti': 'funnel_ziyaret_etti',
  'teklif-gonderildi': 'funnel_teklif',
  'kapora-alindi': 'funnel_kapora',
  'sozlesme-imzalandi': 'funnel_sozlesme',
  'ziyaret-ama-almayacak': 'funnel_ziyaret_ama',
  ilgilenmiyor: 'funnel_ilgilenmiyor',
};

const LOSS_KEY: Record<string, string> = {
  price: 'loss_price',
  location: 'loss_location',
  competitor: 'loss_competitor',
  no_response: 'loss_no_response',
  not_student: 'loss_not_student',
  already_placed: 'loss_already_placed',
  timing: 'loss_timing',
  other: 'loss_other',
  'sure-asildi': 'loss_sure_asildi',
};

const TASK_KEY: Record<string, string> = {
  callback: 'task_callback',
  follow_up: 'task_follow_up',
  tour_reminder: 'task_tour_reminder',
  document_collection: 'task_document_collection',
  contract_prep: 'task_contract_prep',
  placement_follow_up: 'task_placement_follow_up',
};

const SOURCE_KEY: Record<string, string> = {
  whatsapp: 'source_whatsapp',
  instagram: 'source_instagram',
  netgsm_call: 'source_netgsm_call',
  whatsapp_call: 'source_whatsapp_call',
  manual: 'source_manual',
  form: 'source_form',
  'google-ads': 'source_google_ads',
  'meta-ads': 'source_meta_ads',
  'google-maps': 'source_google_maps',
  sahibinden: 'source_sahibinden',
};

const CHANNEL_KEY: Record<string, string> = {
  whatsapp: 'channel_whatsapp',
  instagram: 'channel_instagram',
  netgsm: 'channel_netgsm',
  manual: 'channel_manual',
  form: 'channel_form',
};

const STAGE_KEY: Record<string, string> = {
  'pre-sinav': 'stage_pre_sinav',
  yerlesti: 'stage_yerlesti',
  'yeni-giris': 'stage_yeni_giris',
  erasmus: 'stage_erasmus',
  unknown: 'stage_unknown',
};

const UNI_YEAR_KEY: Record<string, string> = {
  '1-sinif': 'uni_1_sinif',
  '2-sinif': 'uni_2_sinif',
  '3-sinif': 'uni_3_sinif',
  '4-sinif': 'uni_4_sinif',
  universitede: 'uni_universitede',
};

const DORM_KEY: Record<string, string> = {
  'kyk-sonuc-bekliyor': 'dorm_kyk',
  'universite-yurdu-sonuc-bekliyor': 'dorm_universite',
  'ibb-yurdu-sonuc-bekliyor': 'dorm_ibb',
};

const PERSONA_KEY: Record<string, string> = {
  ogrenci: 'persona_ogrenci',
  veli: 'persona_veli',
};

const SPECIAL_KEY: Record<string, string> = {
  univotelli: 'special_univotelli',
  'ogrenci-degil': 'special_ogrenci_degil',
};

const LANG_KEY: Record<string, string> = {
  tr: 'lang_tr',
  en: 'lang_en',
  de: 'lang_de',
};

const GENDER_KEY: Record<string, string> = {
  male: 'gender_male',
  female: 'gender_female',
  other: 'gender_other',
};

const ROOM_KEY: Record<string, string> = {
  single: 'room_single',
  double: 'room_double',
  triple: 'room_triple',
  quad: 'room_quad',
};

const SLA_KEY: Record<string, string> = {
  on_time: 'sla_on_time',
  breached: 'sla_breached',
};

const ARCHIVE_KEY: Record<string, string> = {
  won: 'archive_won',
  lost: 'archive_lost',
};

const INTERACTION_KEY: Record<string, string> = {
  call_success: 'interaction_call_success',
  call_fail: 'interaction_call_fail',
  message_sent: 'interaction_message_sent',
  message_received: 'interaction_message_received',
  whatsapp_call: 'interaction_whatsapp_call',
  status_change: 'interaction_status_change',
  duplicate_submission: 'interaction_duplicate',
  reassignment: 'interaction_reassignment',
  form_submitted: 'interaction_form_submitted',
  callback_scheduled: 'interaction_callback_scheduled',
  correction: 'interaction_correction',
};

const GROUP_MAP: Record<string, Record<string, string>> = {
  funnel: FUNNEL_KEY,
  loss: LOSS_KEY,
  task: TASK_KEY,
  source: SOURCE_KEY,
  channel: CHANNEL_KEY,
  stage: STAGE_KEY,
  uniYear: UNI_YEAR_KEY,
  dorm: DORM_KEY,
  persona: PERSONA_KEY,
  special: SPECIAL_KEY,
  language: LANG_KEY,
  gender: GENDER_KEY,
  room: ROOM_KEY,
  sla: SLA_KEY,
  archive: ARCHIVE_KEY,
  interaction: INTERACTION_KEY,
};

/**
 * Returns a localized display label for a CRM enum/slug value.
 * Falls back to the raw value when no mapping exists.
 * @param locale - Active UI locale.
 * @param group - Enum group name.
 * @param value - Stored slug value.
 */
export function formatEnumLabel(locale: Locale, group: string, value: string): string {
  const map = GROUP_MAP[group];
  const enumKey = map?.[value];
  if (!enumKey) return value.replace(/-/g, ' ');

  const messages = locale === 'tr' ? tr : en;
  const t = createTranslator(messages);
  return t(`enums.${enumKey}`);
}

/**
 * Returns localized sort column label.
 * @param locale - Active UI locale.
 * @param column - Sort column key.
 */
export function formatSortColumn(locale: Locale, column: string): string {
  const messages = locale === 'tr' ? tr : en;
  const t = createTranslator(messages);
  const key = `sort.${column}`;
  const resolved = t(key);
  return resolved === key ? column : resolved;
}

/**
 * Returns localized role label.
 * @param locale - Active UI locale.
 * @param role - salespeople.role value.
 */
export function formatRoleLabel(locale: Locale, role: string): string {
  const messages = locale === 'tr' ? tr : en;
  const t = createTranslator(messages);
  const key = `roles.${role}`;
  const resolved = t(key);
  return resolved === key ? role : resolved;
}

/**
 * Returns localized source_details field label.
 * @param locale - Active UI locale.
 * @param field - source_details key.
 */
export function formatSourceDetailsLabel(locale: Locale, field: string): string {
  const camelToSnake: Record<string, string> = {
    channel: 'channel',
    external_id: 'externalId',
    called_number: 'calledNumber',
    call_duration: 'callDuration',
    ref_code: 'refCode',
    ad_id: 'adId',
    campaign_id: 'campaignId',
    adset_id: 'adsetId',
    placement: 'placement',
    chatwoot_url: 'chatwoot',
    utm_source: 'utmSource',
    utm_medium: 'utmMedium',
    utm_campaign: 'utmCampaign',
    utm_content: 'utmContent',
    landing_page: 'landingPage',
    referral_domain: 'referralDomain',
    session_start: 'sessionStart',
    session_duration: 'sessionDuration',
    click_event: 'clickEvent',
    ga4_session_id: 'ga4SessionId',
    source_confidence: 'sourceConfidence',
    path_lost_at: 'pathLostAt',
    ga4_enriched: 'ga4Enriched',
    ga4_enriched_at: 'ga4EnrichedAt',
    ga4_fetch_attempts: 'ga4FetchAttempts',
    is_organic: 'organic',
    normalization_failed: 'normalizationFailed',
    raw_phone: 'originalPhone',
  };

  const msgKey = camelToSnake[field] ?? field;
  const messages = locale === 'tr' ? tr : en;
  const t = createTranslator(messages);
  const key = `sourceDetails.${msgKey}`;
  const resolved = t(key);
  return resolved === key ? field : resolved;
}

/**
 * Returns template variable field options for campaign form.
 * @param locale - Active UI locale.
 */
export function getTemplateVariableFieldOptions(
  locale: Locale,
): ReadonlyArray<{ value: string; label: string }> {
  const messages = locale === 'tr' ? tr : en;
  const t = createTranslator(messages);
  return [
    { value: 'lead_name', label: t('campaigns.fieldLeadName') },
    { value: 'lead_phone', label: t('campaigns.fieldPhone') },
    { value: 'language', label: t('campaigns.fieldLanguage') },
    { value: 'funnel_status', label: t('campaigns.fieldFunnelStatus') },
    { value: 'university', label: t('campaigns.fieldUniversity') },
    { value: 'budget_min', label: t('campaigns.fieldBudgetMin') },
    { value: 'budget_max', label: t('campaigns.fieldBudgetMax') },
    { value: 'interested_hotel', label: t('campaigns.fieldInterestedHotel') },
  ];
}

/**
 * Validates template slots and returns a localized error key or null.
 * @param slots - Template variable rows.
 * @param locale - Active UI locale.
 */
export function validateTemplateSlotsLocalized(
  slots: Array<{ slot: number; field: string }>,
  locale: Locale,
): string | null {
  const messages = locale === 'tr' ? tr : en;
  const t = createTranslator(messages);
  const options = getTemplateVariableFieldOptions(locale);

  if (slots.length === 0) return t('campaigns.validationAddVariable');

  const slotNumbers = slots.map((s) => s.slot);
  if (new Set(slotNumbers).size !== slotNumbers.length) {
    return t('campaigns.validationUniqueSlots');
  }

  for (const row of slots) {
    if (!row.field.trim()) return t('campaigns.validationChooseField');
    const allowed = options.some((o) => o.value === row.field);
    if (!allowed) return t('campaigns.validationUnknownField', { field: row.field });
  }

  return null;
}
