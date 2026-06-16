/**
 * Unplaced customers worklist panel.
 */
import { useMemo, useState } from 'react';
import { IconChevronDown, IconChevronRight } from '@tabler/icons-react';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/status-badge';
import { FormSelect } from '@/components/ui/form-select';
import { useTranslation } from '@/hooks/useTranslation';
import { formatEnumLabel } from '@/lib/i18n/enum-labels';
import { STUDENT_GENDER_VALUES } from '@/lib/constants';
import type { PmsUnplacedLead } from '@/types/domain';

interface UnplacedPanelProps {
  leads: PmsUnplacedLead[];
  properties: { id: string; hotel_name: string }[];
  selectedPropertyId: string;
  viewAll: boolean;
  canWrite: boolean;
  genderFilter?: string;
  schoolFilter?: string;
  onGenderFilterChange?: (value: string) => void;
  onSchoolFilterChange?: (value: string) => void;
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
  onGenderFilterChange,
  onSchoolFilterChange,
  onPropertyChange,
  onViewAllChange,
  onPlace,
  onEditNote,
}: UnplacedPanelProps) {
  const { t, locale } = useTranslation();
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const schoolOptions = useMemo(
    () => [...new Set(leads.map((l) => l.schoolShortname).filter(Boolean))].sort() as string[],
    [leads],
  );

  function toggleExpand(leadUuid: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(leadUuid)) next.delete(leadUuid);
      else next.add(leadUuid);
      return next;
    });
  }

  return (
    <aside className="flex w-full shrink-0 flex-col border-l border-border bg-surface-card lg:w-[320px]">
      <div className="border-b border-border p-4">
        <h2 className="text-sm font-semibold">{t('pms.unplacedTitle')}</h2>
        <p className="mt-1 text-xs text-muted-foreground">{t('pms.unplacedSubtitle')}</p>

        <div className="mt-3 space-y-3">
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
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {leads.length === 0 ? (
          <p className="p-2 text-sm text-muted-foreground">{t('pms.noUnplaced')}</p>
        ) : (
          <ul className="space-y-2">
            {leads.map((lead) => {
              const isOpen = expanded.has(lead.leadUuid);
              return (
                <li
                  key={lead.leadUuid}
                  className="rounded-lg border border-border bg-background p-3"
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
                          <Button size="sm" variant="outline" onClick={() => onPlace(lead)}>
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
