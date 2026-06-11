/**
 * Manager panel — salesperson-based performance metrics + general trend data.
 * Rendered as the "Team panel" tab on /dashboard (manager/superadmin only).
 *
 * KPI cards and trend charts are scoped by the salesperson selector (or row click);
 * the team comparison table always covers the whole team.
 */
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { KpiCard } from '@/components/ui/kpi-card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { TrendChart } from '@/components/analytics/TrendChart';
import { useManagerPanel } from '@/hooks/useManagerPanel';
import { useTranslation } from '@/hooks/useTranslation';
import { formatNumber } from '@/lib/i18n';
import type { ManagerPanelRange } from '@/lib/analytics/manager-panel';
import { cn } from '@/lib/utils';

/** Sentinel value for the "whole team" selector option (Radix Select forbids ''). */
const ALL_TEAM = '__all__';

/**
 * Formats a 0–1 rate as a percentage string.
 * @param rate - Rate between 0 and 1, or null when undefined.
 * @returns Percentage string or em dash.
 */
function formatRate(rate: number | null): string {
  if (rate === null || rate === undefined) return '—';
  return `${Math.round(rate * 100)}%`;
}

/**
 * Renders the manager team panel with range/salesperson scoping.
 * @returns Manager panel element.
 */
export function ManagerPanel() {
  const { locale, t } = useTranslation();
  const [range, setRange] = useState<ManagerPanelRange>('this_month');
  const [selected, setSelected] = useState<string>(ALL_TEAM);

  const salespersonId = selected === ALL_TEAM ? undefined : selected;
  const { data, error, isLoading } = useManagerPanel(true, range, salespersonId);

  const ranges: Array<{ key: ManagerPanelRange; label: string }> = [
    { key: 'this_week', label: t('analytics.rangeThisWeek') },
    { key: 'this_month', label: t('analytics.rangeThisMonth') },
    { key: 'last_30_days', label: t('analytics.rangeLast30') },
  ];

  return (
    <div className="space-y-4">
      {/* Scope controls */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Select value={selected} onValueChange={setSelected}>
          <SelectTrigger className="w-56">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_TEAM}>{t('analytics.allTeam')}</SelectItem>
            {(data?.team ?? []).map((member) => (
              <SelectItem key={member.salespersonId} value={member.salespersonId}>
                {member.fullName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex rounded-md border border-border-default text-xs">
          {ranges.map((r) => (
            <button
              key={r.key}
              onClick={() => setRange(r.key)}
              className={cn(
                'px-3 py-1.5 transition-colors first:rounded-l-md last:rounded-r-md',
                range === r.key ? 'bg-brand-blue text-white' : 'text-text-secondary hover:bg-muted',
              )}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {isLoading && !data && (
        <div className="space-y-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      )}

      {error && <p className="text-sm text-brand-red">{t('analytics.failedToLoad')}</p>}

      {data && (
        <>
          {/* Summary KPIs (scoped) */}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <KpiCard
              label={t('analytics.kpiNewLeads')}
              value={formatNumber(data.summary.newLeads, locale)}
            />
            <KpiCard
              label={t('analytics.kpiContacts')}
              value={formatNumber(data.summary.contacts, locale)}
            />
            <KpiCard
              label={t('analytics.kpiVisitsAttended')}
              value={formatNumber(data.summary.visitsAttended, locale)}
            />
            <KpiCard
              label={t('analytics.kpiDealsSigned')}
              value={formatNumber(data.summary.dealsSigned, locale)}
              variant="blue"
            />
          </div>

          {/* Daily trends (scoped) */}
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            <TrendChart
              title={t('analytics.trendNewLeads')}
              days={data.trends.days}
              values={data.trends.newLeads}
            />
            <TrendChart
              title={t('analytics.trendContacts')}
              days={data.trends.days}
              values={data.trends.contacts}
              barClassName="bg-brand-blue/70"
            />
            <TrendChart
              title={t('analytics.trendVisits')}
              days={data.trends.days}
              values={data.trends.visits}
              barClassName="bg-[var(--badge-warning-text)]"
            />
            <TrendChart
              title={t('analytics.trendDeals')}
              days={data.trends.days}
              values={data.trends.dealsSigned}
              barClassName="bg-brand-red"
            />
          </div>

          {/* Team comparison table (always full team) */}
          <Card>
            <CardHeader>
              <CardTitle>{t('analytics.teamTableTitle')}</CardTitle>
              <p className="text-xs text-text-tertiary">{t('analytics.scopeHint')}</p>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="h-[34px] hover:bg-transparent">
                      <TableHead>{t('analytics.tableAgent')}</TableHead>
                      <TableHead>{t('analytics.tableActiveLeads')}</TableHead>
                      <TableHead>{t('analytics.tableClaimed')}</TableHead>
                      <TableHead>{t('analytics.tableContacted')}</TableHead>
                      <TableHead>{t('analytics.tableVisits')}</TableHead>
                      <TableHead>{t('analytics.tableShowRate')}</TableHead>
                      <TableHead>{t('analytics.tableDownpayment')}</TableHead>
                      <TableHead>{t('analytics.tableSigned')}</TableHead>
                      <TableHead>{t('analytics.tableConversion')}</TableHead>
                      <TableHead>{t('analytics.tableActivity')}</TableHead>
                      <TableHead>{t('analytics.tableTasks')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.team.map((member) => (
                      <TableRow
                        key={member.salespersonId}
                        onClick={() =>
                          setSelected((prev) =>
                            prev === member.salespersonId ? ALL_TEAM : member.salespersonId,
                          )
                        }
                        className={cn(
                          'cursor-pointer',
                          selected === member.salespersonId && 'bg-brand-blue/10',
                        )}
                      >
                        <TableCell>
                          <span className="font-medium">{member.fullName}</span>
                          {!member.isActive && (
                            <span className="ml-1.5 text-[10px] uppercase text-text-tertiary">
                              {t('analytics.inactive')}
                            </span>
                          )}
                        </TableCell>
                        <TableCell>{formatNumber(member.activeLeadCount, locale)}</TableCell>
                        <TableCell>{formatNumber(member.claimed, locale)}</TableCell>
                        <TableCell>{formatNumber(member.contactedLeads, locale)}</TableCell>
                        <TableCell>
                          {member.visitsAttended}
                          <span className="text-text-tertiary"> / {member.visitsFailed}</span>
                        </TableCell>
                        <TableCell>{formatRate(member.showRate)}</TableCell>
                        <TableCell>{formatNumber(member.downpayments, locale)}</TableCell>
                        <TableCell className="font-semibold text-brand-blue">
                          {formatNumber(member.dealsSigned, locale)}
                        </TableCell>
                        <TableCell>{formatRate(member.conversionRate)}</TableCell>
                        <TableCell>
                          {formatNumber(member.activityTotal, locale)}
                          <span className="text-text-tertiary">
                            {' '}
                            ({member.calls}/{member.messages})
                          </span>
                        </TableCell>
                        <TableCell>
                          {member.tasksCompleted}/{member.tasksTotal}
                          <span className="text-text-tertiary">
                            {' '}
                            ({formatRate(member.taskCompletionRate)})
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
