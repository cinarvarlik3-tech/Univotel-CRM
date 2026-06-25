/**
 * Kapora and sözleşme finance orchestration — finance row before funnel write with compensation.
 */
import { createFinanceRow, vacateFinanceRow } from '@/lib/finance/create-finance-row';
import {
  assertKaporaFinanceReady,
  normalizeFinanceTerms,
  type KaporaFinanceInput,
} from '@/lib/finance/kapora-gate';
import { recordFinanceChange } from '@/lib/finance/record-change';
import { updateLeadRecord, type UpdateLeadResult } from '@/lib/leads/update-lead';
import { setPurchasedRoom } from '@/lib/pms/purchased-room';
import { createServiceClient } from '@/lib/supabase/service';
import type { StageHistorySource } from '@/lib/leads/write-stage-history';

type LeadExisting = {
  funnel_status: string;
  assigned_to: string | null;
  loss_reason?: string | null;
  funnel_status_before_lost?: string | null;
};

export type FinanceAdvanceInput = {
  leadId: string;
  purchasedRoom: string;
  moveInMonth?: string;
  dealDuration?: number;
  discount?: number;
  actorId: string | null;
  existing: LeadExisting;
  source?: StageHistorySource;
};

/**
 * Advances a lead to kapora-alindi: validate → create finance row → funnel write → compensate on failure.
 */
export async function advanceToKapora(input: FinanceAdvanceInput): Promise<UpdateLeadResult> {
  const supa = createServiceClient();
  const terms = normalizeFinanceTerms(input);
  const financeInput: KaporaFinanceInput = {
    purchasedRoom: input.purchasedRoom,
    moveInMonth: terms.moveInMonth,
    dealDuration: terms.dealDuration,
    discount: terms.discount,
  };

  await setPurchasedRoom({ leadId: input.leadId, roomTypeId: input.purchasedRoom });

  await assertKaporaFinanceReady(supa, input.leadId, financeInput);
  const financeRowId = await createFinanceRow(supa, input.leadId, financeInput, input.actorId);

  try {
    return await updateLeadRecord(
      input.leadId,
      { funnel_status: 'kapora-alindi' },
      input.existing,
      input.actorId,
      input.source ?? 'manual',
    );
  } catch (err) {
    await vacateFinanceRow(supa, financeRowId);
    throw err;
  }
}

/**
 * Confirms sözleşme: always record finance change, then advance funnel status.
 */
export async function confirmSozlesme(input: FinanceAdvanceInput): Promise<UpdateLeadResult> {
  const supa = createServiceClient();
  const terms = normalizeFinanceTerms(input);
  const financeInput: KaporaFinanceInput = {
    purchasedRoom: input.purchasedRoom,
    moveInMonth: terms.moveInMonth,
    dealDuration: terms.dealDuration,
    discount: terms.discount,
  };

  await setPurchasedRoom({ leadId: input.leadId, roomTypeId: input.purchasedRoom });

  await assertKaporaFinanceReady(supa, input.leadId, financeInput);

  await recordFinanceChange(supa, {
    leadId: input.leadId,
    purchasedRoom: input.purchasedRoom,
    moveInMonth: terms.moveInMonth,
    dealDuration: terms.dealDuration,
    discount: terms.discount,
    actorId: input.actorId,
  });

  return updateLeadRecord(
    input.leadId,
    { funnel_status: 'sozlesme-imzalandi' },
    input.existing,
    input.actorId,
    input.source ?? 'manual',
  );
}
