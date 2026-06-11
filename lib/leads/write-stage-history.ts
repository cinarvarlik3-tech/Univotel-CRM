/**
 * Writes a single lead_stage_history row.
 * Called by the updateLeadRecord chokepoint and any other path that writes funnel_status.
 * Source options: 'manual' (salesperson action), 'chatwoot' (webhook), 'netgsm', 'system'.
 */
import { createServiceClient } from '@/lib/supabase/service';

export type StageHistorySource = 'manual' | 'chatwoot' | 'netgsm' | 'system';

export async function writeStageHistory(opts: {
  leadUuid: string;
  fromStatus: string | null | undefined;
  toStatus: string;
  changedBy: string | null;
  source: StageHistorySource;
}): Promise<void> {
  const client = createServiceClient();
  const { error } = await client.from('lead_stage_history').insert({
    lead_uuid: opts.leadUuid,
    from_status: opts.fromStatus ?? null,
    to_status: opts.toStatus,
    changed_by: opts.changedBy ?? null,
    source: opts.source,
  });
  if (error) {
    // Non-fatal: the safety-net trigger will catch this, but log so it's visible.
    console.error(`[stage-history] insert failed lead=${opts.leadUuid}:`, error.message);
  }
}
