/**
 * FMS property detail page — per-customer contracted revenue.
 */
import { useRouter } from 'next/router';
import { FmsShell } from '@/components/finance/FmsShell';
import { PropertyCustomerTable } from '@/components/finance/PropertyCustomerTable';
import { Skeleton } from '@/components/ui/skeleton';
import { useFmsPropertyCustomers } from '@/hooks/useFms';
import { useTranslation } from '@/hooks/useTranslation';
import { formatTry } from '@/lib/finance/format';

export default function FmsPropertyPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const propertyId = typeof router.query.propertyId === 'string' ? router.query.propertyId : null;
  const { data, error, isLoading } = useFmsPropertyCustomers(propertyId);

  return (
    <FmsShell title={t('fms.propertyTitle')}>
      {isLoading && <Skeleton className="h-48 w-full" />}
      {error && <p className="text-sm text-brand-red">{t('fms.failedToLoad')}</p>}

      {data && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-sm text-text-secondary">{t('fms.propertyRevenue')}</p>
              <p className="text-2xl font-bold">{formatTry(data.propertyRevenue)}</p>
            </div>
            <p className="text-sm text-text-secondary">
              {t('fms.customerCount', { count: data.customerCount })}
            </p>
          </div>
          <PropertyCustomerTable customers={data.customers} />
        </div>
      )}
    </FmsShell>
  );
}
