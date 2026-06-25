/**
 * Analytics pie chart — donut with legend and hover tooltip (% + count).
 */
import { useMemo } from 'react';
import { Cell, Pie, PieChart as RechartsPie, ResponsiveContainer, Tooltip } from 'recharts';
import {
  AnalyticsChartHeader,
  analyticsChartBodyClass,
  analyticsChartCardClass,
} from '@/components/analytics/overview/AnalyticsChartHeader';
import { CalcNote } from '@/components/analytics/overview/CalcNote';
import { useTranslation } from '@/hooks/useTranslation';
import { formatNumber } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import type { OverviewPieSlice } from '@/lib/analytics/overview-shared';

const SLICE_COLORS = [
  '#2e3fa3',
  '#6b7fe3',
  '#b83228',
  '#0e7490',
  '#6d28d9',
  '#b06000',
  '#1b6b2f',
  '#e05a4e',
  '#4f46e5',
  '#0891b2',
];

export interface PieSliceLabel {
  id: string;
  label: string;
}

interface AnalyticsPieChartProps {
  title: string;
  slices: OverviewPieSlice[];
  resolveLabel: (id: string) => string;
  isSnapshot?: boolean;
  headerExtra?: React.ReactNode;
  explanation?: string;
  showCalcNotes?: boolean;
}

export function AnalyticsPieChart({
  title,
  slices,
  resolveLabel,
  isSnapshot,
  headerExtra,
  explanation,
  showCalcNotes = false,
}: AnalyticsPieChartProps) {
  const { locale, t } = useTranslation();

  const chartData = useMemo(
    () =>
      slices.map((slice, index) => ({
        id: slice.id,
        name: resolveLabel(slice.id),
        value: slice.count,
        color: SLICE_COLORS[index % SLICE_COLORS.length],
      })),
    [slices, resolveLabel],
  );

  const total = chartData.reduce((s, d) => s + d.value, 0);

  return (
    <div className={cn(analyticsChartCardClass, 'w-full')}>
      <AnalyticsChartHeader
        title={title}
        snapshot={isSnapshot}
        snapshotLabel={t('analytics.snapshotBadge')}
        headerExtra={headerExtra}
        footer={
          showCalcNotes && explanation ? (
            <CalcNote text={explanation} show={showCalcNotes} className="text-white/60" />
          ) : undefined
        }
      />

      {chartData.length === 0 || total === 0 ? (
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
          <div className="mx-auto h-[240px] w-full max-w-md shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <RechartsPie>
                <Pie
                  data={chartData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={90}
                  paddingAngle={2}
                >
                  {chartData.map((entry) => (
                    <Cell key={entry.id} fill={entry.color} stroke="transparent" />
                  ))}
                </Pie>
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const item = payload[0];
                    const val = Number(item.value ?? 0);
                    const pct = total > 0 ? Math.round((val / total) * 100) : 0;
                    return (
                      <div className="rounded-lg border border-border-default bg-surface-card px-3 py-2 text-xs shadow-sm">
                        <p className="font-medium text-text-primary">{item.name}</p>
                        <p className="tabular-nums text-text-secondary">
                          {formatNumber(val, locale)} ({pct}%)
                        </p>
                      </div>
                    );
                  }}
                />
              </RechartsPie>
            </ResponsiveContainer>
          </div>

          <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-2">
            {chartData.map((entry) => {
              const pct = total > 0 ? Math.round((entry.value / total) * 100) : 0;
              return (
                <li key={entry.id} className="flex items-center gap-2 text-xs">
                  <span
                    className="inline-block h-2.5 w-2.5 shrink-0 rounded-sm"
                    style={{ backgroundColor: entry.color }}
                  />
                  <span className="text-text-secondary">{entry.name}</span>
                  <span className="font-medium tabular-nums text-text-primary">
                    {formatNumber(entry.value, locale)}
                  </span>
                  <span className="tabular-nums text-text-tertiary">({pct}%)</span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
