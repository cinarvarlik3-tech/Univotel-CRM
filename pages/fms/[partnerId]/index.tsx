/**
 * FMS partner detail page — revenue summary and property list.
 */
import { useRouter } from 'next/router';
import { FmsShell } from '@/components/finance/FmsShell';
import { PartnerSummaryCard } from '@/components/finance/PartnerSummaryCard';
import { PropertyRevenueList } from '@/components/finance/PropertyRevenueList';
import { Skeleton } from '@/components/ui/skeleton';
import { useFmsPartner } from '@/hooks/useFms';
import { useTranslation } from '@/hooks/useTranslation';

export default function FmsPartnerPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const partnerId = typeof router.query.partnerId === 'string' ? router.query.partnerId : null;
  const { data, error, isLoading } = useFmsPartner(partnerId);

  return (
    <FmsShell title={data?.partnerName ?? t('fms.partnerTitle')}>
      {isLoading && <Skeleton className="h-48 w-full" />}
      {error && <p className="text-sm text-brand-red">{t('fms.failedToLoad')}</p>}

      {data && partnerId && (
        <div className="space-y-6">
          <PartnerSummaryCard partner={data} />
          <div>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-text-secondary">
              {t('fms.properties')}
            </h2>
            <PropertyRevenueList properties={data.properties} partnerId={partnerId} />
          </div>
        </div>
      )}
    </FmsShell>
  );
}
