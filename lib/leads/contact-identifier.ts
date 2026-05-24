/**
 * Lead contact identifier helpers — phone or Instagram handle stored in lead_phone.
 */

/** How the value in leads.lead_phone should be interpreted. */
export type LeadContactIdentifierKind = 'phone' | 'instagram';

/**
 * Returns true when the lead row represents an Instagram contact (handle in lead_phone).
 * @param lead - Lead row or subset with message_from / lead_source.
 */
export function isInstagramLead(lead: {
  message_from?: string | null;
  lead_source?: string | null;
}): boolean {
  return lead.message_from === 'instagram' || lead.lead_source === 'instagram';
}
