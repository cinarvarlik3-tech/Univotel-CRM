import { TIER_TO_BUTCE_LABEL, isBudgetTier } from '@/lib/chatwoot/custom-attributes';

/** Lead row subset for template resolution. */
export interface TemplateLeadRow {
  lead_name: string | null;
  lead_phone: string;
  language: string | null;
  funnel_status: string;
}

/** Lead details subset for template resolution. */
export interface TemplateLeadDetailsRow {
  university: string | null;
  budget_tier: string | null;
  budget_max: number | null;
  interested_hotel: string[] | null;
}

/** Result of template variable resolution. */
export type TemplateVariableResult =
  | { ok: true; parameters: string[] }
  | { ok: false; reason: 'missing_variable'; field: string };

/**
 * Resolves a single CRM field name to a string value.
 * @param field - Field key from template_variables map.
 * @param lead - Lead row.
 * @param details - Lead details row or null.
 * @returns Resolved string or null if missing.
 */
function resolveField(
  field: string,
  lead: TemplateLeadRow,
  details: TemplateLeadDetailsRow | null,
): string | null {
  if (field === 'lead_name') return lead.lead_name?.trim() || null;
  if (field === 'lead_phone') return lead.lead_phone;
  if (field === 'language') return lead.language;
  if (field === 'funnel_status') return lead.funnel_status;
  if (field === 'university') return details?.university?.trim() || null;
  if (field === 'budget_tier') {
    const tier = details?.budget_tier;
    if (!tier || !isBudgetTier(tier)) return null;
    return TIER_TO_BUTCE_LABEL[tier];
  }
  if (field === 'budget_max')
    return details?.budget_max != null ? String(details.budget_max) : null;
  if (field === 'interested_hotel' || field === 'interested_hotel.hotel_name') {
    const first = details?.interested_hotel?.[0];
    return first?.trim() || null;
  }
  return null;
}

/**
 * Resolves template placeholders in key order (1, 2, 3...).
 * @param templateVariables - Maps placeholder index → CRM field name.
 * @param lead - Lead row.
 * @param details - Lead details row.
 * @returns Ordered parameter strings or missing_variable error.
 */
export function resolveTemplateVariables(
  templateVariables: Record<string, string>,
  lead: TemplateLeadRow,
  details: TemplateLeadDetailsRow | null,
): TemplateVariableResult {
  const keys = Object.keys(templateVariables).sort((a, b) => Number(a) - Number(b));
  const parameters: string[] = [];

  for (const key of keys) {
    const field = templateVariables[key];
    const value = resolveField(field, lead, details);
    if (value === null || value === '') {
      return { ok: false, reason: 'missing_variable', field };
    }
    parameters.push(value);
  }

  return { ok: true, parameters };
}
