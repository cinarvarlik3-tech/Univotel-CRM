/**
 * Lead claim — optimistic-lock self-assign from Lead Hub.
 * Uses service client so the write bypasses RLS (the user client would reject
 * updates to leads not yet assigned to the requesting user).
 */
import { createServiceClient } from '@/lib/supabase/service';
import { incrementActiveLeadCount } from '@/lib/leads/assign';

export interface ClaimLeadResult {
  lead: Record<string, unknown> | null;
  alreadyClaimed: boolean;
}

/**
 * Atomically assigns an unassigned lead to userId.
 * Returns { alreadyClaimed: true } if the lead was grabbed by someone else between
 * the GET check and the write — the caller should respond 409.
 */
export async function claimLead(
  leadUuid: string,
  userId: string,
  userName: string,
): Promise<ClaimLeadResult> {
  const client = createServiceClient();

  const { data: updated, error } = await client
    .from('leads')
    .update({ assigned_to: userId, claimed_at: new Date().toISOString() })
    .eq('uuid', leadUuid)
    .is('assigned_to', null)
    .select('*')
    .maybeSingle();

  if (error) throw new Error(`Failed to claim lead: ${error.message}`);
  if (!updated) return { lead: null, alreadyClaimed: true };

  await Promise.all([
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (client.from('contact_history') as any).insert({
      lead_uuid: leadUuid,
      interaction_type: 'reassignment',
      interaction_source: 'manual',
      salesperson_id: userId,
      notes: `Lead claimed by ${userName}`,
      metadata: { event: 'lead_claimed' },
    }),
    incrementActiveLeadCount(userId),
  ]);

  return { lead: updated as Record<string, unknown>, alreadyClaimed: false };
}
