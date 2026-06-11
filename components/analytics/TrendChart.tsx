/**
 * Lightweight daily trend bar chart for the manager panel.
 * Pure CSS/flex bars — no chart library (keeps the Worker bundle small).
 */
import { useTranslation } from '@/hooks/useTranslation';
import { cn } from '@/lib/utils';

interface TrendChartProps {
  title: string;
  /** YYYY-MM-DD Istanbul day keys (x axis). */
  days: string[];
  /** Count per day — same order/length as days. */
  values: number[];
  /** Tailwind background class for bars. */
  barClassName?: string;
}

/**
 * Formats a YYYY-MM-DD day key as a short localized label (e.g. "11 Haz").
 * @param day - Istanbul day key.
 * @param locale - UI locale.
 * @returns Short date label.
 */
function dayLabel(day: string, locale: string): string {
  return new Date(`${day}T00:00:00+03:00`).toLocaleDateString(locale === 'tr' ? 'tr-TR' : 'en-GB', {
    day: 'numeric',
    month: 'short',
  });
}

/**
 * Renders one titled bar chart card with day-level counts.
 * @param props - Title, day axis, values, and bar color class.
 * @returns Trend chart card element.
 */
export function TrendChart({ title, days, values, barClassName }: TrendChartProps) {
  const { locale, t } = useTranslation();
  const max = Math.max(...values, 0);
  const total = values.reduce((sum, v) => sum + v, 0);

  return (
    <div className="rounded-lg border border-border-default bg-surface-card px-4 py-3.5">
      <div className="mb-3 flex items-baseline justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-text-secondary">
          {title}
        </p>
        <span className="text-sm font-semibold text-text-primary">{total}</span>
      </div>

      {max === 0 ? (
        <p className="flex h-24 items-center justify-center text-xs text-text-tertiary">
          {t('analytics.noTrendData')}
        </p>
      ) : (
        <div className="flex h-24 items-end gap-px">
          {days.map((day, i) => {
            const value = values[i] ?? 0;
            const heightPct = max > 0 ? (value / max) * 100 : 0;
            return (
              <div
                key={day}
                className="group relative flex h-full flex-1 items-end"
                title={`${dayLabel(day, locale)} — ${value}`}
              >
                <div
                  className={cn(
                    'w-full rounded-t-sm transition-opacity group-hover:opacity-80',
                    value > 0 ? (barClassName ?? 'bg-brand-blue') : 'bg-muted',
                  )}
                  style={{ height: value > 0 ? `max(${heightPct}%, 3px)` : '2px' }}
                />
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-1.5 flex justify-between text-[10px] text-text-tertiary">
        <span>{days.length > 0 ? dayLabel(days[0], locale) : ''}</span>
        <span>{days.length > 1 ? dayLabel(days[days.length - 1], locale) : ''}</span>
      </div>
    </div>
  );
}
