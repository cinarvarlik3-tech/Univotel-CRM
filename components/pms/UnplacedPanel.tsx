/**
 * Unplaced customers worklist panel.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { IconChevronDown, IconChevronRight, IconFilter } from '@tabler/icons-react';
import { Button } from '@/components/ui/button';
import { KpiCard } from '@/components/ui/kpi-card';
import { StatusBadge } from '@/components/ui/status-badge';
import { FormSelect } from '@/components/ui/form-select';
import { useTranslation } from '@/hooks/useTranslation';
import { formatEnumLabel } from '@/lib/i18n/enum-labels';
import { STUDENT_GENDER_VALUES } from '@/lib/constants';
import { cn } from '@/lib/utils';
import type { PmsUnplacedLead } from '@/types/domain';

interface UnplacedPanelProps {
  leads: PmsUnplacedLead[];
  properties: { id: string; hotel_name: string }[];
  selectedPropertyId: string;
  viewAll: boolean;
  canWrite: boolean;
  genderFilter?: string;
  schoolFilter?: string;
  roomTypeFilter?: string;
  roomTypeOptions?: { value: string; label: string }[];
  placedCount?: number;
  unplacedCount?: number;
  onGenderFilterChange?: (value: string) => void;
  onSchoolFilterChange?: (value: string) => void;
  onRoomTypeFilterChange?: (value: string) => void;
  onPropertyChange: (id: string) => void;
  onViewAllChange: (viewAll: boolean) => void;
  onPlace: (lead: PmsUnplacedLead) => void;
  onEditNote: (lead: PmsUnplacedLead) => void;
}

export function UnplacedPanel({
  leads,
  properties,
  selectedPropertyId,
  viewAll,
  canWrite,
  genderFilter = 'all',
  schoolFilter = 'all',
  roomTypeFilter = 'all',
  roomTypeOptions = [],
  placedCount = 0,
  unplacedCount = 0,
  onGenderFilterChange,
  onSchoolFilterChange,
  onRoomTypeFilterChange,
  onPropertyChange,
  onViewAllChange,
  onPlace,
  onEditNote,
}: UnplacedPanelProps) {
  const { t, locale } = useTranslation();
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [filtersOpen, setFiltersOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);

  const schoolOptions = useMemo(
    () => [...new Set(leads.map((l) => l.schoolShortname).filter(Boolean))].sort() as string[],
    [leads],
  );

  const filtersActive =
    viewAll || genderFilter !== 'all' || roomTypeFilter !== 'all' || schoolFilter !== 'all';

  // Custom popover dismissal: ignore clicks inside the trigger/panel and inside any
  // Radix popper (the FormSelect dropdowns portal out of this subtree).
  useEffect(() => {
    if (!filtersOpen) return;
    function onPointerDown(e: PointerEvent) {
      const target = e.target as HTMLElement;
      if (filterRef.current?.contains(target)) return;
      if (target.closest('[data-radix-popper-content-wrapper]')) return;
      setFiltersOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setFiltersOpen(false);
    }
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [filtersOpen]);

  function toggleExpand(leadUuid: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(leadUuid)) next.delete(leadUuid);
      else next.add(leadUuid);
      return next;
    });
  }

  return (
    <aside className="flex w-full shrink-0 flex-col overflow-hidden rounded-xl border border-border-default bg-surface-card shadow-sm lg:sticky lg:top-[18px] lg:h-[calc(100vh-88px)] lg:w-[340px] lg:self-start">
      <div className="bg-gradient-to-br from-brand-blue to-brand-blue-hover px-4 py-3.5 text-white">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-heading text-sm font-semibold text-white">
            {t('pms.unplacedTitle')}
          </h2>
          <div className="flex items-center gap-1.5">
            <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs font-semibold tabular-nums">
              {leads.length}
            </span>
            <div className="relative" ref={filterRef}>
              <button
                type="button"
                aria-label={t('pms.filters')}
                aria-expanded={filtersOpen}
                onClick={() => setFiltersOpen((o) => !o)}
                className={cn(
                  'relative flex size-7 items-center justify-center rounded-md text-white transition-colors hover:bg-white/20',
                  filtersOpen && 'bg-white/20',
                )}
              >
                <IconFilter size={16} />
                {filtersActive && (
                  <span className="absolute right-1 top-1 size-1.5 rounded-full bg-white ring-2 ring-brand-blue" />
                )}
              </button>

              {filtersOpen && (
                <div className="absolute right-0 top-full z-30 mt-2 max-h-[70vh] w-64 space-y-3 overflow-y-auto rounded-lg border border-border-default bg-surface-card p-3 text-text-primary shadow-lg">
                  {!viewAll && (
                    <FormSelect
                      id="unplaced-property"
                      label={t('pms.property')}
                      value={selectedPropertyId}
                      onValueChange={onPropertyChange}
                      options={properties.map((p) => ({ value: p.id, label: p.hotel_name }))}
                    />
                  )}
                  <Button
                    size="sm"
                    variant={viewAll ? 'default' : 'outline'}
                    className="w-full"
                    onClick={() => onViewAllChange(!viewAll)}
                  >
                    {t('pms.viewAll')}
                  </Button>

                  {onGenderFilterChange && (
                    <FormSelect
                      id="unplaced-gender"
                      label={t('pms.filterGender')}
                      value={genderFilter}
                      onValueChange={onGenderFilterChange}
                      options={[
                        { value: 'all', label: t('common.all') },
                        ...STUDENT_GENDER_VALUES.map((g) => ({
                          value: g,
                          label: formatEnumLabel(locale, 'gender', g),
                        })),
                      ]}
                    />
                  )}

                  {onRoomTypeFilterChange && roomTypeOptions.length > 0 && (
                    <FormSelect
                      id="unplaced-room-type"
                      label={t('pms.filterRoomType')}
                      value={roomTypeFilter}
                      onValueChange={onRoomTypeFilterChange}
                      options={[{ value: 'all', label: t('common.all') }, ...roomTypeOptions]}
                    />
                  )}

                  {onSchoolFilterChange && schoolOptions.length > 0 && (
                    <FormSelect
                      id="unplaced-school"
                      label={t('pms.filterSchool')}
                      value={schoolFilter}
                      onValueChange={onSchoolFilterChange}
                      options={[
                        { value: 'all', label: t('common.all') },
                        ...schoolOptions.map((s) => ({ value: s, label: s })),
                      ]}
                    />
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
        <p className="mt-0.5 text-xs text-white/70">{t('pms.unplacedSubtitle')}</p>
      </div>

      <div className="border-b border-border-default p-4">
        <div className="grid grid-cols-2 gap-2">
          <KpiCard variant="blue" label={t('pms.placedKpi')} value={placedCount} />
          <KpiCard variant="red" label={t('pms.unplacedKpi')} value={unplacedCount} />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto bg-surface-page/50 p-3">
        {leads.length === 0 ? (
          <p className="p-2 text-sm text-muted-foreground">{t('pms.noUnplaced')}</p>
        ) : (
          <ul className="space-y-2.5">
            {leads.map((lead) => {
              const isOpen = expanded.has(lead.leadUuid);
              return (
                <li
                  key={lead.leadUuid}
                  className="rounded-lg border border-border-default border-l-[3px] border-l-brand-blue bg-surface-card p-3 shadow-sm transition-all hover:border-l-brand-blue-hover hover:shadow-md"
                >
                  <div className="flex items-start gap-2">
                    <button
                      type="button"
                      className="mt-0.5 text-muted-foreground"
                      onClick={() => toggleExpand(lead.leadUuid)}
                      aria-label={isOpen ? t('pms.collapseNote') : t('pms.expandNote')}
                    >
                      {isOpen ? <IconChevronDown size={16} /> : <IconChevronRight size={16} />}
                    </button>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{lead.leadName ?? '—'}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {lead.purchasedPropertyName} · {lead.purchasedRoomTypeName}
                      </p>
                      <div className="mt-1">
                        <StatusBadge status={lead.funnelStatus} />
                      </div>
                      {isOpen && lead.placementNote && (
                        <p className="mt-2 text-xs text-muted-foreground">{lead.placementNote}</p>
                      )}
                      {canWrite && (
                        <div className="mt-2 flex gap-2">
                          <Button size="sm" onClick={() => onPlace(lead)}>
                            {t('pms.place')}
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => onEditNote(lead)}>
                            {t('pms.addNote')}
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </aside>
  );
}
