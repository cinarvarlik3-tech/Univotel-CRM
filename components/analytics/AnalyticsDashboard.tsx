/**
 * Manager analytics dashboard — renders materialized view aggregates.
 */
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Leads by source</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="h-[34px] hover:bg-transparent">
                <TableHead>Source</TableHead>
                <TableHead>Leads</TableHead>
                <TableHead>Won</TableHead>
                <TableHead>Lost</TableHead>
                <TableHead>Conversion</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.leadsBySource.map((row) => (
                <TableRow key={row.lead_source ?? 'unknown'}>
                  <TableCell>{row.lead_source}</TableCell>
                  <TableCell>{row.lead_count}</TableCell>
                  <TableCell>{row.won_count}</TableCell>
                  <TableCell>{row.lost_count ?? '—'}</TableCell>
                  <TableCell>{formatRate(row.conversion_rate)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Funnel distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="h-[34px] hover:bg-transparent">
                <TableHead>Status</TableHead>
                <TableHead>Count</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.funnelDistribution.map((row) => (
                <TableRow key={row.funnel_status ?? 'unknown'}>
                  <TableCell>{row.funnel_status}</TableCell>
                  <TableCell>{row.lead_count}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Agent performance</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="h-[34px] hover:bg-transparent">
                <TableHead>Agent</TableHead>
                <TableHead>Assigned</TableHead>
                <TableHead>Won</TableHead>
                <TableHead>Lost</TableHead>
                <TableHead>Conversion</TableHead>
                <TableHead>Avg response (min)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.agentPerformance.map((row) => (
                <TableRow key={row.salesperson_id ?? row.full_name ?? 'unknown'}>
                  <TableCell>{row.full_name}</TableCell>
                  <TableCell>{row.assigned_count}</TableCell>
                  <TableCell>{row.won_count}</TableCell>
                  <TableCell>{row.lost_count ?? '—'}</TableCell>
                  <TableCell>{formatRate(row.conversion_rate ?? null)}</TableCell>
                  <TableCell>
                    {row.avg_response_minutes != null
                      ? Number(row.avg_response_minutes).toFixed(1)
                      : '—'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>SLA breach rate</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="h-[34px] hover:bg-transparent">
                <TableHead>Source</TableHead>
                <TableHead>Breaches</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Rate</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.slaBreachRate.map((row) => (
                <TableRow key={row.lead_source ?? 'unknown'}>
                  <TableCell>{row.lead_source}</TableCell>
                  <TableCell>{row.breach_count}</TableCell>
                  <TableCell>{row.total_count}</TableCell>
                  <TableCell>{formatRate(row.breach_rate)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
