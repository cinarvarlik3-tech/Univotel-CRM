/**
 * SWR hook for the new Team Panel metrics from get_team_panel_metrics RPC (D25, §6.2).
 * Returns per-agent Volume / Outcomes / Conversions / Stale data.
 */
import useSWR from 'swr';
import type { ManagerPanelRange } from '@/lib/analytics/manager-panel';

export interface TeamMemberMetrics {
  salespersonId: string;
  fullName: string;
  // Volume
  activeLeadCount: number;
  messageCount: number;
  callCount: number;
  answeredCallCount: number;
  scheduledVisitCount: number;
  // Outcomes
  downpaymentCount: number;
  signedCount: number;
  // Conversions (percentage, null if no denominator)
  convYeniToSigned: number | null;
  convYeniToDownpayment: number | null;
  convVisitToDownpayment: number | null;
  convDownpaymentToSigned: number | null;
  // Connect rate
  outboundConnectRate: number | null;
  // Cliff warning
  staleAtYeniCount: number;
}

async function fetcher(url: string): Promise<TeamMemberMetrics[]> {
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch team metrics');
  const json = await res.json();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (json.data ?? []).map(
    (r: any): TeamMemberMetrics => ({
      salespersonId: r.salesperson_id,
      fullName: r.full_name,
      activeLeadCount: Number(r.active_lead_count ?? 0),
      messageCount: Number(r.message_count ?? 0),
      callCount: Number(r.call_count ?? 0),
      answeredCallCount: Number(r.answered_call_count ?? 0),
      scheduledVisitCount: Number(r.scheduled_visit_count ?? 0),
      downpaymentCount: Number(r.downpayment_count ?? 0),
      signedCount: Number(r.signed_count ?? 0),
      convYeniToSigned: r.conv_yeni_to_signed != null ? Number(r.conv_yeni_to_signed) : null,
      convYeniToDownpayment:
        r.conv_yeni_to_downpayment != null ? Number(r.conv_yeni_to_downpayment) : null,
      convVisitToDownpayment:
        r.conv_visit_to_downpayment != null ? Number(r.conv_visit_to_downpayment) : null,
      convDownpaymentToSigned:
        r.conv_downpayment_to_signed != null ? Number(r.conv_downpayment_to_signed) : null,
      outboundConnectRate: r.outbound_connect_rate != null ? Number(r.outbound_connect_rate) : null,
      staleAtYeniCount: Number(r.stale_at_yeni_count ?? 0),
    }),
  );
}

/**
 * Fetches team panel metrics from GET /api/analytics/team-metrics.
 * @param enabled - Skip fetch when false (non-managers).
 * @param range - Date range preset.
 */
export function useTeamPanelMetrics(enabled: boolean, range: ManagerPanelRange) {
  return useSWR<TeamMemberMetrics[]>(
    enabled ? `/api/analytics/team-metrics?range=${range}` : null,
    fetcher,
    { keepPreviousData: true },
  );
}
