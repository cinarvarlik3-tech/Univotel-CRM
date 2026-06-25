/**
 * Analytics line chart — daily trend series with empty state.
 */
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
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
import type { OverviewLineSeries } from '@/lib/analytics/overview-shared';

interface AnalyticsLineChartProps {
  title: string;
  series: OverviewLineSeries;
  headerExtra?: React.ReactNode;
  subLabel?: string;
  explanation?: string;
  showCalcNotes?: boolean;
  yAxisPercent?: boolean;
  /** When true, render chart if axis has days (for 0% cohort rates). */
  allowZeroSeries?: boolean;
}

function dayLabel(day: string, locale: string): string {
  return new Date(`${day}T00:00:00+03:00`).toLocaleDateString(locale === 'tr' ? 'tr-TR' : 'en-GB', {
    day: 'numeric',
    month: 'short',
  });
}

export function AnalyticsLineChart({
  title,
  series,
  headerExtra,
  subLabel,
  explanation,
  showCalcNotes = false,
  yAxisPercent = false,
  allowZeroSeries = false,
}: AnalyticsLineChartProps) {
  const { locale, t } = useTranslation();

  const chartData = useMemo(
    () =>
      series.days.map((day, i) => ({
        day,
        label: dayLabel(day, locale),
        value: series.values[i] ?? 0,
      })),
    [series, locale],
  );

  const total = series.values.reduce((s, v) => s + v, 0);
  const hasData = allowZeroSeries ? series.days.length > 0 : total > 0;

  return (
    <div className={cn(analyticsChartCardClass, 'w-full')}>
      <AnalyticsChartHeader
        title={title}
        subLabel={subLabel}
        headerExtra={headerExtra}
        footer={
          showCalcNotes && explanation ? (
            <CalcNote text={explanation} show={showCalcNotes} className="text-white/60" />
          ) : undefined
        }
      />

      {!hasData ? (
        <p
          className={cn(
            analyticsChartBodyClass,
            'flex flex-1 items-center justify-center p-5 text-sm text-text-tertiary',
          )}
        >
          {t('analytics.noDataForPeriod')}
        </p>
      ) : (
        <div className={cn(analyticsChartBodyClass, 'flex-1 flex-col p-5')}>
          <div className="h-[260px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-default)" />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 10, fill: 'var(--text-tertiary)' }}
                  interval="preserveStartEnd"
                />
                <YAxis
                  allowDecimals={yAxisPercent}
                  domain={yAxisPercent ? [0, 100] : undefined}
                  tick={{ fontSize: 10, fill: 'var(--text-tertiary)' }}
                  width={yAxisPercent ? 36 : 32}
                  tickFormatter={yAxisPercent ? (v) => `${v}%` : undefined}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const item = payload[0]?.payload as { label: string; value: number };
                    return (
                      <div className="rounded-lg border border-border-default bg-surface-card px-3 py-2 text-xs shadow-sm">
                        <p className="font-medium text-text-primary">{item.label}</p>
                        <p className="tabular-nums text-text-secondary">
                          {yAxisPercent
                            ? `${item.value.toFixed(1)}%`
                            : formatNumber(item.value, locale)}
                        </p>
                      </div>
                    );
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="#2e3fa3"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
