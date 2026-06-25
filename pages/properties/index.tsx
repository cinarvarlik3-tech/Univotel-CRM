import { useMemo } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { PropertyTable } from '@/components/properties/PropertyTable';
import { KpiCard } from '@/components/ui/kpi-card';
import { Skeleton } from '@/components/ui/skeleton';
import { useTranslation } from '@/hooks/useTranslation';
import { useProperties } from '@/hooks/useProperties';

export default function PropertiesPage() {
  const { t } = useTranslation();
  const { data, error, isLoading } = useProperties();

  const stats = useMemo(() => {
    if (!data) return null;
    const active = data.filter((p) => {
      const s = p.status.toLowerCase();
      return s === 'active' || s === 'aktif';
    }).length;
    const beds = data.reduce((sum, p) => sum + (p.total_beds ?? 0), 0);
    return { total: data.length, active, beds };
  }, [data]);

  return (
    <AppShell title={t('properties.title')} count={stats?.total}>
      {isLoading && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <Skeleton className="h-[72px] w-full rounded-[10px]" />
            <Skeleton className="h-[72px] w-full rounded-[10px]" />
            <Skeleton className="h-[72px] w-full rounded-[10px]" />
          </div>
          <Skeleton className="h-64 w-full rounded-[10px]" />
        </div>
      )}
      {error && <p className="text-sm text-brand-red">{t('properties.failedToLoad')}</p>}
      {data && stats && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <KpiCard label={t('properties.statTotal')} value={stats.total} variant="neutral" />
            <KpiCard label={t('properties.statActive')} value={stats.active} variant="blue" />
            <KpiCard label={t('properties.statBeds')} value={stats.beds} variant="neutral" />
          </div>
          <PropertyTable properties={data} />
        </div>
      )}
    </AppShell>
  );
}
