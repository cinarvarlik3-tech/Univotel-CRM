/**
 * Lead PATCH orchestration — validation, CRM update, Chatwoot outbound assignee sync.
 */
import { hasLabelMappedLeadUpdates, pushLabelsToChatwoot } from '@/lib/chatwoot/sync-labels';
import { hasCustomAttrMappedLeadUpdates } from '@/lib/chatwoot/sync-custom-attributes';
import { pushCustomAttributesToChatwoot } from '@/lib/chatwoot/push-custom-attributes';
import { applyLossReasonUpdate } from '@/lib/leads/apply-loss-reason-update';
import { pushAssigneeToChatwoot, syncAssigneeToLead } from '@/lib/leads/sync-assignee';
import { isChatwootAssigneeSyncEnabled, isChatwootLabelSyncEnabled } from '@/lib/env';
import { cancelAutoTasksForLead, createAutoTasksForStage } from '@/lib/tasks/auto-tasks';
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
  existing: {
    funnel_status: string;
    assigned_to: string | null;
    loss_reason?: string | null;
    funnel_status_before_lost?: string | null;
  },
): Promise<UpdateLeadResult> {
  const client = createServiceClient();

  const mergedUpdates = {
    ...updates,
    ...applyLossReasonUpdate(existing, updates as { loss_reason?: string | null }),
  };

  const newAssignedTo =
    'assigned_to' in mergedUpdates ? (mergedUpdates.assigned_to as string | null) : undefined;
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
    .update(mergedUpdates as LeadsUpdate)
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

  if (isChatwootLabelSyncEnabled() && hasLabelMappedLeadUpdates(mergedUpdates)) {
    void pushLabelsToChatwoot(leadUuid);
  }

  if (isChatwootLabelSyncEnabled() && hasCustomAttrMappedLeadUpdates(mergedUpdates)) {
    void pushCustomAttributesToChatwoot(leadUuid);
  }

  const newFunnelStatus = mergedUpdates.funnel_status as string | undefined;
  if (newFunnelStatus !== undefined && newFunnelStatus !== existing.funnel_status) {
    await cancelAutoTasksForLead(leadUuid);
    void createAutoTasksForStage(leadUuid, newFunnelStatus, updated.assigned_to as string | null);
  }

  return { lead: updated, assignedToChanged: assignedToChanging };
}

/**
 * Propagates lead_details field changes to denormalized boolean flags on leads.
 * Called after a successful lead_details PATCH so has_moved_in and move_in_date_set
 * stay in sync without requiring RLS-bypass from the API layer.
 */
export async function applyLeadFlagsFromDetails(
  leadUuid: string,
  updates: { actual_move_in_date?: string | null; move_in?: string | null },
  canSetMoveInDate: boolean,
): Promise<void> {
  const flags: Record<string, unknown> = {};

  if (updates.actual_move_in_date) flags.has_moved_in = true;
  if (updates.move_in !== undefined && canSetMoveInDate) {
    flags.move_in_date_set = updates.move_in !== null;
  }

  if (Object.keys(flags).length === 0) return;

  const client = createServiceClient();
  await client
    .from('leads')
    .update(flags as LeadsUpdate)
    .eq('uuid', leadUuid);
}
