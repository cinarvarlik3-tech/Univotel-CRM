/**
 * Lead deduplication logic.
 * Prevents duplicate lead creation when phone or parent_phone matches existing active lead.
 */
import { createServiceClient } from '@/lib/supabase/service';
import type { Json } from '@/types/database';

/** Existing lead summary returned from dedup check. */
export interface ExistingLead {
  uuid: string;
  lead_name: string | null;
  funnel_status: string;
}

/**
 * Finds an existing active lead matching the given phone number.
 * @param phone - Normalized phone number to check.
 * @returns Existing lead if found, null otherwise.
 */
export async function findExistingLead(phone: string): Promise<ExistingLead | null> {
  const client = createServiceClient();

  const { data, error } = await client
    .from('leads')
    .select('uuid, lead_name, funnel_status')
    .or(`lead_phone.eq.${phone},parent_phone.eq.${phone}`)
    .eq('is_deleted', false)
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`Dedup query failed: ${error.message}`);
  }

  return data;
}

/**
 * Records a duplicate submission in contact_history without creating a new lead.
 * @param existingLeadUuid - UUID of the existing lead.
 * @param source - Interaction source identifier.
 * @param metadata - Raw payload summary for audit.
 */
export async function recordDuplicateSubmission(
  existingLeadUuid: string,
  source: string,
  metadata: Record<string, unknown>,
): Promise<void> {
  const client = createServiceClient();

  const { error } = await client.from('contact_history').insert({
    lead_uuid: existingLeadUuid,
    interaction_type: 'duplicate_submission',
    interaction_source: source as 'whatsapp' | 'instagram' | 'netgsm' | 'manual',
    notes: 'Duplicate submission detected — lead not created.',
    metadata: metadata as Json,
  });

  if (error) {
    throw new Error(`Failed to record duplicate submission: ${error.message}`);
  }
}
