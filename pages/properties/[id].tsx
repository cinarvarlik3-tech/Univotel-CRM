import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import {
  IconArrowLeft,
  IconBed,
  IconMapPin,
  IconSchool,
  IconUsers,
  IconBuildingEstate,
} from '@tabler/icons-react';
import { AppShell } from '@/components/layout/AppShell';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useTranslation } from '@/hooks/useTranslation';
import { formatYesNo } from '@/lib/i18n';
import type { PropertyRow } from '@/types/domain';

function statusVariant(status: string): 'success' | 'secondary' {
  const s = status.toLowerCase();
  return s === 'active' || s === 'aktif' ? 'success' : 'secondary';
}

function InfoCard({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-[10px] border border-border-default bg-surface-card p-5">
      <div className="mb-3 flex items-center gap-2">
        <span className="text-text-tertiary">{icon}</span>
        <h3 className="text-[11px] font-medium uppercase tracking-wide text-text-tertiary">
          {title}
        </h3>
      </div>
      {children}
    </div>
  );
}

function StatRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-2 text-sm [&+&]:border-t [&+&]:border-border-default">
      <span className="text-text-secondary">{label}</span>
      <span className="font-medium text-text-primary">{value}</span>
    </div>
  );
}

export default function PropertyDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const { locale, t } = useTranslation();
  const [property, setProperty] = useState<PropertyRow | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (typeof id !== 'string') return;

    fetch(`/api/properties/${id}`)
      .then((res) => res.json())
      .then((json) => {
        if (json.data) {
          setProperty(json.data);
        } else {
          setError(json.error ?? t('properties.notFound'));
        }
      });
  }, [id, t]);

  if (!property && !error) {
    return (
      <AppShell title={t('properties.property')}>
        <div className="space-y-4">
          <Skeleton className="h-8 w-48 rounded-lg" />
          <div className="grid grid-cols-3 gap-4">
            <Skeleton className="h-[100px] rounded-[10px]" />
            <Skeleton className="h-[100px] rounded-[10px]" />
            <Skeleton className="h-[100px] rounded-[10px]" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Skeleton className="h-[160px] rounded-[10px]" />
            <Skeleton className="h-[160px] rounded-[10px]" />
          </div>
          <Skeleton className="h-[120px] rounded-[10px]" />
        </div>
      </AppShell>
    );
  }

  if (error || !property) {
    return (
      <AppShell title={t('properties.property')}>
        <p className="text-sm text-brand-red">{error || t('properties.notFound')}</p>
      </AppShell>
    );
  }

  const emDash = t('common.emDash');
  const schools = property.serviced_schools ?? [];

  return (
    <AppShell title={property.hotel_name}>
      <div className="space-y-5">
        {/* Back link + header */}
        <div>
          <Link
            href="/properties"
            className="mb-3 inline-flex items-center gap-1.5 text-[13px] text-text-secondary hover:text-brand-blue"
          >
            <IconArrowLeft size={14} />
            {t('properties.backToProperties')}
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="font-heading text-2xl font-bold text-text-primary">
              {property.hotel_name}
            </h1>
            <Badge variant={statusVariant(property.status)}>{property.status}</Badge>
          </div>
          {property.district && (
            <p className="mt-1 flex items-center gap-1.5 text-sm text-text-secondary">
              <IconMapPin size={14} />
              {property.district}
            </p>
          )}
        </div>

        {/* KPI row */}
        <div className="grid grid-cols-3 gap-4">
          <div className="rounded-[10px] border border-border-default bg-surface-card px-4 py-3">
            <p className="text-[11px] font-medium uppercase tracking-wide text-text-secondary">
              {t('properties.beds')}
            </p>
            <p className="font-heading text-2xl font-bold text-text-primary">
              {property.total_beds ?? emDash}
            </p>
          </div>
          <div className="rounded-[10px] border border-border-default bg-surface-card px-4 py-3">
            <p className="text-[11px] font-medium uppercase tracking-wide text-text-secondary">
              {t('properties.schools')}
            </p>
            <p className="font-heading text-2xl font-bold text-text-primary">
              {schools.length > 0 ? schools.length : emDash}
            </p>
          </div>
          <div className="rounded-[10px] border border-border-default bg-surface-card px-4 py-3">
            <p className="text-[11px] font-medium uppercase tracking-wide text-text-secondary">
              {t('properties.gender')}
            </p>
            <p className="font-heading text-2xl font-bold text-text-primary">
              {property.serviced_gender ?? emDash}
            </p>
          </div>
        </div>

        {/* Detail cards */}
        <div className="grid grid-cols-2 gap-4">
          <InfoCard icon={<IconMapPin size={15} />} title={t('properties.locationCard')}>
            <div className="divide-y divide-border-default">
              <StatRow label={t('properties.district')} value={property.district ?? emDash} />
              <div className="py-2 text-sm">
                <span className="text-text-secondary">{t('properties.address')}</span>
                <p className="mt-1 font-medium text-text-primary leading-snug">
                  {property.address ?? emDash}
                </p>
              </div>
            </div>
          </InfoCard>

          <InfoCard icon={<IconUsers size={15} />} title={t('properties.admissionsCard')}>
            <div className="divide-y divide-border-default">
              <StatRow label={t('properties.gender')} value={property.serviced_gender ?? emDash} />
              <StatRow
                label={t('properties.nonStudents')}
                value={formatYesNo(property.accepts_non_students, locale)}
              />
              <StatRow
                label={t('properties.status')}
                value={<Badge variant={statusVariant(property.status)}>{property.status}</Badge>}
              />
            </div>
          </InfoCard>
        </div>

        {/* Schools card */}
        <InfoCard icon={<IconSchool size={15} />} title={t('properties.schools')}>
          {schools.length === 0 ? (
            <p className="text-sm text-text-tertiary">{emDash}</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {schools.map((s) => (
                <span
                  key={s}
                  className="inline-flex items-center gap-1.5 rounded-full bg-[var(--badge-school-bg,#f3f0ff)] px-3 py-1 text-[12px] font-medium text-[var(--badge-school-text,#6d28d9)]"
                >
                  <IconBuildingEstate size={12} />
                  {s}
                </span>
              ))}
            </div>
          )}
        </InfoCard>
      </div>
    </AppShell>
  );
}
