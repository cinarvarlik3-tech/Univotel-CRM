/**
 * Read-only properties inventory table.
 */
import Link from 'next/link';
import type { PropertyRow } from '@/types/domain';

interface PropertyTableProps {
  properties: PropertyRow[];
}

/**
 * Renders properties list table.
 * @param props - Property rows from API.
 * @returns Properties table element.
 */
export function PropertyTable({ properties }: PropertyTableProps) {
  if (properties.length === 0) {
    return <p>No properties found.</p>;
  }

  return (
    <table>
      <thead>
        <tr>
          <th>Hotel</th>
          <th>District</th>
          <th>Gender</th>
          <th>Status</th>
          <th>Beds</th>
          <th>Schools</th>
        </tr>
      </thead>
      <tbody>
        {properties.map((p) => (
          <tr key={p.id}>
            <td>
              <Link href={`/properties/${p.id}`}>{p.hotel_name}</Link>
            </td>
            <td>{p.district ?? '—'}</td>
            <td>{p.serviced_gender ?? '—'}</td>
            <td>{p.status}</td>
            <td>{p.total_beds ?? '—'}</td>
            <td>{p.serviced_schools?.join(', ') || '—'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
