/**
 * Comparative pie chart — rep slice distribution vs team distribution side by side.
 * Uses two horizontal bar charts to avoid a cluttered dual-donut.
 */
import { useMemo } from 'react';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import {
  AnalyticsChartHeader,
  analyticsChartBodyClass,
  analyticsChartCardClass,
} from '@/components/analytics/overview/AnalyticsChartHeader';
import { useTranslation } from '@/hooks/useTranslation';
import { formatNumber } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import type { ComparativePieSlice } from '@/lib/analytics/salesperson';

const COLORS = [
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

interface ComparativePieProps {
  title: string;
  slices: ComparativePieSlice[];
  resolveLabel: (id: string) => string;
  explanation?: string;
  showCalcNotes?: boolean;
}

export function ComparativePie({ title, slices, resolveLabel }: ComparativePieProps) {
  const { locale, t } = useTranslation();

  const repData = useMemo(
    () =>
      slices
        .filter((s) => s.repCount > 0)
        .map((s, i) => ({
          id: s.id,
          name: resolveLabel(s.id),
          value: s.repCount,
          color: COLORS[i % COLORS.length]!,
        })),
    [slices, resolveLabel],
  );

  const teamData = useMemo(
    () =>
      slices
        .filter((s) => s.teamCount > 0)
        .map((s, i) => ({
          id: s.id,
          name: resolveLabel(s.id),
          value: s.teamCount,
          color: COLORS[i % COLORS.length]!,
        })),
    [slices, resolveLabel],
  );

  const repTotal = repData.reduce((s, d) => s + d.value, 0);
  const teamTotal = teamData.reduce((s, d) => s + d.value, 0);

  const hasData = repTotal > 0 || teamTotal > 0;

  return (
    <div className={cn(analyticsChartCardClass, 'w-full')}>
      <AnalyticsChartHeader title={title} />
      <div className={cn(analyticsChartBodyClass, 'flex-1 flex-col p-4')}>
        {!hasData ? (
          <p className="flex flex-1 items-center justify-center text-sm text-text-tertiary">
            {t('analytics.noDataForPeriod')}
          </p>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-4">
              {/* Rep donut */}
              <div>
                <p className="mb-1 text-center text-[10px] font-medium uppercase tracking-wide text-text-tertiary">
                  {t('analytics.tableAgent')}
                </p>
                <div className="h-[140px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={repData}
                        dataKey="value"
                        cx="50%"
                        cy="50%"
                        innerRadius={35}
                        outerRadius={60}
                        paddingAngle={2}
                      >
                        {repData.map((entry) => (
                          <Cell key={entry.id} fill={entry.color} stroke="transparent" />
                        ))}
                      </Pie>
                      <Tooltip
                        content={({ active, payload }) => {
                          if (!active || !payload?.length) return null;
                          const item = payload[0];
                          const val = Number(item.value ?? 0);
                          const pct = repTotal > 0 ? Math.round((val / repTotal) * 100) : 0;
                          return (
                            <div className="rounded-lg border border-border-default bg-surface-card px-2 py-1.5 text-xs shadow-sm">
                              <p className="font-medium">{item.name}</p>
                              <p className="tabular-nums text-text-secondary">
                                {formatNumber(val, locale)} ({pct}%)
                              </p>
                            </div>
                          );
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Team donut */}
              <div>
                <p className="mb-1 text-center text-[10px] font-medium uppercase tracking-wide text-text-tertiary">
                  {t('analytics.allTeam')}
                </p>
                <div className="h-[140px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={teamData}
                        dataKey="value"
                        cx="50%"
                        cy="50%"
                        innerRadius={35}
                        outerRadius={60}
                        paddingAngle={2}
                      >
                        {teamData.map((entry) => (
                          <Cell key={entry.id} fill={entry.color} stroke="transparent" />
                        ))}
                      </Pie>
                      <Tooltip
                        content={({ active, payload }) => {
                          if (!active || !payload?.length) return null;
                          const item = payload[0];
                          const val = Number(item.value ?? 0);
                          const pct = teamTotal > 0 ? Math.round((val / teamTotal) * 100) : 0;
                          return (
                            <div className="rounded-lg border border-border-default bg-surface-card px-2 py-1.5 text-xs shadow-sm">
                              <p className="font-medium">{item.name}</p>
                              <p className="tabular-nums text-text-secondary">
                                {formatNumber(val, locale)} ({pct}%)
                              </p>
                            </div>
                          );
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Shared legend */}
            <ul className="flex flex-wrap gap-x-3 gap-y-1.5">
              {slices
                .filter((s) => s.repCount > 0 || s.teamCount > 0)
                .map((s, i) => (
                  <li key={s.id} className="flex items-center gap-1.5 text-[11px]">
                    <span
                      className="inline-block h-2 w-2 shrink-0 rounded-sm"
                      style={{ backgroundColor: COLORS[i % COLORS.length] }}
                    />
                    <span className="text-text-secondary">{resolveLabel(s.id)}</span>
                  </li>
                ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
