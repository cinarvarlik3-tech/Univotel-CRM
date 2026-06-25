/**
 * Horizontal bar chart — median days in funnel stage (absolute days, not %).
 */
import { useMemo } from 'react';
import {
  AnalyticsChartHeader,
  analyticsChartBodyClass,
  analyticsChartCardClass,
} from '@/components/analytics/overview/AnalyticsChartHeader';
import { CalcNote } from '@/components/analytics/overview/CalcNote';
import { useTranslation } from '@/hooks/useTranslation';
import { formatEnumLabel } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { getFunnelStageChartColor } from '@/lib/analytics/funnel-stage-chart-colors';
import type { OverviewStageBar } from '@/lib/analytics/overview-shared';

interface AnalyticsHorizontalBarChartProps {
  title: string;
  rows: OverviewStageBar[];
  headerExtra?: React.ReactNode;
  explanation?: string;
  showCalcNotes?: boolean;
  /** When set, only these stages are rendered (preserves row order). */
  visibleStages?: ReadonlySet<string>;
  /** Per-stage bar colors; defaults to funnel stage palette. */
  getBarColor?: (stage: string) => string;
}

export function AnalyticsHorizontalBarChart({
  title,
  rows,
  headerExtra,
  explanation,
  showCalcNotes = false,
  visibleStages,
  getBarColor = getFunnelStageChartColor,
}: AnalyticsHorizontalBarChartProps) {
  const { locale, t } = useTranslation();
  const emDash = t('common.emDash');

  const chartData = useMemo(() => {
    const filtered = visibleStages ? rows.filter((row) => visibleStages.has(row.stage)) : rows;
    return filtered.map((row) => ({
      stage: row.stage,
      label: formatEnumLabel(locale, 'funnel', row.stage),
      medianDays: row.medianDays ?? 0,
      display:
        row.medianDays !== null
          ? `${row.medianDays.toFixed(1)} ${t('analytics.daysShort')}`
          : emDash,
      hasData: row.medianDays !== null,
      barColor: getBarColor(row.stage),
    }));
  }, [rows, visibleStages, locale, t, emDash, getBarColor]);

  const maxMedianDays = useMemo(
    () => Math.max(...chartData.filter((d) => d.hasData).map((d) => d.medianDays), 1),
    [chartData],
  );

  const hasAnyData = chartData.some((r) => r.hasData);

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

      {!hasAnyData ? (
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
          {chartData.map((row) => (
            <div
              key={row.stage}
              className="grid grid-cols-[minmax(0,140px)_1fr_auto] items-center gap-3"
            >
              <span className="truncate text-xs text-text-secondary">{row.label}</span>
              <div className="h-3 overflow-hidden rounded-full bg-border-default/40">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: row.hasData
                      ? `${Math.min(100, (row.medianDays / maxMedianDays) * 100)}%`
                      : '0%',
                    backgroundColor: row.barColor,
                  }}
                />
              </div>
              <span className="min-w-[3.5rem] text-right text-xs font-medium tabular-nums text-text-primary">
                {row.display}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
