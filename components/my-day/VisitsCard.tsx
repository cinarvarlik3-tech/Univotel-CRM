/**
 * Bugünkü Ziyaretler — today's property visits with property switcher.
 * Scoped to home_property_id by default; null home → show all + "Ana tesisini ayarla" hint.
 * Managers default to all properties.
 */
import { useState } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { TaskContainerCard } from './TaskContainerCard';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { VisitRow, PropertyOption } from '@/lib/my-day/cockpit';

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  scheduled: { label: 'Planlandı', className: 'text-text-secondary' },
  attended: { label: 'Geldi', className: 'text-emerald-600' },
  failed: { label: 'Gelmedi', className: 'text-rose-600' },
};

interface VisitsCardProps {
  visits: VisitRow[];
  properties: PropertyOption[];
  homePropertyId: string | null;
  isManager: boolean;
  isLoading?: boolean;
  onOpenLead: (uuid: string) => void;
  onUpdateVisit: (visitId: string) => void;
}

export function VisitsCard({
  visits,
  properties,
  homePropertyId,
  isManager,
  isLoading,
  onOpenLead,
  onUpdateVisit,
}: VisitsCardProps) {
  const defaultFilter = isManager || !homePropertyId ? 'all' : homePropertyId;
  const [selectedProperty, setSelectedProperty] = useState<string>(defaultFilter);
  const showSetHomeHint = !isManager && !homePropertyId;

  const filtered =
    selectedProperty === 'all' ? visits : visits.filter((v) => v.propertyId === selectedProperty);

  const headerAction = (
    <div className="flex items-center gap-2">
      {showSetHomeHint && (
        <Link
          href="/ayarlar"
          className="shrink-0 rounded-md border border-amber-300 bg-amber-50 px-2 py-1 text-[11px] font-medium text-amber-700 hover:bg-amber-100 dark:border-amber-700 dark:bg-amber-950/30 dark:text-amber-400"
        >
          Ana tesisini ayarla
        </Link>
      )}
      {properties.length > 0 && (
        <Select value={selectedProperty} onValueChange={setSelectedProperty}>
          <SelectTrigger className="h-8 w-[160px] text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tüm tesisler</SelectItem>
            {properties.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );

  return (
    <TaskContainerCard
      containerKey="visits"
      count={filtered.length}
      headerAction={headerAction}
      isLoading={isLoading}
      isEmpty={!isLoading && filtered.length === 0}
    >
      {filtered.map((visit) => {
        const statusInfo = STATUS_LABELS[visit.status] ?? STATUS_LABELS.scheduled;
        return (
          <div
            key={visit.id}
            className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-row-hover"
            onClick={() => onOpenLead(visit.leadUuid)}
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="truncate text-sm font-medium text-text-primary">
                  {visit.leadName ?? visit.leadPhone ?? '—'}
                </span>
                <span className="shrink-0 text-xs tabular-nums text-text-tertiary">
                  {visit.timeLabel}
                </span>
              </div>
              <div className="mt-0.5 flex items-center gap-2 text-xs">
                {selectedProperty === 'all' && (
                  <span className="truncate text-text-tertiary">{visit.propertyName}</span>
                )}
                <span className={cn('shrink-0 font-medium', statusInfo.className)}>
                  {statusInfo.label}
                </span>
              </div>
            </div>

            <button
              type="button"
              className="shrink-0 rounded-md border border-border-default bg-surface-card px-2.5 py-1 text-xs font-medium text-text-secondary hover:border-border-strong hover:text-text-primary transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                onUpdateVisit(visit.id);
              }}
            >
              Ziyaret durumu
            </button>
          </div>
        );
      })}
    </TaskContainerCard>
  );
}
