import Link from 'next/link';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useTranslation } from '@/hooks/useTranslation';
import type { PropertyRow } from '@/types/domain';

interface PropertyTableProps {
  properties: PropertyRow[];
}

function statusVariant(status: string): 'success' | 'secondary' {
  const s = status.toLowerCase();
  return s === 'active' || s === 'aktif' ? 'success' : 'secondary';
}

function genderVariant(gender: string): 'default' | 'danger' | 'secondary' {
  const g = gender.toLowerCase();
  if (g === 'male' || g === 'erkek') return 'default';
  if (g === 'female' || g === 'kadın' || g === 'bayan') return 'danger';
  return 'secondary';
}

function SchoolPills({ schools, emDash }: { schools: string[]; emDash: string }) {
  if (!schools || schools.length === 0) return <span className="text-text-tertiary">{emDash}</span>;
  const visible = schools.slice(0, 2);
  const overflow = schools.length - visible.length;
  return (
    <div className="flex flex-wrap gap-1">
      {visible.map((s) => (
        <span
          key={s}
          className="inline-flex items-center rounded-full bg-[var(--badge-school-bg,#f3f0ff)] px-2 py-0.5 text-[11px] font-medium text-[var(--badge-school-text,#6d28d9)]"
        >
          {s}
        </span>
      ))}
      {overflow > 0 && (
        <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-text-tertiary">
          +{overflow}
        </span>
      )}
    </div>
  );
}

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
            <TableHead className="text-right">{t('properties.tableBeds')}</TableHead>
            <TableHead>{t('properties.tableSchools')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {properties.map((p) => (
            <TableRow key={p.id}>
              <TableCell>
                <Link
                  href={`/properties/${p.id}`}
                  className="font-semibold text-brand-blue hover:underline"
                >
                  {p.hotel_name}
                </Link>
              </TableCell>
              <TableCell className="text-text-secondary">{p.district ?? emDash}</TableCell>
              <TableCell>
                {p.serviced_gender ? (
                  <Badge variant={genderVariant(p.serviced_gender)}>{p.serviced_gender}</Badge>
                ) : (
                  <span className="text-text-tertiary">{emDash}</span>
                )}
              </TableCell>
              <TableCell>
                <Badge variant={statusVariant(p.status)}>{p.status}</Badge>
              </TableCell>
              <TableCell className="text-right font-medium tabular-nums text-text-primary">
                {p.total_beds ?? emDash}
              </TableCell>
              <TableCell>
                <SchoolPills schools={p.serviced_schools} emDash={emDash} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
