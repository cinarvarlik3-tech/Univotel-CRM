/**
 * Marketing analytics tab — source attribution + ad-spend placeholder.
 */
import { Skeleton } from '@/components/ui/skeleton';
import { AnalyticsPieChart } from '@/components/analytics/overview/AnalyticsPieChart';
import { analyticsChartPairGridClass } from '@/components/analytics/overview/AnalyticsChartHeader';
import {
  AnalyticsSection,
  useSourceLabel,
} from '@/components/analytics/overview/analytics-tab-shared';
import { ChartWidgetRangeFilter } from '@/components/analytics/overview/ChartWidgetRangeFilter';
import { SourceAttributionCards } from '@/components/analytics/overview/SourceAttributionCards';
import { useAnalyticsMarketing } from '@/hooks/useAnalyticsTabs';
import type { AnalyticsFilterState } from '@/hooks/useAnalyticsTabs';
import { useTranslation } from '@/hooks/useTranslation';
import { isRangeOverridden } from '@/lib/analytics/overview-range';

interface MarketingTabProps {
  enabled: boolean;
  filters: AnalyticsFilterState;
  onPatch: (partial: Partial<AnalyticsFilterState>) => void;
  showCalcNotes: boolean;
}

export function MarketingTab({ enabled, filters, onPatch, showCalcNotes }: MarketingTabProps) {
  const { t } = useTranslation();
  const sourceLabel = useSourceLabel();
  const { data, error, isLoading } = useAnalyticsMarketing(enabled, filters);

  if (isLoading && !data) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-[100px] w-full" />
        <Skeleton className="h-[380px] w-full" />
      </div>
    );
  }
  if (error) return <p className="text-sm text-brand-red">{t('analytics.failedToLoad')}</p>;
  if (!data) return null;

  const sourceLocked = isRangeOverridden('widget', filters.global, filters.sectionSource);

  return (
    <div className="flex flex-col gap-8">
      <AnalyticsSection
        title={t('analytics.sectionSource')}
        range={filters.sectionSource}
        global={filters.global}
        onRangeChange={(sectionSource) => onPatch({ sectionSource })}
      >
        <SourceAttributionCards counts={data.cards} showCalcNotes={showCalcNotes} />
        <div className={analyticsChartPairGridClass}>
          <AnalyticsPieChart
            title={t('analytics.leadsBySourceAttribution')}
            slices={data.leadsBySource}
            showCalcNotes={showCalcNotes}
            explanation={t('analytics.explainLeadsBySource')}
            headerExtra={
              <ChartWidgetRangeFilter
                global={filters.global}
                section={filters.sectionSource}
                value={filters.widgetLeadsBySource}
                onChange={(widgetLeadsBySource) => onPatch({ widgetLeadsBySource })}
                disabled={sourceLocked}
              />
            }
            resolveLabel={sourceLabel}
          />
          <AnalyticsPieChart
            title={t('analytics.conversionsBySource')}
            slices={data.conversionsBySource}
            showCalcNotes={showCalcNotes}
            explanation={t('analytics.explainConversionsBySource')}
            headerExtra={
              <ChartWidgetRangeFilter
                global={filters.global}
                section={filters.sectionSource}
                value={filters.widgetConversionsBySource}
                onChange={(widgetConversionsBySource) => onPatch({ widgetConversionsBySource })}
                disabled={sourceLocked}
              />
            }
            resolveLabel={sourceLabel}
          />
        </div>
      </AnalyticsSection>

      <section className="flex w-full flex-col gap-3 rounded-2xl border border-dashed border-border-default bg-surface-card/50 px-5 py-8">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-text-secondary">
          {t('analytics.adSpendPlaceholderTitle')}
        </h2>
        <p className="text-sm text-text-tertiary">{t('analytics.adSpendPlaceholderBody')}</p>
      </section>
    </div>
  );
}
