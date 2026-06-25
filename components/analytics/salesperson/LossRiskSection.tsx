/**
 * Loss & Risk section — loss count, restricted leads, comparative loss pies.
 */
import { useTranslation } from '@/hooks/useTranslation';
import { formatNumber } from '@/lib/i18n';
import { MetricCard } from './MetricCard';
import { SectionBlock } from './SectionBlock';
import { RepLineChart } from './RepLineChart';
import { ComparativePie } from './ComparativePie';
import type { SalespersonLossRiskSection } from '@/lib/analytics/salesperson';

interface LossRiskSectionProps {
  data: SalespersonLossRiskSection;
  showCalcNotes: boolean;
}

const LOSS_REASON_LABELS: Record<string, string> = {
  price: 'Fiyat',
  no_response: 'Yanıtsız',
  chose_competitor: 'Rakip seçti',
  not_interested: 'İlgilenmedi',
  budget: 'Bütçe',
  timing: 'Zamanlama',
  unknown: 'Belirsiz',
};

function resolveLossReason(id: string): string {
  return LOSS_REASON_LABELS[id] ?? id;
}

export function LossRiskSection({ data, showCalcNotes }: LossRiskSectionProps) {
  const { locale, t } = useTranslation();

  return (
    <SectionBlock
      title={t('analytics.spSectionLossRisk')}
      cards={
        <>
          <MetricCard
            label={t('analytics.spLossCount')}
            value={formatNumber(data.lossCount, locale)}
            variant="red"
            note={t('analytics.explainSpLossCount')}
            showCalcNotes={showCalcNotes}
          />
          <MetricCard
            label={t('analytics.spRestrictedCount')}
            value={formatNumber(data.restrictedCount, locale)}
            isSnapshot
            snapshotLabel={t('analytics.spNowBadge')}
            variant="amber"
            note={t('analytics.explainSpRestrictedCount')}
            showCalcNotes={showCalcNotes}
          />
        </>
      }
    >
      <ComparativePie
        title={t('analytics.spLossReasonDist')}
        slices={data.lossReasonDist}
        resolveLabel={resolveLossReason}
        showCalcNotes={showCalcNotes}
      />
      <ComparativePie
        title={t('analytics.spLossStageDist')}
        slices={data.lossStageDist}
        resolveLabel={(id) => id}
        showCalcNotes={showCalcNotes}
      />
      <RepLineChart
        title={t('analytics.spRestrictedOverTime')}
        series={data.restrictedOverTime}
        explanation={t('analytics.explainSpRestrictedCount')}
        showCalcNotes={showCalcNotes}
      />
      <RepLineChart
        title={t('analytics.spLossCountOverTime')}
        series={data.lossCountOverTime}
        explanation={t('analytics.explainSpLossCount')}
        showCalcNotes={showCalcNotes}
      />
    </SectionBlock>
  );
}
