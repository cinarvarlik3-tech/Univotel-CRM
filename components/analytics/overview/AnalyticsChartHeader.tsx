/**
 * Shared blue title bar for analytics charts — equal height in side-by-side pairs via subgrid.
 */
import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

export interface AnalyticsChartHeaderProps {
  title: string;
  /** Inline subtitle beside the title (single-line header row). */
  subLabel?: string;
  /** Title + subtitle stacked in the left column (e.g. loss over time). */
  stackedSubLabel?: string;
  snapshot?: boolean;
  snapshotLabel?: string;
  headerExtra?: ReactNode;
  footer?: ReactNode;
  className?: string;
}

export function AnalyticsChartHeader({
  title,
  subLabel,
  stackedSubLabel,
  snapshot,
  snapshotLabel,
  headerExtra,
  footer,
  className,
}: AnalyticsChartHeaderProps) {
  return (
    <div
      className={cn(
        'flex h-full min-h-[4.5rem] flex-col rounded-t-2xl bg-brand-blue px-4 py-3',
        className,
      )}
    >
      <div className="flex min-h-10 shrink-0 items-center gap-2">
        {stackedSubLabel !== undefined ? (
          <div className="flex min-w-0 flex-col justify-center gap-0.5">
            <h3 className="text-sm font-semibold leading-none text-white">{title}</h3>
            <span className="text-[10px] font-medium leading-none text-white/70">
              {stackedSubLabel}
            </span>
          </div>
        ) : (
          <>
            <h3 className="shrink-0 text-sm font-semibold leading-none text-white">{title}</h3>
            {subLabel && (
              <span className="shrink-0 text-[10px] font-medium leading-none text-white/70">
                {subLabel}
              </span>
            )}
            {snapshot && snapshotLabel && (
              <span className="shrink-0 text-[10px] font-medium leading-none text-white/70">
                {snapshotLabel}
              </span>
            )}
          </>
        )}
        {headerExtra && (
          <>
            <div className="min-w-0 flex-1" aria-hidden />
            <div className="flex shrink-0 items-center">{headerExtra}</div>
          </>
        )}
      </div>
      {footer && <div className="mt-1 shrink-0 space-y-1">{footer}</div>}
      {/* Grows when subgrid stretches this header to match a taller neighbor */}
      <div className="min-h-0 flex-1" aria-hidden />
    </div>
  );
}

/** Grid wrapper for two charts per row — headers align via subgrid. */
export const analyticsChartPairGridClass =
  'grid w-full grid-cols-1 gap-4 lg:grid-cols-2 lg:grid-rows-[auto_1fr]';

/** Card shell — participates in pair grid subgrid on lg+. */
export const analyticsChartCardClass =
  'grid min-h-[380px] grid-rows-[auto_1fr] rounded-2xl border border-border-default bg-surface-card shadow-sm lg:row-span-2 lg:grid-rows-subgrid';

/** Chart body area below the title bar. */
export const analyticsChartBodyClass = 'flex min-h-0 flex-col';
