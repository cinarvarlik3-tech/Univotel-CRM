/**
 * Shared section shell + source label helper for analytics tabs.
 */
import { OverviewRangeFilter } from '@/components/analytics/overview/OverviewRangeFilter';
import { useTranslation } from '@/hooks/useTranslation';
import {
  isGlobalRangeOverriding,
  type OverviewRangeSelection,
} from '@/lib/analytics/overview-range';

export function useSourceLabel() {
  const { t } = useTranslation();
  return (id: string) => {
    const known: Record<string, string> = {
      meta_ads: t('analytics.sourceMetaAds'),
      google_ads: t('analytics.sourceGoogleAds'),
      netgsm_call: t('analytics.sourceNetgsmCall'),
      whatsapp_dm: t('analytics.sourceWhatsappDm'),
      instagram_dm: t('analytics.sourceInstagramDm'),
      other: t('analytics.sourceOther'),
    };
    return known[id] ?? id;
  };
}

export function AnalyticsSection({
  title,
  range,
  onRangeChange,
  global,
  children,
}: {
  title: string;
  range: OverviewRangeSelection;
  onRangeChange: (next: OverviewRangeSelection) => void;
  global: OverviewRangeSelection;
  children: React.ReactNode;
}) {
  const disabled = isGlobalRangeOverriding(global);

  return (
    <section className="flex w-full flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-text-secondary">
          {title}
        </h2>
        <OverviewRangeFilter
          tier="section"
          global={global}
          value={range}
          onChange={onRangeChange}
          disabled={disabled}
        />
      </div>
      {children}
    </section>
  );
}
