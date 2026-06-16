/**
 * PMS property chooser — entry point for room occupancy management.
 */
import { AppShell } from '@/components/layout/AppShell';
import { PropertyChooser } from '@/components/pms/PropertyChooser';
import { Skeleton } from '@/components/ui/skeleton';
import { usePmsProperties } from '@/hooks/usePms';
import { useTranslation } from '@/hooks/useTranslation';

export default function PmsIndexPage() {
  const { t } = useTranslation();
  const { data, error, isLoading } = usePmsProperties();

  return (
    <AppShell title={t('pms.title')}>
      <p className="mb-4 text-sm text-muted-foreground">{t('pms.chooserSubtitle')}</p>
      {isLoading && <Skeleton className="h-64 w-full" />}
      {error && <p className="text-sm text-brand-red">{t('pms.failedToLoad')}</p>}
      {data && <PropertyChooser properties={data} />}
    </AppShell>
  );
}
