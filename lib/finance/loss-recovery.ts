/**
 * Finance recreation when a lost lead recovers into a financial funnel stage.
 * Price is re-resolved server-side — never silently restore a vacated row.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';
import type { FinancialFunnelStatus } from '@/lib/leads/apply-loss-reason-update';
import { createServiceClient } from '@/lib/supabase/service';
import { DEFAULT_DEAL_DURATION, DEFAULT_DISCOUNT } from '@/lib/finance/kapora-gate';
import { toMoveInMonthDate } from '@/lib/finance/move-in-month';

type ServiceClient = SupabaseClient<Database>;

export type LossRecoveryFinanceInput = {
  purchasedRoom: string;
  moveInMonth: string;
  dealDuration?: number;
  discount?: number;
};

export { toMoveInMonthDate } from '@/lib/finance/move-in-month';

/**
 * Creates a fresh finance row before restoring a lost lead into kapora or sözleşme.
 */
export async function recreateFinanceOnLossRecovery(
  supa: ServiceClient,
  args: {
    leadId: string;
    targetStatus: FinancialFunnelStatus;
    actorId: string;
    input: LossRecoveryFinanceInput;
  },
): Promise<void> {
  const purchasedRoom = args.input.purchasedRoom;
  if (!purchasedRoom) {
    throw new Error('Finans aşamasına dönüş için oda tipi seçilmelidir');
  }

  const moveInMonth = toMoveInMonthDate(args.input.moveInMonth);
  const dealDuration = args.input.dealDuration ?? DEFAULT_DEAL_DURATION;
  const discount = args.input.discount ?? DEFAULT_DISCOUNT;

  if (dealDuration < 1 || dealDuration > 12) {
    throw new Error('Sözleşme süresi 1–12 ay arasında olmalıdır');
  }

  const rpcArgs = {
    p_lead_id: args.leadId,
    p_purchased_room: purchasedRoom,
    p_move_in_month: moveInMonth,
    p_discount: discount,
    p_deal_duration: dealDuration,
    p_actor_id: args.actorId,
  };

  const rpcName =
    args.targetStatus === 'kapora-alindi' ? 'fms_create_finance_row' : 'fms_record_finance_change';

  const { error } = await supa.rpc(rpcName, rpcArgs);
  if (error) {
    throw new Error(`Finans satırı oluşturulamadı: ${error.message}`);
  }
}

export type LossRecoveryLeadInput = Omit<LossRecoveryFinanceInput, 'purchasedRoom'> & {
  purchasedRoom?: string;
};

/**
 * Loads lead_details and recreates finance for loss recovery (API route entry point).
 */
export async function executeLossRecoveryFinance(args: {
  leadId: string;
  targetStatus: FinancialFunnelStatus;
  actorId: string;
  input: LossRecoveryLeadInput;
}): Promise<void> {
  const supa = createServiceClient();

  const { data: details } = await supa
    .from('lead_details')
    .select('purchased_room')
    .eq('lead_uuid', args.leadId)
    .maybeSingle();

  const purchasedRoom = args.input.purchasedRoom ?? details?.purchased_room;
  if (!purchasedRoom) {
    throw new Error('Kayıp geri alımında oda tipi seçilmelidir');
  }

  await recreateFinanceOnLossRecovery(supa, {
    leadId: args.leadId,
    targetStatus: args.targetStatus,
    actorId: args.actorId,
    input: {
      purchasedRoom,
      moveInMonth: args.input.moveInMonth,
      dealDuration: args.input.dealDuration,
      discount: args.input.discount,
    },
  });
}
