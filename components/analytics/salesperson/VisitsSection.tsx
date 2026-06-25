/**
 * Visits section — visit count, show rate, conversion to/from visit.
 */
import { useTranslation } from '@/hooks/useTranslation';
import { formatNumber } from '@/lib/i18n';
import { MetricCard } from './MetricCard';
import { SectionBlock } from './SectionBlock';
import { RepLineChart, DualRepLineChart } from './RepLineChart';
import type { SalespersonVisitsSection } from '@/lib/analytics/salesperson';

interface VisitsSectionProps {
  data: SalespersonVisitsSection;
  showCalcNotes: boolean;
}

export function VisitsSection({ data, showCalcNotes }: VisitsSectionProps) {
  const { locale, t } = useTranslation();

  return (
    <SectionBlock
      title={t('analytics.spSectionVisits')}
      // 4 cards span the full width and align with the two chart containers below (2 cards per chart).
      cardsClassName="grid-cols-2 lg:grid-cols-4"
      cards={
        <>
          <MetricCard
            label={t('analytics.spVisitCount')}
            value={formatNumber(data.visitCount, locale)}
            variant="blue"
            note={t('analytics.explainSpVisitCount')}
            showCalcNotes={showCalcNotes}
          />
          <MetricCard
            label={t('analytics.spVisitShowRate')}
            value={data.visitShowRate !== null ? `${data.visitShowRate}%` : '—'}
            variant="blue"
            note={t('analytics.explainSpVisitShowRate')}
            showCalcNotes={showCalcNotes}
          />
          <MetricCard
            label={t('analytics.spConvToVisit')}
            value={data.conversionToVisit !== null ? `${data.conversionToVisit}%` : '—'}
            variant="blue"
            note={t('analytics.explainSpConvToVisit')}
            showCalcNotes={showCalcNotes}
          />
          <MetricCard
            label={t('analytics.spConvFromVisit')}
            value={data.conversionFromVisit !== null ? `${data.conversionFromVisit}%` : '—'}
            variant="green"
            note={t('analytics.explainSpConvFromVisit')}
            showCalcNotes={showCalcNotes}
          />
        </>
      }
    >
      <RepLineChart
        title={t('analytics.spVisitCountOverTime')}
        series={data.visitCountOverTime}
        explanation={t('analytics.explainSpVisitCount')}
        showCalcNotes={showCalcNotes}
      />
      <RepLineChart
        title={t('analytics.spVisitShowRateOverTime')}
        series={data.visitShowRateOverTime}
        yAxisPercent
        explanation={t('analytics.explainSpVisitShowRate')}
        showCalcNotes={showCalcNotes}
      />
      <DualRepLineChart
        title={`${t('analytics.spVisitConvOverTime')} — ${t('analytics.spConvToVisitLabel')}`}
        series={data.visitConversionsToVisitOverTime}
        countLabel={t('analytics.spVisitCount')}
        rateLabel={t('analytics.spConvToVisitLabel')}
        explanation={t('analytics.explainSpConvToVisit')}
        showCalcNotes={showCalcNotes}
      />
      <DualRepLineChart
        title={`${t('analytics.spVisitConvOverTime')} — ${t('analytics.spConvFromVisitLabel')}`}
        series={data.visitConversionsFromVisitOverTime}
        countLabel={t('analytics.spVisitCount')}
        rateLabel={t('analytics.spConvFromVisitLabel')}
        explanation={t('analytics.explainSpConvFromVisit')}
        showCalcNotes={showCalcNotes}
      />
    </SectionBlock>
  );
}
