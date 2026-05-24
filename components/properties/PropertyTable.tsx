/**
 * Read-only properties inventory table.
 */
import Link from 'next/link';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
    return <p className="py-8 text-center text-sm text-text-secondary">No properties found.</p>;
  }

  return (
    <div className="overflow-hidden rounded-[10px] border border-border-default bg-surface-card">
      <Table>
        <TableHeader>
          <TableRow className="h-[34px] hover:bg-transparent">
            <TableHead>Hotel</TableHead>
            <TableHead>District</TableHead>
            <TableHead>Gender</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Beds</TableHead>
            <TableHead>Schools</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {properties.map((p) => (
            <TableRow key={p.id}>
              <TableCell>
                <Link
                  href={`/properties/${p.id}`}
                  className="font-medium text-brand-blue hover:underline"
                >
                  {p.hotel_name}
                </Link>
              </TableCell>
              <TableCell className="text-text-secondary">{p.district ?? '—'}</TableCell>
              <TableCell className="text-text-secondary">{p.serviced_gender ?? '—'}</TableCell>
              <TableCell className="text-text-secondary">{p.status}</TableCell>
              <TableCell className="text-text-secondary">{p.total_beds ?? '—'}</TableCell>
              <TableCell className="text-text-secondary">
                {p.serviced_schools?.join(', ') || '—'}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
