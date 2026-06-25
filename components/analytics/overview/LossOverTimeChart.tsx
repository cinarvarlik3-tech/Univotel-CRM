/**
 * Loss over time — dual rate/count mode with maturing-bucket warning.
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
} from 'recharts';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CalcNote } from '@/components/analytics/overview/CalcNote';
import {
  AnalyticsChartHeader,
  analyticsChartBodyClass,
  analyticsChartCardClass,
} from '@/components/analytics/overview/AnalyticsChartHeader';
import {
  analyticsChartSelectClass,
  analyticsChartHeaderControlsClass,
} from '@/components/analytics/overview/analytics-chart-controls';
import { useTranslation } from '@/hooks/useTranslation';
import { formatNumber } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import type { LossOverTimeMode } from '@/lib/analytics/loss-analysis';
import type { OverviewLineSeries, OverviewRateLineSeries } from '@/lib/analytics/overview-shared';

interface LossOverTimeChartProps {
  mode: LossOverTimeMode;
  onModeChange: (mode: LossOverTimeMode) => void;
  rateSeries: OverviewRateLineSeries;
  countSeries: OverviewLineSeries;
  showCalcNotes: boolean;
  cohortLeadCount: number;
  headerExtra?: React.ReactNode;
}

function dayLabel(day: string, locale: string): string {
  return new Date(`${day}T00:00:00+03:00`).toLocaleDateString(locale === 'tr' ? 'tr-TR' : 'en-GB', {
    day: 'numeric',
    month: 'short',
  });
}

export function LossOverTimeChart({
  mode,
  onModeChange,
  rateSeries,
  countSeries,
  showCalcNotes,
  cohortLeadCount,
  headerExtra,
}: LossOverTimeChartProps) {
  const { locale, t } = useTranslation();

  const activeSeries = mode === 'rate' ? rateSeries : countSeries;
  const subLabel =
    mode === 'rate' ? t('analytics.lossOverTimeByIntake') : t('analytics.lossOverTimeByLossDate');

  const chartData = useMemo(
    () =>
      activeSeries.days.map((day, i) => ({
        day,
        label: dayLabel(day, locale),
        value: activeSeries.values[i] ?? 0,
        maturing: mode === 'rate' && rateSeries.maturingIndices.includes(i),
      })),
    [activeSeries, mode, rateSeries.maturingIndices, locale],
  );

  const hasData =
    mode === 'rate' ? cohortLeadCount > 0 : countSeries.values.reduce((s, v) => s + v, 0) > 0;

  return (
    <div className={cn(analyticsChartCardClass, 'w-full')}>
      <AnalyticsChartHeader
        title={t('analytics.lossOverTime')}
        stackedSubLabel={subLabel}
        headerExtra={
          <div className={analyticsChartHeaderControlsClass}>
            {headerExtra}
            <Select value={mode} onValueChange={(v) => onModeChange(v as LossOverTimeMode)}>
              <SelectTrigger className={analyticsChartSelectClass('w-[52px]')}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="rate">{t('analytics.lossModeRate')}</SelectItem>
                <SelectItem value="count">{t('analytics.lossModeCount')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        }
        footer={
          <>
            <CalcNote
              text={
                mode === 'rate'
                  ? t('analytics.explainLossOverTimeRate')
                  : t('analytics.explainLossOverTimeCount')
              }
              show={showCalcNotes}
              className="text-white/60"
            />
            {mode === 'rate' && (
              <CalcNote
                text={t('analytics.lossRateMaturingWarning')}
                show
                alwaysVisible
                className="text-amber-200"
              />
            )}
          </>
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
                  allowDecimals={mode === 'rate'}
                  domain={mode === 'rate' ? [0, 100] : undefined}
                  tick={{ fontSize: 10, fill: 'var(--text-tertiary)' }}
                  width={mode === 'rate' ? 36 : 32}
                  tickFormatter={mode === 'rate' ? (v) => `${v}%` : undefined}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const item = payload[0]?.payload as {
                      label: string;
                      value: number;
                      maturing?: boolean;
                    };
                    return (
                      <div className="rounded-lg border border-border-default bg-surface-card px-3 py-2 text-xs shadow-sm">
                        <p className="font-medium text-text-primary">{item.label}</p>
                        <p className="tabular-nums text-text-secondary">
                          {mode === 'rate'
                            ? `${item.value.toFixed(1)}%`
                            : formatNumber(item.value, locale)}
                        </p>
                        {item.maturing && (
                          <p className="text-amber-600">{t('analytics.lossRateMaturingBucket')}</p>
                        )}
                      </div>
                    );
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="#2e3fa3"
                  strokeWidth={2}
                  dot={(props) => {
                    const { cx, cy, payload } = props as {
                      cx: number;
                      cy: number;
                      payload?: { maturing?: boolean };
                    };
                    if (payload?.maturing) {
                      return (
                        <circle
                          key={`${cx}-${cy}`}
                          cx={cx}
                          cy={cy}
                          r={4}
                          fill="#94a3b8"
                          stroke="#64748b"
                          strokeDasharray="2 2"
                        />
                      );
                    }
                    return <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={0} fill="transparent" />;
                  }}
                  activeDot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          {mode === 'rate' && rateSeries.maturingIndices.length > 0 && (
            <p className="mt-2 text-[11px] text-text-tertiary">
              {t('analytics.lossRateMaturingLegend')}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
