/**
 * Toolbar for lead list filters, search, and sort controls.
 * Filter panel mirrors side-panel sections: Genel, Profil, Detay, Sistem.
 */
import { IconArrowDown, IconArrowUp, IconFilter } from '@tabler/icons-react';
import { useMemo, useState } from 'react';
import { FilterFieldControl } from '@/components/leads/filter/FilterFieldControl';
import { ListFilterSection } from '@/components/leads/list-filter-controls';
import { Button } from '@/components/ui/button';
import { CollapsiblePanel } from '@/components/ui/collapsible-panel';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useProperties } from '@/hooks/useProperties';
import { useTranslation } from '@/hooks/useTranslation';
import {
  filterFieldsBySection,
  LEAD_FILTER_FIELD_REGISTRY,
  type FilterFieldDef,
} from '@/lib/leads/filter-field-registry';
import { DEFAULT_LEAD_LIST_STATE } from '@/types/filter';
import type { FieldFilterState, LeadListFilterState } from '@/types/filter';
import type { SalespersonOption } from '@/types/domain';

export type { LeadListFilterState } from '@/types/filter';
export { DEFAULT_LEAD_LIST_STATE } from '@/types/filter';

interface LeadListToolbarProps {
  state: LeadListFilterState;
  onChange: (state: LeadListFilterState) => void;
  onApply: () => void;
  salespeople?: SalespersonOption[];
  isManager?: boolean;
  /** Hide these field ids (e.g. deal_awaiting on deal-awaiting page). */
  hiddenFields?: ReadonlySet<string>;
  /** Filter field registry (defaults to active-lead fields). */
  fieldRegistry?: FilterFieldDef[];
  /** Reset target for "Clear all" (defaults to active-lead defaults). */
  defaultState?: LeadListFilterState;
  /** Omit SLA date-range shortcuts (old leads). */
  hideSlaDateRanges?: boolean;
  /** Prefix for input ids (e.g. "old" on old-leads page). */
  idPrefix?: string;
}

function SistemDateRanges({
  state,
  onChange,
  hideSlaDateRanges,
  idPrefix,
}: {
  state: LeadListFilterState;
  onChange: (state: LeadListFilterState) => void;
  hideSlaDateRanges?: boolean;
  idPrefix?: string;
}) {
  const { t } = useTranslation();
  const prefix = idPrefix ? `${idPrefix}_` : '';

  const ranges: {
    fromKey: keyof LeadListFilterState;
    toKey: keyof LeadListFilterState;
    fromLabel: string;
    toLabel: string;
  }[] = [
    {
      fromKey: 'createdFrom',
      toKey: 'createdTo',
      fromLabel: t('filters.createdFrom'),
      toLabel: t('filters.createdTo'),
    },
    ...(!hideSlaDateRanges
      ? [
          {
            fromKey: 'slaFrom' as const,
            toKey: 'slaTo' as const,
            fromLabel: t('filters.slaFrom'),
            toLabel: t('filters.slaTo'),
          },
        ]
      : []),
    {
      fromKey: 'lastContactFrom',
      toKey: 'lastContactTo',
      fromLabel: t('filters.lastContactFrom'),
      toLabel: t('filters.lastContactTo'),
    },
    {
      fromKey: 'moveInFrom',
      toKey: 'moveInTo',
      fromLabel: t('filters.moveInFrom'),
      toLabel: t('filters.moveInTo'),
    },
  ];

  return (
    <>
      {ranges.map(({ fromKey, toKey, fromLabel, toLabel }) => (
        <div key={fromKey} className="col-span-2 grid grid-cols-2 gap-3">
          <FormField label={fromLabel} htmlFor={`${prefix}${fromKey}_from`}>
            <Input
              id={`${prefix}${fromKey}_from`}
              type="date"
              value={state[fromKey] as string}
              onChange={(e) => onChange({ ...state, [fromKey]: e.target.value })}
            />
          </FormField>
          <FormField label={toLabel} htmlFor={`${prefix}${toKey}_to`}>
            <Input
              id={`${prefix}${toKey}_to`}
              type="date"
              value={state[toKey] as string}
              onChange={(e) => onChange({ ...state, [toKey]: e.target.value })}
            />
          </FormField>
        </div>
      ))}
    </>
  );
}

function FilterSectionFields({
  fields,
  state,
  onChange,
  salespeople,
  isManager,
  propertyNames,
  idPrefix,
}: {
  fields: FilterFieldDef[];
  state: LeadListFilterState;
  onChange: (state: LeadListFilterState) => void;
  salespeople?: SalespersonOption[];
  isManager?: boolean;
  propertyNames?: string[];
  idPrefix?: string;
}) {
  function setFieldFilter(fieldId: string, filter: FieldFilterState | undefined) {
    const fieldFilters = { ...state.fieldFilters };
    if (!filter || (filter.mode === 'match' && !hasMatchValue(filter))) {
      delete fieldFilters[fieldId];
    } else {
      fieldFilters[fieldId] = filter;
    }
    onChange({ ...state, fieldFilters });
  }

  return (
    <>
      {fields.map((def) => {
        if (def.managerOnly && !isManager) return null;
        return (
          <FilterFieldControl
            key={def.id}
            def={def}
            filter={state.fieldFilters[def.id]}
            onChange={(f) => setFieldFilter(def.id, f)}
            salespeople={salespeople}
            propertyNames={propertyNames}
            idPrefix={idPrefix ? `${idPrefix}_filter` : undefined}
          />
        );
      })}
    </>
  );
}

function hasMatchValue(filter: FieldFilterState): boolean {
  if (filter.mode === 'filled' || filter.mode === 'empty') return true;
  if (filter.values && filter.values.length > 0) return true;
  return Boolean(filter.value?.trim());
}

/**
 * Renders search, sort, and filter controls for the leads list page.
 */
export function LeadListToolbar({
  state,
  onChange,
  onApply,
  salespeople,
  isManager,
  hiddenFields,
  fieldRegistry = LEAD_FILTER_FIELD_REGISTRY,
  defaultState = DEFAULT_LEAD_LIST_STATE,
  hideSlaDateRanges = false,
  idPrefix,
}: LeadListToolbarProps) {
  const [showFilters, setShowFilters] = useState(false);
  const { data: properties } = useProperties();
  const { t } = useTranslation();
  const searchId = idPrefix ? `${idPrefix}_search` : 'lead_search';

  const propertyNames = useMemo(() => (properties ?? []).map((p) => p.hotel_name), [properties]);

  const visibleFields = useMemo(
    () => (hiddenFields ? fieldRegistry.filter((f) => !hiddenFields.has(f.id)) : fieldRegistry),
    [hiddenFields, fieldRegistry],
  );

  function clearFilters() {
    onChange(defaultState);
  }

  const sections = ['genel', 'profil', 'detay', 'sistem'] as const;
  const sectionTitles: Record<(typeof sections)[number], string> = {
    genel: t('leads.overview'),
    profil: t('leads.profile'),
    detay: t('leads.detay'),
    sistem: t('filters.sectionSistem'),
  };

  return (
    <div className="mb-4 space-y-3">
      <div className="flex flex-wrap items-end gap-3">
        <FormField label={t('filters.search')} htmlFor={searchId} className="min-w-[200px] flex-1">
          <Input
            id={searchId}
            value={state.search}
            onChange={(e) => onChange({ ...state, search: e.target.value })}
            onKeyDown={(e) => e.key === 'Enter' && onApply()}
            placeholder={t('filters.searchNameOrPhoneShort')}
          />
        </FormField>

        <Button type="button" variant="secondary" onClick={() => setShowFilters((v) => !v)}>
          <IconFilter size={16} />
          {t('common.filters')}
        </Button>

        <div className="flex items-end gap-1">
          <FormField label={t('filters.sort')} htmlFor="sort_preset" className="flex-shrink-0">
            <div id="sort_preset" className="flex gap-1">
              <Button
                type="button"
                size="sm"
                variant={
                  state.sort === 'created_at' && state.sortDir === 'desc' ? 'default' : 'secondary'
                }
                className={cn('gap-1 text-xs')}
                onClick={() => {
                  onChange({ ...state, sort: 'created_at', sortDir: 'desc' });
                  onApply();
                }}
                title="Oluşturulma tarihine göre (en yeni üstte)"
              >
                <IconArrowDown size={13} />
                Oluşturulma
              </Button>
              <Button
                type="button"
                size="sm"
                variant={
                  state.sort === 'last_contact_at' && state.sortDir === 'asc'
                    ? 'default'
                    : 'secondary'
                }
                className={cn('gap-1 text-xs')}
                onClick={() => {
                  onChange({ ...state, sort: 'last_contact_at', sortDir: 'asc' });
                  onApply();
                }}
                title="En eski temasa göre (en uzak geçmiş üstte)"
              >
                <IconArrowUp size={13} />
                En son temas
              </Button>
            </div>
          </FormField>
        </div>

        <Button type="button" onClick={onApply}>
          {t('common.apply')}
        </Button>

        <Button type="button" variant="secondary" onClick={clearFilters}>
          {t('common.clearAll')}
        </Button>
      </div>

      <CollapsiblePanel open={showFilters}>
        <div className="rounded-[10px] border border-border-default bg-surface-card p-4">
          <div className="space-y-1">
            {sections.map((section) => {
              const fields = filterFieldsBySection(section, fieldRegistry).filter((f) =>
                visibleFields.some((v) => v.id === f.id),
              );
              if (fields.length === 0 && section !== 'sistem') return null;

              return (
                <ListFilterSection
                  key={section}
                  title={sectionTitles[section]}
                  defaultOpen={section === 'genel'}
                >
                  <FilterSectionFields
                    fields={fields}
                    state={state}
                    onChange={onChange}
                    salespeople={salespeople}
                    isManager={isManager}
                    propertyNames={propertyNames}
                    idPrefix={idPrefix}
                  />
                  {section === 'sistem' && (
                    <SistemDateRanges
                      state={state}
                      onChange={onChange}
                      hideSlaDateRanges={hideSlaDateRanges}
                      idPrefix={idPrefix}
                    />
                  )}
                </ListFilterSection>
              );
            })}
          </div>
        </div>
      </CollapsiblePanel>
    </div>
  );
}
