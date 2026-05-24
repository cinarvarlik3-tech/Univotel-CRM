/**
 * Archive and unarchive lead operations via Supabase RPC.
 */
import { createServiceClient } from '@/lib/supabase/service';

/** Result of a successful archive operation. */
export interface ArchiveLeadResult {
  uuid: string;
}

/**
 * Archives a lead manually via archive_single_lead RPC.
 * @param uuid - Lead UUID to archive.
 * @param managerUuid - Manager performing the action.
 * @param archiveReason - won or lost outcome.
 * @param lossReason - Required when archiveReason is lost.
 */
export async function archiveLeadManual(
  uuid: string,
  managerUuid: string,
  archiveReason: 'won' | 'lost',
  lossReason?: string,
): Promise<ArchiveLeadResult> {
  const client = createServiceClient();

  const { error } = await client.rpc('archive_single_lead', {
    target_uuid: uuid,
    archived_by_param: managerUuid,
    manual_archive_reason: archiveReason,
    manual_loss_reason: lossReason,
  });

  if (error) {
    throw new Error(error.message);
  }

  return { uuid };
}

/**
 * Restores an archived lead to the active CRM.
 * @param uuid - Archived lead UUID.
 * @param managerUuid - Manager performing the action.
 */
export async function unarchiveLead(uuid: string, managerUuid: string): Promise<ArchiveLeadResult> {
  const client = createServiceClient();

  const { error } = await client.rpc('unarchive_single_lead', {
    target_uuid: uuid,
    manager_uuid: managerUuid,
  });

  if (error) {
    throw new Error(error.message);
  }

  return { uuid };
}

/**
 * Maps terminal funnel status to archive outcome for auto-archive.
 * @param funnelStatus - Current funnel status slug.
 * @returns won, lost, or null if not terminal.
 */
export function mapArchiveReasonFromFunnel(funnelStatus: string): 'won' | 'lost' | null {
  if (funnelStatus === 'sozlesme-imzalandi') return 'won';
  if (funnelStatus === 'ziyaret-ama-almayacak' || funnelStatus === 'ilgilenmiyor') {
    return 'lost';
  }
  return null;
}
