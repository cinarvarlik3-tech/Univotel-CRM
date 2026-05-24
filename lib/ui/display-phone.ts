/**
 * Phone display helpers — show original input when normalization failed,
 * or @handle for Instagram leads stored in lead_phone.
 */
import { isInstagramLead } from '@/lib/leads/contact-identifier';
import type { SourceDetails } from '@/lib/leads/source-details';

type SourceDetailsLike = SourceDetails | Record<string, unknown>;

/** Lead-like object with phone and optional source_details. */
interface LeadPhoneDisplay {
  lead_phone: string;
  parent_phone?: string | null;
  message_from?: string | null;
  lead_source?: string | null;
  source_details?: SourceDetailsLike | null;
}

/**
 * Returns true when source_details indicates phone normalization failed.
 * @param sourceDetails - Lead source_details JSONB.
 * @returns Whether normalization failed flag is set.
 */
export function isPhoneNormalizationFailed(
  sourceDetails: SourceDetailsLike | null | undefined,
): boolean {
  return sourceDetails?.normalization_failed === true;
}

/**
 * Resolves the lead phone string for display.
 * When normalization failed, prefers the original raw input from source_details.
 * @param lead - Lead row with lead_phone and source_details.
 * @returns Phone number string for UI display.
 */
export function displayLeadPhone(lead: LeadPhoneDisplay): string {
  const sd = lead.source_details;
  if (sd && typeof sd === 'object' && sd.normalization_failed === true) {
    if (typeof sd.raw_phone === 'string' && sd.raw_phone.length > 0) {
      return sd.raw_phone;
    }
  }
  return lead.lead_phone;
}

/**
 * Resolves the lead contact identifier for display (phone or @instagram handle).
 * @param lead - Lead row with lead_phone, message_from, and optional source_details.
 * @returns Phone, handle, or em dash when empty.
 */
export function displayLeadContactIdentifier(lead: LeadPhoneDisplay): string {
  if (isInstagramLead(lead)) {
    const handle = lead.lead_phone?.trim();
    if (!handle) return '—';
    return handle.startsWith('@') ? handle : `@${handle}`;
  }

  return displayLeadPhone(lead);
}

/**
 * Resolves parent phone for display — returns stored value as-is.
 * @param parentPhone - Parent phone field from lead row.
 * @returns Display string or em dash.
 */
export function displayParentPhone(parentPhone: string | null | undefined): string {
  return parentPhone ?? '—';
}
