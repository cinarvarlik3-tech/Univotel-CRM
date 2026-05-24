/**
 * Property detail page — read-only hotel inventory view.
 */
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { KvList } from '@/components/ui/kv-list';
import { Skeleton } from '@/components/ui/skeleton';
import type { PropertyRow } from '@/types/domain';

/**
 * Renders a single property detail view.
 * @returns Property detail page wrapped in AppShell.
 */
export default function PropertyDetailPage() {
  const router = useRouter();
  const { id } = router.query;
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
          setError(json.error ?? 'Property not found');
        }
      });
  }, [id]);

  if (!property && !error) {
    return (
      <AppShell title="Property">
        <Skeleton className="h-32 w-full max-w-md" />
      </AppShell>
    );
  }

  if (error || !property) {
    return (
      <AppShell title="Property">
        <p className="text-sm text-brand-red">{error || 'Property not found'}</p>
      </AppShell>
    );
  }

  return (
    <AppShell title={property.hotel_name}>
      <KvList
        items={[
          { term: 'District', value: property.district ?? '—' },
          { term: 'Address', value: property.address ?? '—' },
          { term: 'Gender', value: property.serviced_gender ?? '—' },
          { term: 'Status', value: property.status },
          { term: 'Beds', value: property.total_beds ?? '—' },
          { term: 'Schools', value: property.serviced_schools?.join(', ') || '—' },
          { term: 'Non-students', value: property.accepts_non_students ? 'Yes' : 'No' },
        ]}
      />
      <p className="mt-4">
        <Link href="/properties" className="text-brand-blue hover:underline">
          Back to properties
        </Link>
      </p>
    </AppShell>
  );
}
