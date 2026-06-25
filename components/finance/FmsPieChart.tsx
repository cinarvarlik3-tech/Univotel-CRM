/**
 * FMS pie chart — revenue breakdown by partner, property, or room type.
 */
import { useMemo, useState } from 'react';
import { Cell, Pie, PieChart as RechartsPie, ResponsiveContainer, Tooltip } from 'recharts';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useTranslation } from '@/hooks/useTranslation';
import { formatTry } from '@/lib/finance/format';
import type { FmsPieBreakdown } from '@/lib/finance/types';

export type FmsPieMetric = 'revenue' | 'ourCut' | 'profit';

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

interface FmsPieChartProps {
  pie: FmsPieBreakdown | undefined;
  isLoading?: boolean;
}

function metricValue(
  slice: { revenue: number; ourCut: number; profit: number },
  metric: FmsPieMetric,
) {
  if (metric === 'ourCut') return slice.ourCut;
  if (metric === 'profit') return slice.profit;
  return slice.revenue;
}

export function FmsPieChart({ pie, isLoading }: FmsPieChartProps) {
  const { t } = useTranslation();
  const [metric, setMetric] = useState<FmsPieMetric>('revenue');

  const metricLabel = useMemo(() => {
    if (metric === 'ourCut') return t('fms.univotelRevenue');
    if (metric === 'profit') return t('fms.clientProfit');
    return t('fms.clientRevenue');
  }, [metric, t]);

  const title = useMemo(() => {
    if (!pie) return metricLabel;
    if (pie.mode === 'roomType') return t('fms.pieTitleByRoomTypes', { metric: metricLabel });
    return t('fms.pieTitleByProperties', { metric: metricLabel });
  }, [pie, metricLabel, t]);

  const chartData = useMemo(() => {
    if (!pie) return [];
    return pie.slices
      .filter((s) => metricValue(s, metric) > 0)
      .map((slice, index) => ({
        id: slice.id,
        name: slice.name,
        value: metricValue(slice, metric),
        color: SLICE_COLORS[index % SLICE_COLORS.length],
      }));
  }, [pie, metric]);

  const total = chartData.reduce((s, d) => s + d.value, 0);

  if (isLoading && pie === undefined) {
    return <Skeleton className="min-h-[380px] w-full rounded-2xl" />;
  }

  return (
    <div className="flex min-h-[380px] w-full flex-col rounded-2xl border border-border-default bg-surface-card shadow-sm">
      <div className="flex items-start justify-between gap-3 rounded-t-2xl bg-brand-blue px-5 py-4">
        <h3 className="text-base font-semibold text-white">{title}</h3>
        <Select value={metric} onValueChange={(v) => setMetric(v as FmsPieMetric)}>
          <SelectTrigger className="h-8 w-[180px] text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="revenue">{t('fms.clientRevenue')}</SelectItem>
            <SelectItem value="ourCut">{t('fms.univotelRevenue')}</SelectItem>
            <SelectItem value="profit">{t('fms.clientProfit')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {chartData.length === 0 ? (
        <p className="flex flex-1 items-center justify-center p-5 text-sm text-text-tertiary">
          {t('fms.pieNoData')}
        </p>
      ) : (
        <div className="flex flex-1 flex-col p-5">
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
                          {formatTry(val)} ({pct}%)
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
                    {formatTry(entry.value)}
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
