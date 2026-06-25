/**
 * Everyday analytics tab — top cards, funnel, activity, visits.
 */
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { AnalyticsHorizontalBarChart } from '@/components/analytics/overview/AnalyticsHorizontalBarChart';
import { AnalyticsKpiCard } from '@/components/analytics/overview/AnalyticsKpiCard';
import { AnalyticsLineChart } from '@/components/analytics/overview/AnalyticsLineChart';
import { AnalyticsPieChart } from '@/components/analytics/overview/AnalyticsPieChart';
import { analyticsChartPairGridClass } from '@/components/analytics/overview/AnalyticsChartHeader';
import { AnalyticsSection } from '@/components/analytics/overview/analytics-tab-shared';
import {
  analyticsChartHeaderControlsClass,
  analyticsChartRangeFilterProps,
  analyticsChartSelectClass,
} from '@/components/analytics/overview/analytics-chart-controls';
import { ChartWidgetRangeFilter } from '@/components/analytics/overview/ChartWidgetRangeFilter';
import { ConversionStageSelector } from '@/components/analytics/overview/ConversionStageSelector';
import { MedianTimeStageSelector } from '@/components/analytics/overview/MedianTimeStageSelector';
import { OverviewRangeFilter } from '@/components/analytics/overview/OverviewRangeFilter';
import { useAnalyticsEveryday } from '@/hooks/useAnalyticsTabs';
import type { AnalyticsFilterState } from '@/hooks/useAnalyticsTabs';
import { useMedianTimeStageVisibility } from '@/hooks/useMedianTimeStageVisibility';
import { useTranslation } from '@/hooks/useTranslation';
import { formatEnumLabel, formatNumber } from '@/lib/i18n';
import { formatPercent, formatResponseTimeMinutes } from '@/lib/analytics/overview-format';
import { isGlobalRangeOverriding, isRangeOverridden } from '@/lib/analytics/overview-range';

interface EverydayTabProps {
  enabled: boolean;
  filters: AnalyticsFilterState;
  onPatch: (partial: Partial<AnalyticsFilterState>) => void;
  showCalcNotes: boolean;
}

export function EverydayTab({ enabled, filters, onPatch, showCalcNotes }: EverydayTabProps) {
  const { locale, t } = useTranslation();
  const emDash = t('common.emDash');
  const { data, error, isLoading } = useAnalyticsEveryday(enabled, filters);
  const { visibleStages, toggleStage } = useMedianTimeStageVisibility();

  const globalActive = isGlobalRangeOverriding(filters.global);
  const funnelLocked = isRangeOverridden('widget', filters.global, filters.sectionFunnel);
  const activityLocked = isRangeOverridden('widget', filters.global, filters.sectionActivity);
  const visitsLocked = isRangeOverridden('widget', filters.global, filters.sectionVisits);

  if (isLoading && !data) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-[118px] w-full" />
        <Skeleton className="h-[380px] w-full" />
      </div>
    );
  }
  if (error) return <p className="text-sm text-brand-red">{t('analytics.failedToLoad')}</p>;
  if (!data) return null;

  const conversionPct = formatPercent(data.topCards.totalDeals, data.topCards.totalLeads, emDash);
  const showRatePct =
    data.visits.showRate !== null ? `${(data.visits.showRate * 100).toFixed(1)}%` : emDash;

  const kpiClass = 'text-[13px] font-semibold normal-case tracking-normal';
  const valClass = 'text-3xl';

  return (
    <div className="flex flex-col gap-8">
      <AnalyticsSection
        title={t('analytics.sectionTopCards')}
        range={filters.sectionTop}
        global={filters.global}
        onRangeChange={(sectionTop) => onPatch({ sectionTop })}
      >
        <div className="grid w-full grid-cols-2 gap-3 lg:grid-cols-5">
          <AnalyticsKpiCard
            label={t('analytics.kpiTotalLeads')}
            value={formatNumber(data.topCards.totalLeads, locale)}
            variant="blue"
            showCalcNotes={showCalcNotes}
            explanation={t('analytics.explainTotalLeads')}
            labelClassName={kpiClass}
            valueClassName={valClass}
          />
          <AnalyticsKpiCard
            label={t('analytics.kpiConversionRate')}
            value={conversionPct}
            variant="red"
            showCalcNotes={showCalcNotes}
            explanation={t('analytics.explainConversionRate')}
            labelClassName={kpiClass}
            valueClassName={valClass}
            headerExtra={
              <ConversionStageSelector
                value={filters.conversionStage}
                onChange={(conversionStage) => onPatch({ conversionStage })}
                disabled={globalActive}
              />
            }
          />
          <AnalyticsKpiCard
            label={t('analytics.kpiTotalDeals')}
            value={formatNumber(data.topCards.totalDeals, locale)}
            variant="blue"
            showCalcNotes={showCalcNotes}
            explanation={t('analytics.explainTotalDeals')}
            labelClassName={kpiClass}
            valueClassName={valClass}
          />
          <AnalyticsKpiCard
            label={t('analytics.kpiUnclaimedLeads')}
            value={formatNumber(data.topCards.unclaimedLeads, locale)}
            variant="red"
            sub={t('analytics.snapshotBadge')}
            showCalcNotes={showCalcNotes}
            explanation={t('analytics.explainUnclaimedLeads')}
            labelClassName={kpiClass}
            valueClassName={valClass}
          />
          <AnalyticsKpiCard
            label={t('analytics.kpiAvgResponseTime')}
            value={formatResponseTimeMinutes(data.topCards.avgResponseMinutes, emDash)}
            variant="blue"
            showCalcNotes={showCalcNotes}
            explanation={t('analytics.explainAvgResponseTime')}
            labelClassName={kpiClass}
            valueClassName={valClass}
            className="col-span-2 lg:col-span-1"
          />
        </div>
      </AnalyticsSection>

      <AnalyticsSection
        title={t('analytics.sectionFunnel')}
        range={filters.sectionFunnel}
        global={filters.global}
        onRangeChange={(sectionFunnel) => onPatch({ sectionFunnel })}
      >
        <div className={analyticsChartPairGridClass}>
          <AnalyticsPieChart
            title={t('analytics.funnelByStage')}
            slices={data.funnel.byStage}
            showCalcNotes={showCalcNotes}
            explanation={t('analytics.explainFunnelByStage')}
            resolveLabel={(id) => formatEnumLabel(locale, 'funnel', id)}
            headerExtra={
              <ChartWidgetRangeFilter
                global={filters.global}
                section={filters.sectionFunnel}
                value={filters.widgetFunnelByStage}
                onChange={(widgetFunnelByStage) => onPatch({ widgetFunnelByStage })}
                disabled={funnelLocked}
              />
            }
          />
          <AnalyticsHorizontalBarChart
            title={t('analytics.avgTimeInStage')}
            rows={data.funnel.medianTimeInStage}
            visibleStages={visibleStages}
            showCalcNotes={showCalcNotes}
            explanation={t('analytics.explainAvgTimeInStage')}
            headerExtra={
              <div className={analyticsChartHeaderControlsClass}>
                <ChartWidgetRangeFilter
                  global={filters.global}
                  section={filters.sectionFunnel}
                  value={filters.widgetMedianTimeInStage}
                  onChange={(widgetMedianTimeInStage) => onPatch({ widgetMedianTimeInStage })}
                  disabled={funnelLocked}
                />
                <MedianTimeStageSelector
                  visibleStages={visibleStages}
                  onToggleStage={toggleStage}
                  disabled={funnelLocked}
                />
              </div>
            }
          />
        </div>
      </AnalyticsSection>

      <AnalyticsSection
        title={t('analytics.sectionActivity')}
        range={filters.sectionActivity}
        global={filters.global}
        onRangeChange={(sectionActivity) => onPatch({ sectionActivity })}
      >
        <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-3">
          <AnalyticsKpiCard
            label={t('analytics.kpiAvgDailyIncoming')}
            value={formatNumber(data.activity.avgDailyIncoming, locale)}
            variant="blue"
            showCalcNotes={showCalcNotes}
            explanation={t('analytics.explainAvgDailyIncoming')}
            labelClassName={kpiClass}
            valueClassName={valClass}
          />
          <AnalyticsKpiCard
            label={t('analytics.kpiAvgDailyOutgoing')}
            value={formatNumber(data.activity.avgDailyOutgoing, locale)}
            variant="red"
            showCalcNotes={showCalcNotes}
            explanation={t('analytics.explainAvgDailyOutgoing')}
            labelClassName={kpiClass}
            valueClassName={valClass}
          />
          <AnalyticsKpiCard
            label={t('analytics.kpiAvgCallsPerDay')}
            value={formatNumber(data.activity.avgDailyCalls, locale)}
            variant="blue"
            showCalcNotes={showCalcNotes}
            explanation={t('analytics.explainAvgCallsPerDay')}
            labelClassName={kpiClass}
            valueClassName={valClass}
          />
        </div>
        <div className={analyticsChartPairGridClass}>
          <AnalyticsLineChart
            title={t('analytics.messagesOverTime')}
            series={data.activity.messagesOverTime}
            showCalcNotes={showCalcNotes}
            explanation={t('analytics.explainMessagesOverTime')}
            headerExtra={
              <div className={analyticsChartHeaderControlsClass}>
                <Select
                  value={filters.messagesDirection}
                  onValueChange={(v) =>
                    onPatch({ messagesDirection: v as AnalyticsFilterState['messagesDirection'] })
                  }
                >
                  <SelectTrigger className={analyticsChartSelectClass('w-[65px]')}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="both">{t('analytics.messagesBoth')}</SelectItem>
                    <SelectItem value="incoming">{t('analytics.messagesIncoming')}</SelectItem>
                    <SelectItem value="outgoing">{t('analytics.messagesOutgoing')}</SelectItem>
                  </SelectContent>
                </Select>
                <OverviewRangeFilter
                  tier="widget"
                  showOff={false}
                  global={filters.global}
                  section={filters.sectionActivity}
                  value={filters.widgetMessages}
                  onChange={(widgetMessages) => onPatch({ widgetMessages })}
                  disabled={activityLocked}
                  {...analyticsChartRangeFilterProps}
                />
              </div>
            }
          />
          <AnalyticsLineChart
            title={t('analytics.callsOverTime')}
            series={data.activity.callsOverTime}
            showCalcNotes={showCalcNotes}
            explanation={t('analytics.explainCallsOverTime')}
            headerExtra={
              <OverviewRangeFilter
                tier="widget"
                showOff={false}
                global={filters.global}
                section={filters.sectionActivity}
                value={filters.widgetCalls}
                onChange={(widgetCalls) => onPatch({ widgetCalls })}
                disabled={activityLocked}
                {...analyticsChartRangeFilterProps}
              />
            }
          />
        </div>
      </AnalyticsSection>

      <AnalyticsSection
        title={t('analytics.sectionVisits')}
        range={filters.sectionVisits}
        global={filters.global}
        onRangeChange={(sectionVisits) => onPatch({ sectionVisits })}
      >
        <div className="grid w-full grid-cols-2 gap-3 lg:grid-cols-4">
          <AnalyticsKpiCard
            label={t('analytics.kpiTotalVisits')}
            value={formatNumber(data.visits.totalVisits, locale)}
            variant="blue"
            showCalcNotes={showCalcNotes}
            explanation={t('analytics.explainTotalVisits')}
            labelClassName={kpiClass}
            valueClassName={valClass}
          />
          <AnalyticsKpiCard
            label={t('analytics.kpiVisitShowRate')}
            value={showRatePct}
            variant="blue"
            showCalcNotes={showCalcNotes}
            explanation={t('analytics.explainVisitShowRate')}
            labelClassName={kpiClass}
            valueClassName={valClass}
          />
          <AnalyticsKpiCard
            label={t('analytics.kpiSuccessfulVisits')}
            value={formatNumber(data.visits.successfulVisits, locale)}
            variant="blue"
            showCalcNotes={showCalcNotes}
            explanation={t('analytics.explainSuccessfulVisits')}
            labelClassName={`${kpiClass} text-[var(--badge-success-text)]/80`}
            valueClassName={`${valClass} text-[var(--badge-success-text)]`}
            className="[&>div:first-child]:border-[var(--badge-success-text)] [&>div:first-child]:bg-[var(--badge-success-bg)]"
          />
          <AnalyticsKpiCard
            label={t('analytics.kpiFailedVisits')}
            value={formatNumber(data.visits.failedVisits, locale)}
            variant="red"
            showCalcNotes={showCalcNotes}
            explanation={t('analytics.explainFailedVisits')}
            labelClassName={kpiClass}
            valueClassName={valClass}
          />
        </div>
        <div className={analyticsChartPairGridClass}>
          <AnalyticsLineChart
            title={t('analytics.visitsOverTime')}
            series={data.visits.visitsOverTime}
            showCalcNotes={showCalcNotes}
            explanation={t('analytics.explainVisitsOverTime')}
            headerExtra={
              <div className={analyticsChartHeaderControlsClass}>
                <Select
                  value={filters.visitsPropertyId}
                  onValueChange={(v) => onPatch({ visitsPropertyId: v })}
                >
                  <SelectTrigger className={analyticsChartSelectClass('w-[90px]')}>
                    <SelectValue placeholder={t('analytics.allProperties')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('analytics.allProperties')}</SelectItem>
                    {data.visits.properties.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <OverviewRangeFilter
                  tier="widget"
                  showOff={false}
                  global={filters.global}
                  section={filters.sectionVisits}
                  value={filters.widgetVisitsTrend}
                  onChange={(widgetVisitsTrend) => onPatch({ widgetVisitsTrend })}
                  disabled={visitsLocked}
                  {...analyticsChartRangeFilterProps}
                />
              </div>
            }
          />
          <AnalyticsPieChart
            title={t('analytics.visitsByProperty')}
            slices={data.visits.byProperty}
            showCalcNotes={showCalcNotes}
            explanation={t('analytics.explainVisitsByProperty')}
            headerExtra={
              <ChartWidgetRangeFilter
                global={filters.global}
                section={filters.sectionVisits}
                value={filters.widgetVisitsByProperty}
                onChange={(widgetVisitsByProperty) => onPatch({ widgetVisitsByProperty })}
                disabled={visitsLocked}
              />
            }
            resolveLabel={(id) => {
              const prop = data.visits.properties.find((p) => p.id === id);
              return prop?.name ?? id;
            }}
          />
        </div>
      </AnalyticsSection>
    </div>
  );
}
