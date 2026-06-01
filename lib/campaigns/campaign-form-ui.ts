/**
 * UI state helpers for campaign creation (audience filters → segment, template slots).
 */
import { validateTemplateSlotsLocalized } from '@/lib/i18n/enum-labels';
import type { Locale } from '@/lib/i18n/types';
import type { FilterCondition } from '@/lib/query/filter-builder';
import type { CampaignSegment } from '@/types/domain';

/** Audience filter state mirrored from the leads list toolbar pattern. */
export interface CampaignAudienceState {
  filters: Record<string, string>;
  createdFrom: string;
  createdTo: string;
  slaFrom: string;
  slaTo: string;
  scoreMin: string;
}

export const DEFAULT_CAMPAIGN_AUDIENCE: CampaignAudienceState = {
  filters: { funnel_status: 'yeni' },
  createdFrom: '',
  createdTo: '',
  slaFrom: '',
  slaTo: '',
  scoreMin: '',
};

/** One WhatsApp template placeholder mapped to a CRM field. */
export interface TemplateVariableSlot {
  id: string;
  slot: number;
  field: string;
}

export const TEMPLATE_VARIABLE_FIELD_OPTIONS: ReadonlyArray<{ value: string; label: string }> = [
  { value: 'lead_name', label: 'Lead name' },
  { value: 'lead_phone', label: 'Phone number' },
  { value: 'language', label: 'Language' },
  { value: 'funnel_status', label: 'Funnel status' },
  { value: 'university', label: 'University' },
  { value: 'budget_min', label: 'Budget (min)' },
  { value: 'budget_max', label: 'Budget (max)' },
  { value: 'interested_hotel', label: 'Interested hotel (first)' },
];

export const DEFAULT_TEMPLATE_SLOTS: TemplateVariableSlot[] = [
  { id: 'slot-1', slot: 1, field: 'lead_name' },
];

/**
 * Converts audience UI state to a campaign segment payload.
 * @param state - Audience filter state from the form.
 */
export function audienceStateToSegment(state: CampaignAudienceState): CampaignSegment {
  const filters: FilterCondition[] = [];

  for (const [field, value] of Object.entries(state.filters)) {
    if (value.trim()) {
      filters.push({ field, operator: 'eq', value: value.trim() });
    }
  }

  if (state.scoreMin.trim()) {
    filters.push({ field: 'lead_score', operator: 'gte', value: state.scoreMin.trim() });
  }

  if (state.createdFrom) {
    filters.push({
      field: 'created_at',
      operator: 'gte',
      value: `${state.createdFrom}T00:00:00.000Z`,
    });
  }
  if (state.createdTo) {
    filters.push({
      field: 'created_at',
      operator: 'lte',
      value: `${state.createdTo}T23:59:59.999Z`,
    });
  }

  if (state.slaFrom) {
    filters.push({
      field: 'sla_deadline',
      operator: 'gte',
      value: `${state.slaFrom}T00:00:00.000Z`,
    });
  }
  if (state.slaTo) {
    filters.push({
      field: 'sla_deadline',
      operator: 'lte',
      value: `${state.slaTo}T23:59:59.999Z`,
    });
  }

  return { filters };
}

/**
 * Converts template variable slots to API record (slot index → CRM field).
 * @param slots - Ordered template variable rows.
 */
export function templateSlotsToVariables(slots: TemplateVariableSlot[]): Record<string, string> {
  const sorted = [...slots].sort((a, b) => a.slot - b.slot);
  const result: Record<string, string> = {};

  for (const row of sorted) {
    if (!row.field.trim()) continue;
    result[String(row.slot)] = row.field.trim();
  }

  return result;
}

/**
 * Validates template slots before submit.
 * @param slots - Template variable rows.
 * @param locale - UI locale for error messages.
 * @returns Localized error message or null if valid.
 */
export function validateTemplateSlots(
  slots: TemplateVariableSlot[],
  locale: Locale = 'en',
): string | null {
  return validateTemplateSlotsLocalized(slots, locale);
}
