/**
 * Deals section — sale count, discount metrics, biggest deal/discount outlier callouts.
 */
import { useTranslation } from '@/hooks/useTranslation';
import { formatNumber } from '@/lib/i18n';
import { formatTry } from '@/lib/finance/format';
import { MetricCard } from './MetricCard';
import { SectionBlock } from './SectionBlock';
import { RepLineChart } from './RepLineChart';
import type { SalespersonDealsSection } from '@/lib/analytics/salesperson';

interface DealsSectionProps {
  data: SalespersonDealsSection;
  showCalcNotes: boolean;
}

export function DealsSection({ data, showCalcNotes }: DealsSectionProps) {
  const { locale, t } = useTranslation();

  return (
    <SectionBlock
      title={t('analytics.spSectionDeals')}
      cards={
        <>
          <MetricCard
            label={t('analytics.spSaleCount')}
            value={formatNumber(data.saleCount, locale)}
            variant="blue"
            note={t('analytics.explainSpSaleCount')}
            showCalcNotes={showCalcNotes}
          />
          <MetricCard
            label={t('analytics.spAvgDiscount')}
            value={data.avgDiscountPct !== null ? `${data.avgDiscountPct}%` : '—'}
            variant="amber"
            note={t('analytics.explainSpAvgDiscount')}
            showCalcNotes={showCalcNotes}
          />
          <MetricCard
            label={t('analytics.spBiggestDiscount')}
            value={data.biggestDiscountPct !== null ? `${data.biggestDiscountPct}%` : '—'}
            variant="amber"
            sub={data.biggestDiscountTry !== null ? formatTry(data.biggestDiscountTry) : undefined}
            note={t('analytics.explainSpBiggestDiscount')}
            showCalcNotes={showCalcNotes}
          />
          <MetricCard
            label={t('analytics.spBiggestDeal')}
            value={data.biggestDealRevenue !== null ? formatTry(data.biggestDealRevenue) : '—'}
            variant="blue"
            note={t('analytics.explainSpBiggestDeal')}
            showCalcNotes={showCalcNotes}
          />
          <MetricCard
            label={t('analytics.spPctDealsWithDiscount')}
            value={data.pctDealsWithDiscount !== null ? `${data.pctDealsWithDiscount}%` : '—'}
            variant="amber"
            note={t('analytics.explainSpPctDealsWithDiscount')}
            showCalcNotes={showCalcNotes}
          />
        </>
      }
    >
      <RepLineChart
        title={t('analytics.spSalesOverTime')}
        series={data.salesOverTime}
        explanation={t('analytics.explainSpSaleCount')}
        showCalcNotes={showCalcNotes}
      />
      <RepLineChart
        title={t('analytics.spDiscountOverTime')}
        series={data.discountOverTime}
        yAxisPercent
        explanation={t('analytics.explainSpAvgDiscount')}
        showCalcNotes={showCalcNotes}
      />
    </SectionBlock>
  );
}
