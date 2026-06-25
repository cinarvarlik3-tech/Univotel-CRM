/**
 * Shared compact control styles for analytics chart headers (blue bar).
 * Matches the messages-over-time graph: white bg, dark text, h-6 / 9px.
 */
import { cn } from '@/lib/utils';

/** Props applied to OverviewRangeFilter widgets inside chart headers. */
export const analyticsChartRangeFilterProps = {
  appearance: 'inverse' as const,
  size: 'xs' as const,
  className: 'flex-nowrap',
};

/** SelectTrigger classes for dropdowns on blue chart headers. */
export function analyticsChartSelectClass(widthClass: string) {
  return cn(
    'h-6 min-w-0 border-gray-200 bg-white px-1.5 text-[9px] leading-none text-gray-900',
    '[&>span]:truncate [&_svg]:size-2.5',
    widthClass,
  );
}

/** Wrapper for one or more header controls (dropdown + date picker). */
export const analyticsChartHeaderControlsClass = 'flex shrink-0 flex-nowrap items-center gap-1';

/** Compact inverse button for chart header actions (e.g. Show Stages). */
export function analyticsChartButtonClass(extra?: string) {
  return cn(
    'h-6 shrink-0 rounded-md border border-white/40 bg-white px-1.5 text-[9px] leading-none text-gray-900 transition-colors hover:bg-gray-50 disabled:pointer-events-none disabled:opacity-45',
    extra,
  );
}
