/**
 * FMS seasonal room price admin — property chooser.
 */
import Link from 'next/link';
import { FmsShell } from '@/components/finance/FmsShell';
import { Skeleton } from '@/components/ui/skeleton';
import { useProperties } from '@/hooks/useProperties';
import { useTranslation } from '@/hooks/useTranslation';

export default function FmsPricesIndexPage() {
  const { t } = useTranslation();
  const { data, error, isLoading } = useProperties();

  return (
    <FmsShell title={t('fms.pricesTitle')}>
      <p className="mb-4 text-sm text-text-secondary">{t('fms.pricesSubtitle')}</p>
      {isLoading && <Skeleton className="h-48 w-full" />}
      {error && <p className="text-sm text-brand-red">{t('fms.failedToLoad')}</p>}
      {data && (
        <ul className="divide-y divide-border-default rounded-lg border border-border-default">
          {data.map((property) => (
            <li key={property.id}>
              <Link
                href={`/fms/prices/${property.id}`}
                className="block px-4 py-3 text-sm font-medium hover:bg-surface-secondary"
              >
                {property.hotel_name}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </FmsShell>
  );
}
