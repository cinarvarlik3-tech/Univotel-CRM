/**
 * Persists Chatwoot sync audit rows for debugging and replay.
 */
import { createServiceClient } from '@/lib/supabase/service';
import type { Json } from '@/types/database';

export type SyncLogDirection = 'inbound' | 'outbound';
export type SyncLogStatus = 'success' | 'failed' | 'skipped';

/**
 * Inserts a chatwoot_sync_log row (best-effort; never throws).
 */
export async function logChatwootSync(params: {
  leadUuid?: string | null;
  direction: SyncLogDirection;
  operation: string;
  status: SyncLogStatus;
  payload?: Record<string, unknown>;
  errorMessage?: string;
}): Promise<void> {
  try {
    const client = createServiceClient();
    await client.from('chatwoot_sync_log').insert({
      lead_uuid: params.leadUuid ?? null,
      direction: params.direction,
      operation: params.operation,
      status: params.status,
      payload: (params.payload ?? null) as Json,
      error_message: params.errorMessage ?? null,
    });
  } catch (err) {
    console.error('[chatwoot] sync log insert failed:', err);
  }
}
