/**
 * Finance row creation and compensating vacate — calls audited RPCs via service role.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';
import type { KaporaFinanceInput } from '@/lib/finance/kapora-gate';
import { toMoveInMonthDate } from '@/lib/finance/move-in-month';

type ServiceClient = SupabaseClient<Database>;

/**
 * Creates the first active finance row at kapora via fms_create_finance_row RPC.
 * @returns New finance row UUID (for compensating vacate on funnel-write failure).
 */
export async function createFinanceRow(
  supa: ServiceClient,
  leadId: string,
  input: KaporaFinanceInput,
  actorId: string | null,
): Promise<string> {
  const { data, error } = await supa.rpc('fms_create_finance_row', {
    p_lead_id: leadId,
    p_purchased_room: input.purchasedRoom,
    p_move_in_month: toMoveInMonthDate(input.moveInMonth),
    p_discount: input.discount,
    p_deal_duration: input.dealDuration,
    p_actor_id: actorId ?? '',
  });
  if (error) throw new Error(`Finance row creation failed: ${error.message}`);
  return data as string;
}

/**
 * Compensating vacate when funnel write fails after row creation.
 * Uses direct UPDATE on lead_finance (service role bypasses manager-only RLS).
 */
export async function vacateFinanceRow(supa: ServiceClient, financeRowId: string): Promise<void> {
  const { error } = await supa
    .from('lead_finance')
    .update({ vacated_at: new Date().toISOString() })
    .eq('id', financeRowId)
    .is('vacated_at', null);
  if (error) throw new Error(`Finance row vacate failed: ${error.message}`);
}
