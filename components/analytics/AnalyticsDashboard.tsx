/**
 * Manager analytics dashboard — renders materialized view aggregates.
 */
import type { AnalyticsPayload } from '@/types/domain';

interface AnalyticsDashboardProps {
  data: AnalyticsPayload;
}

/**
 * Formats a decimal rate as percentage string.
 * @param rate - Rate between 0 and 1.
 * @returns Formatted percentage.
 */
function formatRate(rate: number | null): string {
  if (rate === null || rate === undefined) return '—';
  return `${(rate * 100).toFixed(1)}%`;
}

/**
 * Renders four analytics tables from MV data.
 * @param props - Analytics payload from API.
 * @returns Dashboard grid element.
 */
export function AnalyticsDashboard({ data }: AnalyticsDashboardProps) {
  return (
    <div className="card-grid">
      <div className="card">
        <h3>Leads by source</h3>
        <table>
          <thead>
            <tr>
              <th>Source</th>
              <th>Leads</th>
              <th>Won</th>
              <th>Conversion</th>
            </tr>
          </thead>
          <tbody>
            {data.leadsBySource.map((row) => (
              <tr key={row.lead_source ?? 'unknown'}>
                <td>{row.lead_source}</td>
                <td>{row.lead_count}</td>
                <td>{row.won_count}</td>
                <td>{formatRate(row.conversion_rate)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card">
        <h3>Funnel distribution</h3>
        <table>
          <thead>
            <tr>
              <th>Status</th>
              <th>Count</th>
            </tr>
          </thead>
          <tbody>
            {data.funnelDistribution.map((row) => (
              <tr key={row.funnel_status ?? 'unknown'}>
                <td>{row.funnel_status}</td>
                <td>{row.lead_count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card">
        <h3>Agent performance</h3>
        <table>
          <thead>
            <tr>
              <th>Agent</th>
              <th>Assigned</th>
              <th>Won</th>
              <th>Avg response (min)</th>
            </tr>
          </thead>
          <tbody>
            {data.agentPerformance.map((row) => (
              <tr key={row.salesperson_id ?? row.full_name ?? 'unknown'}>
                <td>{row.full_name}</td>
                <td>{row.assigned_count}</td>
                <td>{row.won_count}</td>
                <td>
                  {row.avg_response_minutes != null
                    ? Number(row.avg_response_minutes).toFixed(1)
                    : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card">
        <h3>SLA breach rate</h3>
        <table>
          <thead>
            <tr>
              <th>Source</th>
              <th>Breaches</th>
              <th>Total</th>
              <th>Rate</th>
            </tr>
          </thead>
          <tbody>
            {data.slaBreachRate.map((row) => (
              <tr key={row.lead_source ?? 'unknown'}>
                <td>{row.lead_source}</td>
                <td>{row.breach_count}</td>
                <td>{row.total_count}</td>
                <td>{formatRate(row.breach_rate)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
