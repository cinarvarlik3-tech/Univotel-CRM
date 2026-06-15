/**
 * Forward-only funnel stage helpers (D19).
 */
import { FUNNEL_STATUSES, isFunnelAdvanceAllowed } from '@/lib/constants';

/** Stages strictly ahead of `current` (excludes lost and terminal). */
export function getForwardFunnelStages(current: string): string[] {
  return FUNNEL_STATUSES.filter(
    (stage) => stage !== 'lost' && isFunnelAdvanceAllowed(current, stage),
  );
}
