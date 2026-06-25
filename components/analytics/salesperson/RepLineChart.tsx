/**
 * Line chart for one rep + optional faint team-average benchmark series.
 * Trailing maturing buckets rendered at reduced opacity with a caption.
 */
import { useMemo } from 'react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Bar,
  ComposedChart,
} from 'recharts';
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
import type { DualAxisSeries } from '@/lib/analytics/salesperson';

interface RepLineChartProps {
  title: string;
  series: OverviewLineSeries;
  teamSeries?: OverviewLineSeries;
  explanation?: string;
  showCalcNotes?: boolean;
  yAxisPercent?: boolean;
  yLabel?: string;
}

interface DualRepLineChartProps {
  title: string;
  series: DualAxisSeries;
  countLabel: string;
  rateLabel: string;
  explanation?: string;
  showCalcNotes?: boolean;
}

function dayLabel(day: string, locale: string): string {
  return new Date(`${day}T00:00:00+03:00`).toLocaleDateString(locale === 'tr' ? 'tr-TR' : 'en-GB', {
    day: 'numeric',
    month: 'short',
  });
}

export function RepLineChart({
  title,
  series,
  teamSeries,
  explanation,
  showCalcNotes = false,
  yAxisPercent = false,
}: RepLineChartProps) {
  const { locale, t } = useTranslation();

  const chartData = useMemo(
    () =>
      series.days.map((day, i) => ({
        day,
        label: dayLabel(day, locale),
        rep: series.values[i] ?? 0,
        team: teamSeries ? (teamSeries.values[i] ?? 0) : undefined,
      })),
    [series, teamSeries, locale],
  );

  const total = series.values.reduce((s, v) => s + v, 0);
  if (total === 0 && series.days.length === 0) {
    return null;
  }

  return (
    <div className={cn(analyticsChartCardClass, 'w-full')}>
      <AnalyticsChartHeader
        title={title}
        footer={
          showCalcNotes && explanation ? (
            <CalcNote text={explanation} show={showCalcNotes} className="text-white/60" />
          ) : undefined
        }
      />
      <div className={cn(analyticsChartBodyClass, 'flex-1 flex-col p-4')}>
        {total === 0 ? (
          <p className="flex flex-1 items-center justify-center text-sm text-text-tertiary">
            {t('analytics.noDataForPeriod')}
          </p>
        ) : (
          <div className="h-[220px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 6, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-default)" />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 10, fill: 'var(--text-tertiary)' }}
                  interval="preserveStartEnd"
                />
                <YAxis
                  allowDecimals={yAxisPercent}
                  domain={yAxisPercent ? [0, 'auto'] : undefined}
                  tick={{ fontSize: 10, fill: 'var(--text-tertiary)' }}
                  width={yAxisPercent ? 36 : 32}
                  tickFormatter={yAxisPercent ? (v) => `${v}%` : undefined}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const item = payload[0]?.payload as {
                      label: string;
                      rep: number;
                      team?: number;
                    };
                    return (
                      <div className="rounded-lg border border-border-default bg-surface-card px-3 py-2 text-xs shadow-sm">
                        <p className="font-medium text-text-primary">{item.label}</p>
                        <p className="tabular-nums text-text-secondary">
                          {yAxisPercent
                            ? `${item.rep.toFixed(1)}%`
                            : formatNumber(item.rep, locale)}
                        </p>
                        {item.team !== undefined && (
                          <p className="text-text-tertiary">
                            {t('analytics.allTeam')}:{' '}
                            {yAxisPercent
                              ? `${item.team.toFixed(1)}%`
                              : formatNumber(item.team, locale)}
                          </p>
                        )}
                      </div>
                    );
                  }}
                />
                {teamSeries && (
                  <Line
                    type="monotone"
                    dataKey="team"
                    stroke="#2e3fa3"
                    strokeOpacity={0.25}
                    strokeDasharray="4 4"
                    strokeWidth={1.5}
                    dot={false}
                  />
                )}
                <Line
                  type="monotone"
                  dataKey="rep"
                  stroke="#2e3fa3"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}

export function DualRepLineChart({
  title,
  series,
  countLabel,
  rateLabel,
  explanation,
  showCalcNotes = false,
}: DualRepLineChartProps) {
  const { locale, t } = useTranslation();

  const chartData = useMemo(
    () =>
      series.days.map((day, i) => ({
        day,
        label: dayLabel(day, locale),
        count: series.counts[i] ?? 0,
        rate: series.rates[i] ?? 0,
        maturing: series.maturingIndices.includes(i),
      })),
    [series, locale],
  );

  const hasData = series.counts.some((v) => v > 0);

  return (
    <div className={cn(analyticsChartCardClass, 'w-full')}>
      <AnalyticsChartHeader
        title={title}
        footer={
          showCalcNotes && explanation ? (
            <CalcNote text={explanation} show={showCalcNotes} className="text-white/60" />
          ) : undefined
        }
      />
      <div className={cn(analyticsChartBodyClass, 'flex-1 flex-col p-4')}>
        {!hasData ? (
          <p className="flex flex-1 items-center justify-center text-sm text-text-tertiary">
            {t('analytics.noDataForPeriod')}
          </p>
        ) : (
          <>
            <div className="h-[200px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData} margin={{ top: 6, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-default)" />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 10, fill: 'var(--text-tertiary)' }}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    yAxisId="count"
                    tick={{ fontSize: 10, fill: 'var(--text-tertiary)' }}
                    width={28}
                  />
                  <YAxis
                    yAxisId="rate"
                    orientation="right"
                    tick={{ fontSize: 10, fill: 'var(--text-tertiary)' }}
                    width={36}
                    tickFormatter={(v) => `${v}%`}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const item = payload[0]?.payload as {
                        label: string;
                        count: number;
                        rate: number;
                        maturing: boolean;
                      };
                      return (
                        <div className="rounded-lg border border-border-default bg-surface-card px-3 py-2 text-xs shadow-sm">
                          <p className="font-medium text-text-primary">
                            {item.label}
                            {item.maturing && (
                              <span className="ml-1 text-text-tertiary">
                                ({t('analytics.lossRateMaturingBucket')})
                              </span>
                            )}
                          </p>
                          <p className="tabular-nums text-text-secondary">
                            {countLabel}: {formatNumber(item.count, locale)}
                          </p>
                          <p className="tabular-nums text-text-secondary">
                            {rateLabel}: {item.rate.toFixed(1)}%
                          </p>
                        </div>
                      );
                    }}
                  />
                  <Bar
                    yAxisId="count"
                    dataKey="count"
                    fill="#2e3fa3"
                    fillOpacity={0.3}
                    radius={[2, 2, 0, 0]}
                  />
                  <Line
                    yAxisId="rate"
                    type="monotone"
                    dataKey="rate"
                    stroke="#2e3fa3"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4 }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            {series.maturingIndices.length > 0 && (
              <p className="mt-1.5 text-[10px] text-text-tertiary">
                {t('analytics.spMaturingCaption')}
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
