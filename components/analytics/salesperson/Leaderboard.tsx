/**
 * Salesperson leaderboard — team summary cards + a sortable metric table.
 * Every sortable metric is its own column; clicking a column header re-sorts
 * the board by that metric (server-driven via onSortChange).
 */
import { IconChevronDown, IconCrown } from '@tabler/icons-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useTranslation } from '@/hooks/useTranslation';
import { formatTry } from '@/lib/finance/format';
import { formatNumber } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import type { Locale } from '@/lib/i18n/types';
import type {
  LeaderboardRow,
  LeaderboardSortKey,
  TeamTotals,
} from '@/lib/analytics/salesperson-leaderboard';

interface LeaderboardProps {
  rows: LeaderboardRow[];
  teamTotals: TeamTotals;
  onSelectRep: (id: string) => void;
  isLoading?: boolean;
  sort: LeaderboardSortKey;
  onSortChange: (sort: LeaderboardSortKey) => void;
}

// Medal colors for the top-three crowns (gold / silver / bronze).
const crownColorMap: Record<number, string> = {
  1: 'text-[#E0A100]',
  2: 'text-[#9CA3AF]',
  3: 'text-[#C07B3A]',
};

export function Leaderboard({
  rows,
  teamTotals,
  onSelectRep,
  isLoading,
  sort,
  onSortChange,
}: LeaderboardProps) {
  const { locale, t } = useTranslation();

  // One column per sortable metric. `render` produces the locale-formatted cell.
  const columns: {
    key: LeaderboardSortKey;
    label: string;
    render: (row: LeaderboardRow, locale: Locale) => string;
  }[] = [
    {
      key: 'revenue',
      label: t('analytics.spLeaderboardSortRevenue'),
      render: (row) => formatTry(row.contractedRevenue),
    },
    {
      key: 'leads',
      label: t('analytics.spLeaderboardSortLeads'),
      render: (row, l) => formatNumber(row.leadCount, l),
    },
    {
      key: 'messages',
      label: t('analytics.spLeaderboardSortMessages'),
      render: (row, l) => formatNumber(row.messageCount, l),
    },
    {
      key: 'conversion',
      label: t('analytics.spLeaderboardSortConversion'),
      render: (row) => (row.conversionRate !== null ? `${row.conversionRate}%` : '—'),
    },
    {
      key: 'visits',
      label: t('analytics.spLeaderboardSortVisits'),
      render: (row, l) => formatNumber(row.visitCount, l),
    },
    {
      key: 'sales',
      label: t('analytics.spLeaderboardSortSales'),
      render: (row, l) => formatNumber(row.saleCount, l),
    },
    {
      key: 'lateness',
      label: t('analytics.spLeaderboardSortLateness'),
      render: (row) => (row.latenessRate !== null ? `${row.latenessRate}%` : '—'),
    },
  ];

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (rows.length === 0) {
    return <p className="py-8 text-center text-sm text-text-tertiary">{t('analytics.spNoReps')}</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Team summary cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-[10px] border border-brand-blue bg-brand-blue px-4 py-3">
          <p className="text-[11px] font-medium uppercase tracking-wide text-white/75">
            {t('analytics.spLeaderboardSortRevenue')}
          </p>
          <p className="font-heading text-xl font-bold tabular-nums text-white">
            {formatTry(teamTotals.contractedRevenue)}
          </p>
        </div>
        <div className="rounded-[10px] border border-[var(--badge-warning-text)] bg-[var(--badge-warning-bg)] px-4 py-3">
          <p className="text-[11px] font-medium uppercase tracking-wide text-[var(--badge-warning-text)]/80">
            {t('analytics.spAvgDiscount')}
          </p>
          <p className="font-heading text-xl font-bold tabular-nums text-[var(--badge-warning-text)]">
            {teamTotals.avgDiscountPct !== null ? `${teamTotals.avgDiscountPct}%` : '—'}
          </p>
        </div>
        <div className="rounded-[10px] border border-[var(--badge-warning-text)] bg-[var(--badge-warning-bg)] px-4 py-3">
          <p className="text-[11px] font-medium uppercase tracking-wide text-[var(--badge-warning-text)]/80">
            {t('analytics.spLateness')}
          </p>
          <p className="font-heading text-xl font-bold tabular-nums text-[var(--badge-warning-text)]">
            {teamTotals.latenessRate !== null ? `${teamTotals.latenessRate}%` : '—'}
          </p>
        </div>
        <div className="rounded-[10px] border border-brand-blue bg-brand-blue px-4 py-3">
          <p className="text-[11px] font-medium uppercase tracking-wide text-white/75">
            {t('analytics.spAvgCycle')}
          </p>
          <p className="font-heading text-xl font-bold tabular-nums text-white">
            {teamTotals.avgCycleDays !== null
              ? `${teamTotals.avgCycleDays} ${t('analytics.spRepDays')}`
              : '—'}
          </p>
        </div>
      </div>

      {/* Sortable metric table */}
      <div className="rounded-xl border border-border-default bg-surface-card">
        <Table>
          <TableHeader>
            <TableRow className="h-[34px] hover:bg-transparent">
              <TableHead className="w-10 text-center">#</TableHead>
              <TableHead>{t('analytics.tabSalesperson')}</TableHead>
              {columns.map((col) => {
                const isActive = sort === col.key;
                return (
                  <TableHead key={col.key} className="p-0 text-center">
                    <button
                      type="button"
                      onClick={() => onSortChange(col.key)}
                      className={cn(
                        'relative flex h-[34px] w-full items-center justify-center px-4 uppercase transition-colors hover:text-text-primary',
                        isActive ? 'font-semibold text-brand-blue' : 'text-text-tertiary',
                      )}
                    >
                      {col.label}
                      <IconChevronDown
                        className={cn(
                          'absolute right-2 h-3.5 w-3.5',
                          isActive ? 'opacity-100' : 'opacity-0',
                        )}
                        aria-hidden="true"
                      />
                    </button>
                  </TableHead>
                );
              })}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row, idx) => {
              const rank = idx + 1;
              const crownColor = crownColorMap[rank];
              return (
                <TableRow
                  key={row.salespersonId}
                  onClick={() => onSelectRep(row.salespersonId)}
                  className="cursor-pointer"
                >
                  <TableCell className="text-center">
                    {crownColor ? (
                      <IconCrown className={cn('mx-auto h-5 w-5', crownColor)} aria-hidden="true" />
                    ) : (
                      <span className="tabular-nums text-text-tertiary">{rank}</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-blue-light text-xs font-medium text-brand-blue">
                        {row.fullName.charAt(0).toUpperCase()}
                      </div>
                      <span className="truncate font-medium text-text-primary">
                        {row.fullName}
                        {!row.isActive && (
                          <span className="ml-1.5 text-[10px] uppercase text-text-tertiary">
                            {t('analytics.inactive')}
                          </span>
                        )}
                      </span>
                    </div>
                  </TableCell>
                  {columns.map((col) => {
                    const isActive = sort === col.key;
                    return (
                      <TableCell
                        key={col.key}
                        className={cn(
                          'text-center tabular-nums',
                          isActive ? 'font-semibold text-text-primary' : 'text-text-secondary',
                        )}
                      >
                        {col.render(row, locale)}
                      </TableCell>
                    );
                  })}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
