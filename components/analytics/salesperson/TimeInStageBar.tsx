/**
 * Bar chart showing median days spent per funnel stage.
 * Non-time-series — horizontal bars, bottleneck highlighted.
 */
import { useMemo } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  AnalyticsChartHeader,
  analyticsChartBodyClass,
  analyticsChartCardClass,
} from '@/components/analytics/overview/AnalyticsChartHeader';
import { CalcNote } from '@/components/analytics/overview/CalcNote';
import { useTranslation } from '@/hooks/useTranslation';
import { cn } from '@/lib/utils';
import { getFunnelStageChartColor } from '@/lib/analytics/funnel-stage-chart-colors';
import type { OverviewStageBar } from '@/lib/analytics/overview-shared';

interface TimeInStageBarProps {
  title: string;
  bars: OverviewStageBar[];
  explanation?: string;
  showCalcNotes?: boolean;
}

export function TimeInStageBar({
  title,
  bars,
  explanation,
  showCalcNotes = false,
}: TimeInStageBarProps) {
  const { t } = useTranslation();

  const chartData = useMemo(() => {
    const relevant = bars.filter((b) => b.medianDays !== null && b.medianDays > 0);
    const maxDays = Math.max(...relevant.map((b) => b.medianDays ?? 0), 0);
    return relevant.map((b) => ({
      stage: b.stage,
      days: b.medianDays ?? 0,
      isBottleneck: b.medianDays === maxDays && maxDays > 0,
    }));
  }, [bars]);

  const hasData = chartData.length > 0;

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
          <div className="h-[220px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                layout="vertical"
                margin={{ top: 4, right: 40, left: 0, bottom: 4 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--border-default)"
                  horizontal={false}
                />
                <XAxis
                  type="number"
                  tick={{ fontSize: 10, fill: 'var(--text-tertiary)' }}
                  tickFormatter={(v) => `${v}${t('analytics.daysShort')}`}
                />
                <YAxis
                  type="category"
                  dataKey="stage"
                  tick={{ fontSize: 9, fill: 'var(--text-tertiary)' }}
                  width={80}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const item = payload[0]?.payload as {
                      stage: string;
                      days: number;
                      isBottleneck: boolean;
                    };
                    return (
                      <div className="rounded-lg border border-border-default bg-surface-card px-3 py-2 text-xs shadow-sm">
                        <p className="font-medium text-text-primary">{item.stage}</p>
                        <p className="tabular-nums text-text-secondary">
                          {item.days.toFixed(1)} {t('analytics.daysShort')}
                          {item.isBottleneck && <span className="ml-1 text-brand-red">▲</span>}
                        </p>
                      </div>
                    );
                  }}
                />
                <Bar dataKey="days" radius={[0, 3, 3, 0]}>
                  {chartData.map((entry) => (
                    <Cell
                      key={entry.stage}
                      fill={entry.isBottleneck ? '#b83228' : getFunnelStageChartColor(entry.stage)}
                      fillOpacity={entry.isBottleneck ? 1 : 0.7}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}
