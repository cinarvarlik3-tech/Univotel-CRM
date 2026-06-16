/**
 * PMS property chooser grid.
 */
import Link from 'next/link';
import { IconBuilding } from '@tabler/icons-react';
import { useTranslation } from '@/hooks/useTranslation';

interface PmsProperty {
  id: string;
  hotel_name: string;
  district: string | null;
  status: string;
}

interface PropertyChooserProps {
  properties: PmsProperty[];
}

export function PropertyChooser({ properties }: PropertyChooserProps) {
  const { t } = useTranslation();

  if (properties.length === 0) {
    return <p className="text-sm text-muted-foreground">{t('pms.noProperties')}</p>;
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {properties.map((p) => (
        <Link
          key={p.id}
          href={`/pms/${p.id}`}
          className="flex items-start gap-3 rounded-xl border border-border bg-surface-card p-4 transition-colors hover:border-brand-blue/40 hover:bg-surface-elevated"
        >
          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-brand-blue/10 text-brand-blue">
            <IconBuilding size={20} />
          </div>
          <div className="min-w-0">
            <p className="truncate font-medium text-foreground">{p.hotel_name}</p>
            {p.district && <p className="truncate text-sm text-muted-foreground">{p.district}</p>}
          </div>
        </Link>
      ))}
    </div>
  );
}
