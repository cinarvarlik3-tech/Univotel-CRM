/**
 * Property detail page — read-only hotel inventory view.
 */
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { KvList } from '@/components/ui/kv-list';
import { Skeleton } from '@/components/ui/skeleton';
import { useTranslation } from '@/hooks/useTranslation';
import { formatYesNo } from '@/lib/i18n';
import type { PropertyRow } from '@/types/domain';

/**
 * Renders a single property detail view.
 * @returns Property detail page wrapped in AppShell.
 */
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
        <Skeleton className="h-32 w-full max-w-md" />
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

  return (
    <AppShell title={property.hotel_name}>
      <KvList
        items={[
          { term: t('properties.district'), value: property.district ?? emDash },
          { term: t('properties.address'), value: property.address ?? emDash },
          { term: t('properties.gender'), value: property.serviced_gender ?? emDash },
          { term: t('properties.status'), value: property.status },
          { term: t('properties.beds'), value: property.total_beds ?? emDash },
          { term: t('properties.schools'), value: property.serviced_schools?.join(', ') || emDash },
          {
            term: t('properties.nonStudents'),
            value: formatYesNo(property.accepts_non_students, locale),
          },
        ]}
      />
      <p className="mt-4">
        <Link href="/properties" className="text-brand-blue hover:underline">
          {t('properties.backToProperties')}
        </Link>
      </p>
    </AppShell>
  );
}
