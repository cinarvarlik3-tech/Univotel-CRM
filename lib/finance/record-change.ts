/**
 * Atomic finance arrangement change — vacate+insert via fms_record_finance_change RPC.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';
import { toMoveInMonthDate } from '@/lib/finance/move-in-month';

type ServiceClient = SupabaseClient<Database>;

/**
 * Records a finance arrangement change (sözleşme confirm / room or term change).
 * Always vacates the prior row and inserts a new one in a single transaction.
 */
export async function recordFinanceChange(
  supa: ServiceClient,
  args: {
    leadId: string;
    purchasedRoom: string;
    moveInMonth: string;
    dealDuration: number;
    discount: number;
    actorId: string | null;
  },
): Promise<string> {
  const { data, error } = await supa.rpc('fms_record_finance_change', {
    p_lead_id: args.leadId,
    p_purchased_room: args.purchasedRoom,
    p_move_in_month: toMoveInMonthDate(args.moveInMonth),
    p_discount: args.discount,
    p_deal_duration: args.dealDuration,
    p_actor_id: args.actorId ?? '',
  });
  if (error) throw new Error(`Finance change failed: ${error.message}`);
  return data as string;
}
