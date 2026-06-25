/**
 * Speed section — lateness, touch/lead, cycle length, time-in-stage bar.
 */
import { useTranslation } from '@/hooks/useTranslation';
import { MetricCard } from './MetricCard';
import { SectionBlock } from './SectionBlock';
import { RepLineChart } from './RepLineChart';
import { TimeInStageBar } from './TimeInStageBar';
import type { SalespersonSpeedSection } from '@/lib/analytics/salesperson';

interface SpeedSectionProps {
  data: SalespersonSpeedSection;
  showCalcNotes: boolean;
}

export function SpeedSection({ data, showCalcNotes }: SpeedSectionProps) {
  const { t } = useTranslation();

  return (
    <SectionBlock
      title={t('analytics.spSectionSpeed')}
      cards={
        <>
          <MetricCard
            label={t('analytics.spLateness')}
            value={data.latenessRate !== null ? `${data.latenessRate}%` : '—'}
            variant={data.latenessRate !== null && data.latenessRate > 20 ? 'amber' : 'neutral'}
            note={t('analytics.explainSpLateness')}
            showCalcNotes={showCalcNotes}
          />
          <MetricCard
            label={t('analytics.spTouchPerLead')}
            value={data.touchPerLead !== null ? String(data.touchPerLead) : '—'}
            variant="blue"
            note={t('analytics.explainSpTouchPerLead')}
            showCalcNotes={showCalcNotes}
          />
          <MetricCard
            label={t('analytics.spAvgCycle')}
            value={
              data.avgCycleDays !== null ? `${data.avgCycleDays} ${t('analytics.spRepDays')}` : '—'
            }
            variant="blue"
            note={t('analytics.explainSpAvgCycle')}
            showCalcNotes={showCalcNotes}
          />
          <MetricCard
            label={t('analytics.spOpenPipelineAge')}
            value={
              data.openPipelineMedianAgeDays !== null
                ? `${data.openPipelineMedianAgeDays} ${t('analytics.spRepDays')}`
                : '—'
            }
            isSnapshot
            snapshotLabel={t('analytics.spNowBadge')}
            note={t('analytics.explainSpOpenPipelineAge')}
            showCalcNotes={showCalcNotes}
          />
        </>
      }
    >
      <TimeInStageBar
        title={t('analytics.spTimeInStage')}
        bars={data.timeInStage}
        explanation={t('analytics.explainSpAvgCycle')}
        showCalcNotes={showCalcNotes}
      />
      <RepLineChart
        title={t('analytics.spTouchOverTime')}
        series={data.touchPerLeadOverTime}
        explanation={t('analytics.explainSpTouchPerLead')}
        showCalcNotes={showCalcNotes}
      />
      <RepLineChart
        title={t('analytics.spCycleOverTime')}
        series={data.cycleLengthOverTime}
        explanation={t('analytics.explainSpAvgCycle')}
        showCalcNotes={showCalcNotes}
      />
    </SectionBlock>
  );
}
