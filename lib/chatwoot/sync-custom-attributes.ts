/**
 * CRM → Chatwoot custom-attribute outbound payload builder.
 */
import {
  LOSS_REASON_TO_KAYIP_NEDENI,
  TIER_TO_BUTCE_LABEL,
  formatMoveInForChatwoot,
  isBudgetTier,
  mapOdaTipiFromCrm,
  STUDENT_GENDER_TO_OGRENCI_CINSIYET,
} from '@/lib/chatwoot/custom-attributes';

/** Lead + details subset used to build outbound custom attributes. */
export interface CrmCustomAttrState {
  loss_reason: string | null;
  university: string | null;
  budget_tier: string | null;
  move_in: string | null;
  room_category: string | null;
  room_type: string[];
  student_gender: string | null;
  interested_hotel: string[];
}

/** Custom-attribute keys the CRM pushes to Chatwoot. */
export const CRM_CUSTOM_ATTR_SYNC_FIELDS = [
  'university',
  'butce',
  'tasinma_tarihi',
  'oda_tiipi',
  'kayip_nedeni',
  'ogrenci_cinsiyet',
  'ilgili_otel',
] as const;

/**
 * Builds the Chatwoot custom_attributes object from current CRM state.
 * Omits keys when CRM has no mappable value (Chatwoot keeps existing values).
 * @param state - Lead and lead_details fields.
 */
export function buildCustomAttributesFromCrm(
  state: CrmCustomAttrState,
): Record<string, string | null> {
  const attrs: Record<string, string | null> = {};

  if (state.university) {
    attrs.university = state.university;
  }

  if (state.budget_tier && isBudgetTier(state.budget_tier)) {
    attrs.butce = TIER_TO_BUTCE_LABEL[state.budget_tier];
  }

  const moveIn = formatMoveInForChatwoot(state.move_in);
  if (moveIn) {
    attrs.tasinma_tarihi = moveIn;
  }

  const odaTipi = mapOdaTipiFromCrm(state.room_category, state.room_type);
  if (odaTipi) {
    attrs.oda_tiipi = odaTipi;
  }

  if (state.loss_reason) {
    attrs.kayip_nedeni = LOSS_REASON_TO_KAYIP_NEDENI[state.loss_reason] ?? null;
  }

  if (state.student_gender) {
    attrs.ogrenci_cinsiyet = STUDENT_GENDER_TO_OGRENCI_CINSIYET[state.student_gender] ?? null;
  }

  const hotel = state.interested_hotel[0];
  if (hotel) {
    attrs.ilgili_otel = hotel;
  }

  return attrs;
}

/** lead_details fields that trigger custom-attribute push. */
export const CRM_CUSTOM_ATTR_DETAIL_FIELDS = [
  'university',
  'budget_tier',
  'move_in',
  'room_category',
  'room_type',
  'student_gender',
  'interested_hotel',
] as const;

/** leads fields that trigger custom-attribute push. */
export const CRM_CUSTOM_ATTR_LEAD_FIELDS = ['loss_reason'] as const;

/**
 * Returns true when lead_details updates include custom-attribute-mapped fields.
 */
export function hasCustomAttrMappedDetailUpdates(updates: Record<string, unknown>): boolean {
  return CRM_CUSTOM_ATTR_DETAIL_FIELDS.some((field) => field in updates);
}

/**
 * Returns true when lead updates include custom-attribute-mapped fields.
 */
export function hasCustomAttrMappedLeadUpdates(updates: Record<string, unknown>): boolean {
  return CRM_CUSTOM_ATTR_LEAD_FIELDS.some((field) => field in updates);
}
