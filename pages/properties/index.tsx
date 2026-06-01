/**
 * Properties inventory page — read-only list.
 */
import { AppShell } from '@/components/layout/AppShell';
import { PropertyTable } from '@/components/properties/PropertyTable';
import { Skeleton } from '@/components/ui/skeleton';
import { useTranslation } from '@/hooks/useTranslation';
import { useProperties } from '@/hooks/useProperties';

/**
 * Renders read-only properties table.
 * @returns Properties page wrapped in AppShell.
 */
export default function PropertiesPage() {
  const { t } = useTranslation();
  const { data, error, isLoading } = useProperties();

  return (
    <AppShell title={t('properties.title')}>
      {isLoading && <Skeleton className="h-64 w-full" />}
      {error && <p className="text-sm text-brand-red">{t('properties.failedToLoad')}</p>}
      {data && <PropertyTable properties={data} />}
    </AppShell>
  );
}
