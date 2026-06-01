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
import { useTranslation } from '@/hooks/useTranslation';
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
  const { t } = useTranslation();
  const emDash = t('common.emDash');

  if (properties.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-text-secondary">{t('properties.noProperties')}</p>
    );
  }

  return (
    <div className="overflow-hidden rounded-[10px] border border-border-default bg-surface-card">
      <Table>
        <TableHeader>
          <TableRow className="h-[34px] hover:bg-transparent">
            <TableHead>{t('properties.tableHotel')}</TableHead>
            <TableHead>{t('properties.tableDistrict')}</TableHead>
            <TableHead>{t('properties.tableGender')}</TableHead>
            <TableHead>{t('properties.tableStatus')}</TableHead>
            <TableHead>{t('properties.tableBeds')}</TableHead>
            <TableHead>{t('properties.tableSchools')}</TableHead>
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
              <TableCell className="text-text-secondary">{p.district ?? emDash}</TableCell>
              <TableCell className="text-text-secondary">{p.serviced_gender ?? emDash}</TableCell>
              <TableCell className="text-text-secondary">{p.status}</TableCell>
              <TableCell className="text-text-secondary">{p.total_beds ?? emDash}</TableCell>
              <TableCell className="text-text-secondary">
                {p.serviced_schools?.join(', ') || emDash}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
