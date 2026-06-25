/**
 * Lead deduplication logic.
 * Prevents duplicate lead creation when phone, parent_phone, or Instagram handle matches.
 */
import { DEFAULT_FUNNEL_STATUS } from '@/lib/constants';
import type { LeadContactIdentifierKind } from '@/lib/leads/contact-identifier';
import { createServiceClient } from '@/lib/supabase/service';
import type { Json } from '@/types/database';

/** Existing lead summary returned from dedup check. */
export interface ExistingLead {
  uuid: string;
  lead_name: string | null;
  funnel_status: string;
}

/**
 * Finds an existing active lead matching the given contact identifier.
 * @param identifier - Normalized phone or Instagram handle stored in lead_phone.
 * @param kind - phone matches lead_phone/parent_phone; instagram matches instagram rows only.
 * @returns Existing lead if found, null otherwise.
 */
export async function findExistingLead(
  identifier: string,
  kind: LeadContactIdentifierKind = 'phone',
  interactionSource: 'whatsapp' | 'instagram' | 'netgsm' | 'manual' = 'manual',
): Promise<ExistingLead | null> {
  const client = createServiceClient();

  if (kind === 'instagram') {
    const { data, error } = await client
      .from('leads')
      .select('uuid, lead_name, funnel_status')
      .eq('lead_phone', identifier)
      .eq('message_from', 'instagram')
      .eq('is_deleted', false)
      .eq('is_archived', false)
      .limit(1)
      .maybeSingle();

    if (error) {
      throw new Error(`Dedup query failed: ${error.message}`);
    }

    return data;
  }

  const { data, error } = await client
    .from('leads')
    .select('uuid, lead_name, funnel_status')
    .or(`lead_phone.eq.${identifier},parent_phone.eq.${identifier}`)
    .eq('is_deleted', false)
    .eq('is_archived', false)
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`Dedup query failed: ${error.message}`);
  }

  if (data) return data;

  // Secondary check: archived leads. If found within 80 days, reactivate.
  const eightWeeksAgo = new Date(Date.now() - 80 * 24 * 60 * 60 * 1000).toISOString();
  const { data: archived, error: archiveError } = await client
    .from('leads')
    .select('uuid, lead_name, funnel_status, message_from, archived_at')
    .or(`lead_phone.eq.${identifier},parent_phone.eq.${identifier}`)
    .eq('is_deleted', false)
    .eq('is_archived', true)
    .gte('archived_at', eightWeeksAgo)
    .limit(1)
    .maybeSingle();

  if (archiveError) {
    throw new Error(`Dedup archive query failed: ${archiveError.message}`);
  }

  if (archived) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: reactivateError } = await (client as any)
      .from('leads')
      .update({
        is_archived: false,
        archived_at: null,
        funnel_status: 'yeni',
        funnel_status_before_lost: null,
        assigned_to: null,
        // loss_reason is cleared by the enforce_loss_reason_on_lost trigger
        // when funnel_status changes away from 'lost'.
      })
      .eq('uuid', archived.uuid);

    if (reactivateError) {
      throw new Error(`Failed to reactivate archived lead: ${reactivateError.message}`);
    }

    // Resolve the best interaction_source: prefer the lead's own channel over
    // the caller-supplied default (e.g. 'netgsm' lead re-appearing via whatsapp).
    const resolvedSource =
      archived.message_from === 'instagram'
        ? 'instagram'
        : archived.message_from === 'netgsm'
          ? 'netgsm'
          : interactionSource !== 'manual'
            ? interactionSource
            : 'whatsapp';

    const { error: historyError } = await client.from('contact_history').insert({
      lead_uuid: archived.uuid,
      interaction_type: 'status_change',
      interaction_source: resolvedSource,
      funnel_status_at_time: DEFAULT_FUNNEL_STATUS,
      previous_status: archived.funnel_status,
      status_changed: true,
      notes: 'Archived lead reactivated — new inbound submission.',
      metadata: { event: 'archive_reactivation' } as Json,
    });

    if (historyError) {
      console.error(
        `[deduplicate] contact_history insert failed for reactivated lead ${archived.uuid}: ${historyError.message}`,
      );
    }

    return { uuid: archived.uuid, lead_name: archived.lead_name, funnel_status: 'yeni' };
  }

  return null;
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
    notes: 'Tekrar başvuru — lead oluşturulmadı.',
    metadata: metadata as Json,
  });

  if (error) {
    throw new Error(`Failed to record duplicate submission: ${error.message}`);
  }
}
