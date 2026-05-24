/**
 * Properties inventory page — read-only list.
 */
import { AppShell } from '@/components/layout/AppShell';
import { PropertyTable } from '@/components/properties/PropertyTable';
import { Skeleton } from '@/components/ui/skeleton';
import { useProperties } from '@/hooks/useProperties';

/**
 * Renders read-only properties table.
 * @returns Properties page wrapped in AppShell.
 */
export default function PropertiesPage() {
  const { data, error, isLoading } = useProperties();

  return (
    <AppShell title="Properties">
      {isLoading && <Skeleton className="h-64 w-full" />}
      {error && <p className="text-sm text-brand-red">Failed to load properties</p>}
      {data && <PropertyTable properties={data} />}
    </AppShell>
  );
}
