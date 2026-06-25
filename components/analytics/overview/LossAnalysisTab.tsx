/**
 * Loss Analysis analytics tab — four charts in two rows.
 */
import { Skeleton } from '@/components/ui/skeleton';
import { AnalyticsPieChart } from '@/components/analytics/overview/AnalyticsPieChart';
import { analyticsChartPairGridClass } from '@/components/analytics/overview/AnalyticsChartHeader';
import {
  AnalyticsSection,
  useSourceLabel,
} from '@/components/analytics/overview/analytics-tab-shared';
import { ChartWidgetRangeFilter } from '@/components/analytics/overview/ChartWidgetRangeFilter';
import { LossOverTimeChart } from '@/components/analytics/overview/LossOverTimeChart';
import { RankedSourceBarChart } from '@/components/analytics/overview/RankedSourceBarChart';
import { useAnalyticsLossAnalysis } from '@/hooks/useAnalyticsTabs';
import type { AnalyticsFilterState } from '@/hooks/useAnalyticsTabs';
import { useTranslation } from '@/hooks/useTranslation';
import { formatEnumLabel } from '@/lib/i18n';
import { isRangeOverridden } from '@/lib/analytics/overview-range';

interface LossAnalysisTabProps {
  enabled: boolean;
  filters: AnalyticsFilterState;
  onPatch: (partial: Partial<AnalyticsFilterState>) => void;
  showCalcNotes: boolean;
}

export function LossAnalysisTab({
  enabled,
  filters,
  onPatch,
  showCalcNotes,
}: LossAnalysisTabProps) {
  const { locale, t } = useTranslation();
  const sourceLabel = useSourceLabel();
  const { data, error, isLoading } = useAnalyticsLossAnalysis(enabled, filters);

  if (isLoading && !data) {
    return (
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Skeleton className="h-[380px] w-full" />
        <Skeleton className="h-[380px] w-full" />
      </div>
    );
  }
  if (error) return <p className="text-sm text-brand-red">{t('analytics.failedToLoad')}</p>;
  if (!data) return null;

  const lossLocked = isRangeOverridden('widget', filters.global, filters.sectionLoss);

  return (
    <div className="flex flex-col gap-8">
      <AnalyticsSection
        title={t('analytics.sectionLoss')}
        range={filters.sectionLoss}
        global={filters.global}
        onRangeChange={(sectionLoss) => onPatch({ sectionLoss })}
      >
        <div className={analyticsChartPairGridClass}>
          <AnalyticsPieChart
            title={t('analytics.lostByReason')}
            slices={data.byReason}
            showCalcNotes={showCalcNotes}
            explanation={t('analytics.explainLostByReason')}
            headerExtra={
              <ChartWidgetRangeFilter
                global={filters.global}
                section={filters.sectionLoss}
                value={filters.widgetLostByReason}
                onChange={(widgetLostByReason) => onPatch({ widgetLostByReason })}
                disabled={lossLocked}
              />
            }
            resolveLabel={(id) => formatEnumLabel(locale, 'loss', id)}
          />
          <AnalyticsPieChart
            title={t('analytics.stagesBeforeLoss')}
            slices={data.stagesBeforeLoss}
            showCalcNotes={showCalcNotes}
            explanation={t('analytics.explainStagesBeforeLoss')}
            headerExtra={
              <ChartWidgetRangeFilter
                global={filters.global}
                section={filters.sectionLoss}
                value={filters.widgetStagesBeforeLoss}
                onChange={(widgetStagesBeforeLoss) => onPatch({ widgetStagesBeforeLoss })}
                disabled={lossLocked}
              />
            }
            resolveLabel={(id) => formatEnumLabel(locale, 'funnel', id)}
          />
          <LossOverTimeChart
            mode={filters.lossOverTimeMode}
            onModeChange={(lossOverTimeMode) => onPatch({ lossOverTimeMode })}
            rateSeries={data.lossOverTimeRate}
            countSeries={data.lossOverTimeCount}
            showCalcNotes={showCalcNotes}
            cohortLeadCount={data.cohortLeadCount}
            headerExtra={
              <ChartWidgetRangeFilter
                global={filters.global}
                section={filters.sectionLoss}
                value={filters.widgetLossOverTime}
                onChange={(widgetLossOverTime) => onPatch({ widgetLossOverTime })}
                disabled={lossLocked}
              />
            }
          />
          <RankedSourceBarChart
            title={t('analytics.lostLeadsBySource')}
            bars={data.bySource}
            resolveLabel={sourceLabel}
            showCalcNotes={showCalcNotes}
            explanation={t('analytics.explainLostLeadsBySource')}
            headerExtra={
              <ChartWidgetRangeFilter
                global={filters.global}
                section={filters.sectionLoss}
                value={filters.widgetLostBySource}
                onChange={(widgetLostBySource) => onPatch({ widgetLostBySource })}
                disabled={lossLocked}
              />
            }
          />
        </div>
      </AnalyticsSection>
    </div>
  );
}
