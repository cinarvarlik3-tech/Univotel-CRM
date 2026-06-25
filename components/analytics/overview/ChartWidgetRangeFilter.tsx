/**
 * Widget-tier date filter for analytics chart headers (global → section → widget).
 */
import { OverviewRangeFilter } from '@/components/analytics/overview/OverviewRangeFilter';
import { analyticsChartRangeFilterProps } from '@/components/analytics/overview/analytics-chart-controls';
import type { OverviewRangeSelection } from '@/lib/analytics/overview-range';

export function ChartWidgetRangeFilter({
  global,
  section,
  value,
  onChange,
  disabled,
}: {
  global: OverviewRangeSelection;
  section: OverviewRangeSelection;
  value: OverviewRangeSelection;
  onChange: (next: OverviewRangeSelection) => void;
  disabled?: boolean;
}) {
  return (
    <OverviewRangeFilter
      tier="widget"
      showOff={false}
      global={global}
      section={section}
      value={value}
      onChange={onChange}
      disabled={disabled}
      {...analyticsChartRangeFilterProps}
    />
  );
}
