/**
 * Lead PATCH orchestration — validation, CRM update, Chatwoot outbound assignee sync.
 */
import { hasLabelMappedLeadUpdates, pushLabelsToChatwoot } from '@/lib/chatwoot/sync-labels';
import { pushAssigneeToChatwoot, syncAssigneeToLead } from '@/lib/leads/sync-assignee';
import { isChatwootAssigneeSyncEnabled, isChatwootLabelSyncEnabled } from '@/lib/env';
import { createServiceClient } from '@/lib/supabase/service';
import type { Database } from '@/types/database';

type LeadsUpdate = Database['public']['Tables']['leads']['Update'];

/** Result of a successful lead PATCH. */
export interface UpdateLeadResult {
  lead: Record<string, unknown>;
  assignedToChanged: boolean;
}

/**
 * Applies lead field updates and optional Chatwoot assignee push.
 * @param leadUuid - Lead UUID.
 * @param updates - Validated update payload.
 * @param existing - Existing lead row subset before update.
 * @param session - Authenticated user session.
 */
export async function updateLeadRecord(
  leadUuid: string,
  updates: Record<string, unknown>,
  existing: { funnel_status: string; assigned_to: string | null },
): Promise<UpdateLeadResult> {
  const client = createServiceClient();

  const { data: currentLead, error: leadError } = await client
    .from('leads')
    .select('is_archived')
    .eq('uuid', leadUuid)
    .maybeSingle();

  if (leadError) {
    throw new Error(`Failed to load lead: ${leadError.message}`);
  }
  if (!currentLead) {
    throw new Error('Lead not found');
  }
  if (currentLead.is_archived) {
    throw new Error('Lead is archived');
  }

  const newAssignedTo =
    'assigned_to' in updates ? (updates.assigned_to as string | null) : undefined;
  const assignedToChanging = newAssignedTo !== undefined && newAssignedTo !== existing.assigned_to;

  if (assignedToChanging && isChatwootAssigneeSyncEnabled()) {
    await syncAssigneeToLead({
      leadUuid,
      newAssignedTo: newAssignedTo ?? null,
      syncSource: 'crm',
    });
  }

  const { data: updated, error } = await client
    .from('leads')
    .update(updates as LeadsUpdate)
    .eq('uuid', leadUuid)
    .select('*')
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to update lead: ${error.message}`);
  }
  if (!updated) {
    throw new Error('Lead not found');
  }

  if (assignedToChanging && isChatwootAssigneeSyncEnabled()) {
    await pushAssigneeToChatwoot(leadUuid, newAssignedTo ?? null);
  }

  if (isChatwootLabelSyncEnabled() && hasLabelMappedLeadUpdates(updates)) {
    await pushLabelsToChatwoot(leadUuid);
  }

  return { lead: updated, assignedToChanged: assignedToChanging };
}
