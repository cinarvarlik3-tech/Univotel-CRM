/**
 * Property detail page — read-only hotel inventory view.
 */
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
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
      <AppShell>
        <p>Loading...</p>
      </AppShell>
    );
  }

  if (error || !property) {
    return (
      <AppShell>
        <p className="error">{error || 'Property not found'}</p>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <h1>{property.hotel_name}</h1>
      <dl className="kv">
        <dt>District</dt>
        <dd>{property.district ?? '—'}</dd>
        <dt>Address</dt>
        <dd>{property.address ?? '—'}</dd>
        <dt>Gender</dt>
        <dd>{property.serviced_gender ?? '—'}</dd>
        <dt>Status</dt>
        <dd>{property.status}</dd>
        <dt>Beds</dt>
        <dd>{property.total_beds ?? '—'}</dd>
        <dt>Schools</dt>
        <dd>{property.serviced_schools?.join(', ') || '—'}</dd>
        <dt>Non-students</dt>
        <dd>{property.accepts_non_students ? 'Yes' : 'No'}</dd>
      </dl>
      <p>
        <Link href="/properties">Back to properties</Link>
      </p>
    </AppShell>
  );
}
