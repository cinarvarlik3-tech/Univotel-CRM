/**
 * FMS unattributed revenue bucket page.
 */
import { FmsShell } from '@/components/finance/FmsShell';
import { PartnerSummaryCard } from '@/components/finance/PartnerSummaryCard';
import { PropertyRevenueList } from '@/components/finance/PropertyRevenueList';
import { Skeleton } from '@/components/ui/skeleton';
import { useFmsUnattributed } from '@/hooks/useFms';
import { useTranslation } from '@/hooks/useTranslation';

export default function FmsUnattributedPage() {
  const { t } = useTranslation();
  const { data, error, isLoading } = useFmsUnattributed();

  return (
    <FmsShell title={t('fms.unattributedTitle')}>
      <p className="mb-4 text-sm text-text-secondary">{t('fms.unattributedHint')}</p>

      {isLoading && <Skeleton className="h-48 w-full" />}
      {error && <p className="text-sm text-brand-red">{t('fms.failedToLoad')}</p>}

      {data && (
        <div className="space-y-6">
          <PartnerSummaryCard partner={data} />
          <PropertyRevenueList properties={data.properties} partnerId={null} />
        </div>
      )}

      {!isLoading && !error && !data && (
        <p className="text-sm text-text-secondary">{t('fms.noProperties')}</p>
      )}
    </FmsShell>
  );
}
