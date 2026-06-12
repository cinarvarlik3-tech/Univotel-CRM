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
import { useTranslation } from '@/hooks/useTranslation';
import { formatEnumLabel, formatNumber } from '@/lib/i18n';
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
  const { locale, t } = useTranslation();
  const emDash = t('common.emDash');

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>{t('analytics.leadsBySource')}</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="h-[34px] hover:bg-transparent">
                <TableHead>{t('analytics.tableSource')}</TableHead>
                <TableHead>{t('analytics.tableLeads')}</TableHead>
                <TableHead>{t('analytics.tableWon')}</TableHead>
                <TableHead>{t('analytics.tableLost')}</TableHead>
                <TableHead>{t('analytics.tableConversion')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.leadsBySource.map((row) => (
                <TableRow key={row.lead_source ?? 'unknown'}>
                  <TableCell>
                    {row.lead_source ? formatEnumLabel(locale, 'source', row.lead_source) : emDash}
                  </TableCell>
                  <TableCell>{formatNumber(row.lead_count ?? 0, locale)}</TableCell>
                  <TableCell>{formatNumber(row.won_count ?? 0, locale)}</TableCell>
                  <TableCell>
                    {row.lost_count != null ? formatNumber(row.lost_count, locale) : emDash}
                  </TableCell>
                  <TableCell>{formatRate(row.conversion_rate)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('analytics.funnelDistribution')}</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="h-[34px] hover:bg-transparent">
                <TableHead>{t('analytics.tableStatus')}</TableHead>
                <TableHead>{t('analytics.tableCount')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.funnelDistribution.map((row) => (
                <TableRow key={row.funnel_status ?? 'unknown'}>
                  <TableCell>
                    {row.funnel_status
                      ? formatEnumLabel(locale, 'funnel', row.funnel_status)
                      : emDash}
                  </TableCell>
                  <TableCell>{formatNumber(row.lead_count ?? 0, locale)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('analytics.agentPerformance')}</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="h-[34px] hover:bg-transparent">
                <TableHead>{t('analytics.tableAgent')}</TableHead>
                <TableHead>{t('analytics.tableAssigned')}</TableHead>
                <TableHead>{t('analytics.tableWon')}</TableHead>
                <TableHead>{t('analytics.tableLost')}</TableHead>
                <TableHead>{t('analytics.tableConversion')}</TableHead>
                <TableHead>{t('analytics.tableAvgResponse')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.agentPerformance.map((row) => (
                <TableRow key={row.salesperson_id ?? row.full_name ?? 'unknown'}>
                  <TableCell>{row.full_name}</TableCell>
                  <TableCell>{formatNumber(row.assigned_count ?? 0, locale)}</TableCell>
                  <TableCell>{formatNumber(row.won_count ?? 0, locale)}</TableCell>
                  <TableCell>
                    {row.lost_count != null ? formatNumber(row.lost_count, locale) : emDash}
                  </TableCell>
                  <TableCell>{formatRate(row.conversion_rate ?? null)}</TableCell>
                  <TableCell>
                    {row.avg_response_minutes != null
                      ? Number(row.avg_response_minutes).toFixed(1)
                      : emDash}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* SLA breach rate panel removed (D16) */}
    </div>
  );
}
