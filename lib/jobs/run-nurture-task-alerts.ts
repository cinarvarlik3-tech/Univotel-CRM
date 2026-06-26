/**
 * Nurture nudge job — sends a blanket daily reminder to all active staff.
 *
 * Runs daily at 06:30 UTC (09:30 Istanbul). Unconditional: fires regardless of
 * whether the agent has any tasks. Excludes partner_operators (allStaff guard).
 * Message: "Make sure to check your tasks and complete them."
 */
import { allStaff } from '@/lib/notifications/recipients';
import { notify } from '@/lib/notifications/notify';

/**
 * Sends one nurture_nudge per active staff member.
 * @returns Count of agents notified.
 */
export async function runNurtureTaskAlerts(): Promise<number> {
  const chatIds = await allStaff();

  let attempted = 0;
  for (const chatId of chatIds) {
    await notify({
      kind: 'nurture_nudge',
      suppressible: true,
      recipientChatId: chatId,
    });
    attempted++;
  }

  return attempted;
}
