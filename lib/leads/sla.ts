/**
 * SLA deadline calculation based on lead source and peak season settings.
 */
import { isPeakSeasonActive, PEAK_SEASON_SLA_MINUTES, SLA_DEADLINES } from '@/lib/constants';

/** SLA calculation result with deadline timestamp. */
export interface SlaResult {
  deadline: Date;
  atRiskOffsetMinutes: number;
}

/**
 * Calculates SLA deadline for a lead based on source and creation time.
 * @param leadSource - Lead source identifier (whatsapp, netgsm_call, etc.).
 * @param createdAt - Lead creation timestamp.
 * @returns SLA deadline date and at-risk offset in minutes.
 */
export function calculateSlaDeadline(leadSource: string, createdAt: Date): SlaResult {
  if (isPeakSeasonActive()) {
    return {
      deadline: new Date(createdAt.getTime() + PEAK_SEASON_SLA_MINUTES * 60 * 1000),
      atRiskOffsetMinutes: 5,
    };
  }

  const config = SLA_DEADLINES[leadSource] ?? SLA_DEADLINES.manual;
  return {
    deadline: new Date(createdAt.getTime() + config.deadlineMinutes * 60 * 1000),
    atRiskOffsetMinutes: config.atRiskOffsetMinutes,
  };
}
