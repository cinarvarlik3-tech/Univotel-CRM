/**
 * Global section — contracted revenue, lead count, messages, conversion rate, response time.
 */
import { useTranslation } from '@/hooks/useTranslation';
import { formatTry } from '@/lib/finance/format';
import { formatNumber } from '@/lib/i18n';
import { MetricCard } from './MetricCard';
import { SectionBlock } from './SectionBlock';
import { RepLineChart, DualRepLineChart } from './RepLineChart';
import type { SalespersonGlobalSection } from '@/lib/analytics/salesperson';

interface GlobalSectionProps {
  data: SalespersonGlobalSection;
  showCalcNotes: boolean;
}

function deltaPct(rep: number, teamAvg: number): number | null {
  if (teamAvg === 0) return null;
  return Math.round(((rep - teamAvg) / teamAvg) * 100);
}

export function GlobalSection({ data, showCalcNotes }: GlobalSectionProps) {
  const { locale, t } = useTranslation();

  const { teamBenchmarks: b } = data;
  const teamAvgRevenue = b.activeRepCount > 0 ? b.contractedRevenue / b.activeRepCount : 0;
  const teamAvgLeads = b.activeRepCount > 0 ? b.leadCount / b.activeRepCount : 0;

  // Team average series (per-rep average per bucket for benchmark line)
  const teamRevenueAvgSeries =
    b.activeRepCount > 0
      ? {
          days: data.revenueOverTime.days,
          values: data.revenueOverTime.values.map(
            () => teamAvgRevenue / (data.revenueOverTime.days.length || 1),
          ),
        }
      : undefined;

  return (
    <SectionBlock
      title={t('analytics.spSectionGlobal')}
      cards={
        <>
          <MetricCard
            label={t('analytics.spContractedRevenue')}
            value={formatTry(data.contractedRevenue)}
            variant="blue"
            benchmarkLabel={`${t('analytics.spVsTeam')} ${formatTry(Math.round(teamAvgRevenue))}`}
            deltaPct={deltaPct(data.contractedRevenue, teamAvgRevenue)}
            note={t('analytics.explainSpContractedRevenue')}
            showCalcNotes={showCalcNotes}
          />
          <MetricCard
            label={t('analytics.spLeadCount')}
            value={formatNumber(data.leadCount, locale)}
            variant="blue"
            benchmarkLabel={`${t('analytics.spVsTeam')} ${Math.round(teamAvgLeads)}`}
            deltaPct={deltaPct(data.leadCount, teamAvgLeads)}
            note={t('analytics.explainSpLeadCount')}
            showCalcNotes={showCalcNotes}
          />
          <MetricCard
            label={t('analytics.spMessageCount')}
            value={formatNumber(data.messageCount, locale)}
            variant="blue"
            note={t('analytics.explainSpMessageCount')}
            showCalcNotes={showCalcNotes}
          />
          <MetricCard
            label={t('analytics.spConversionRate')}
            value={data.conversionRate !== null ? `${data.conversionRate}%` : '—'}
            variant="red"
            benchmarkLabel={
              b.conversionRate !== null
                ? `${t('analytics.spVsTeam')} ${b.conversionRate}%`
                : undefined
            }
            deltaPct={
              data.conversionRate !== null && b.conversionRate !== null
                ? deltaPct(data.conversionRate, b.conversionRate)
                : null
            }
            note={t('analytics.explainSpConversionRate')}
            showCalcNotes={showCalcNotes}
          />
          <MetricCard
            label={t('analytics.spResponseTime')}
            value={
              data.responseTimeMedianMinutes !== null ? `${data.responseTimeMedianMinutes} dk` : '—'
            }
            variant="red"
            sub={
              data.responseTimeP90Minutes !== null
                ? `${t('analytics.spResponseTimeP90')}: ${data.responseTimeP90Minutes} dk`
                : undefined
            }
            note={t('analytics.explainSpResponseTime')}
            showCalcNotes={showCalcNotes}
          />
        </>
      }
    >
      <RepLineChart
        title={t('analytics.spRevenueOverTime')}
        series={data.revenueOverTime}
        teamSeries={teamRevenueAvgSeries}
        explanation={t('analytics.explainSpContractedRevenue')}
        showCalcNotes={showCalcNotes}
      />
      <RepLineChart
        title={t('analytics.spLeadCountOverTime')}
        series={data.leadCountOverTime}
        explanation={t('analytics.explainSpLeadCount')}
        showCalcNotes={showCalcNotes}
      />
      <RepLineChart
        title={t('analytics.spMessageCountOverTime')}
        series={data.messageCountOverTime}
        explanation={t('analytics.explainSpMessageCount')}
        showCalcNotes={showCalcNotes}
      />
      <DualRepLineChart
        title={t('analytics.spConversionOverTime')}
        series={data.conversionOverTime}
        countLabel={t('analytics.spSaleCount')}
        rateLabel={t('analytics.spConversionRate')}
        explanation={t('analytics.explainSpConversionRate')}
        showCalcNotes={showCalcNotes}
      />
    </SectionBlock>
  );
}
