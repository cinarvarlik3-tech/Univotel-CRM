/**
 * Ranked horizontal bar chart — lost leads by source (counts, descending).
 */
import { useMemo } from 'react';
import {
  AnalyticsChartHeader,
  analyticsChartBodyClass,
  analyticsChartCardClass,
} from '@/components/analytics/overview/AnalyticsChartHeader';
import { CalcNote } from '@/components/analytics/overview/CalcNote';
import { useTranslation } from '@/hooks/useTranslation';
import { formatNumber } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import type { OverviewSourceBar } from '@/lib/analytics/overview-shared';

interface RankedSourceBarChartProps {
  title: string;
  bars: OverviewSourceBar[];
  resolveLabel: (id: string) => string;
  headerExtra?: React.ReactNode;
  explanation?: string;
  showCalcNotes?: boolean;
}

export function RankedSourceBarChart({
  title,
  bars,
  resolveLabel,
  headerExtra,
  explanation,
  showCalcNotes = false,
}: RankedSourceBarChartProps) {
  const { locale, t } = useTranslation();

  const rows = useMemo(
    () =>
      [...bars]
        .sort((a, b) => b.count - a.count)
        .map((bar) => ({
          id: bar.id,
          label: resolveLabel(bar.id),
          count: bar.count,
        })),
    [bars, resolveLabel],
  );

  const max = Math.max(...rows.map((r) => r.count), 1);

  return (
    <div className={cn(analyticsChartCardClass, 'w-full')}>
      <AnalyticsChartHeader
        title={title}
        headerExtra={headerExtra}
        footer={
          showCalcNotes && explanation ? (
            <CalcNote text={explanation} show={showCalcNotes} className="text-white/60" />
          ) : undefined
        }
      />

      {rows.length === 0 ? (
        <p
          className={cn(
            analyticsChartBodyClass,
            'flex flex-1 items-center justify-center p-5 text-sm text-text-tertiary',
          )}
        >
          {t('analytics.noDataForPeriod')}
        </p>
      ) : (
        <div className={cn(analyticsChartBodyClass, 'flex-1 flex-col gap-3 p-5')}>
          {rows.map((row) => (
            <div
              key={row.id}
              className="grid grid-cols-[minmax(0,140px)_1fr_auto] items-center gap-3"
            >
              <span className="truncate text-xs text-text-secondary">{row.label}</span>
              <div className="h-3 overflow-hidden rounded-full bg-border-default/40">
                <div
                  className="h-full rounded-full bg-brand-blue transition-all"
                  style={{ width: `${(row.count / max) * 100}%` }}
                />
              </div>
              <span className="min-w-[2.5rem] text-right text-xs font-medium tabular-nums text-text-primary">
                {formatNumber(row.count, locale)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
