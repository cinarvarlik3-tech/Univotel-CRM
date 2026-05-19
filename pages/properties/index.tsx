/**
 * Properties inventory page — read-only list.
 */
import { AppShell } from '@/components/layout/AppShell';
import { PropertyTable } from '@/components/properties/PropertyTable';
import { useProperties } from '@/hooks/useProperties';

/**
 * Renders read-only properties table.
 * @returns Properties page wrapped in AppShell.
 */
export default function PropertiesPage() {
  const { data, error, isLoading } = useProperties();

  return (
    <AppShell>
      <h1>Properties</h1>
      {isLoading && <p>Loading...</p>}
      {error && <p className="error">Failed to load properties</p>}
      {data && <PropertyTable properties={data} />}
    </AppShell>
  );
}
