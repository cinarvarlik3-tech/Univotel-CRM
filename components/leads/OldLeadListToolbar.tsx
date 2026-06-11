/**
 * Toolbar for old lead list filters, search, and sort controls.
 */
import { IconFilter } from '@tabler/icons-react';
import { useMemo, useState } from 'react';
import { FilterFieldControl } from '@/components/leads/filter/FilterFieldControl';
import { ListFilterSection } from '@/components/leads/list-filter-controls';
import { Button } from '@/components/ui/button';
import { CollapsiblePanel } from '@/components/ui/collapsible-panel';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useProperties } from '@/hooks/useProperties';
import { useTranslation } from '@/hooks/useTranslation';
import { OLD_SORTABLE_COLUMN_OPTIONS } from '@/lib/constants';
import {
  filterFieldsBySection,
  OLD_LEAD_FILTER_FIELD_REGISTRY,
  type FilterFieldDef,
} from '@/lib/leads/filter-field-registry';
import { formatSortColumn } from '@/lib/i18n/enum-labels';
import { DEFAULT_OLD_LEAD_LIST_STATE } from '@/lib/ui/old-lead-list-query';
import type { OldLeadListFilterState } from '@/lib/ui/old-lead-list-query';
import type { FieldFilterState } from '@/types/filter';
import type { SalespersonOption } from '@/types/domain';

export type { OldLeadListFilterState } from '@/lib/ui/old-lead-list-query';
export { DEFAULT_OLD_LEAD_LIST_STATE } from '@/lib/ui/old-lead-list-query';

interface OldLeadListToolbarProps {
  state: OldLeadListFilterState;
  onChange: (state: OldLeadListFilterState) => void;
  onApply: () => void;
  salespeople?: SalespersonOption[];
  isManager?: boolean;
}

function OldSistemDateRanges({
  state,
  onChange,
}: {
  state: OldLeadListFilterState;
  onChange: (state: OldLeadListFilterState) => void;
}) {
  const { t } = useTranslation();

  const ranges = [
    {
      fromKey: 'createdFrom' as const,
      toKey: 'createdTo' as const,
      fromLabel: t('filters.createdFrom'),
      toLabel: t('filters.createdTo'),
    },
    {
      fromKey: 'lastContactFrom' as const,
      toKey: 'lastContactTo' as const,
      fromLabel: t('filters.lastContactFrom'),
      toLabel: t('filters.lastContactTo'),
    },
    {
      fromKey: 'moveInFrom' as const,
      toKey: 'moveInTo' as const,
      fromLabel: t('filters.moveInFrom'),
      toLabel: t('filters.moveInTo'),
    },
  ];

  return (
    <>
      {ranges.map(({ fromKey, toKey, fromLabel, toLabel }) => (
        <div key={fromKey} className="col-span-2 grid grid-cols-2 gap-3">
          <FormField label={fromLabel} htmlFor={`old_${fromKey}`}>
            <Input
              id={`old_${fromKey}`}
              type="date"
              value={state[fromKey]}
              onChange={(e) => onChange({ ...state, [fromKey]: e.target.value })}
            />
          </FormField>
          <FormField label={toLabel} htmlFor={`old_${toKey}`}>
            <Input
              id={`old_${toKey}`}
              type="date"
              value={state[toKey]}
              onChange={(e) => onChange({ ...state, [toKey]: e.target.value })}
            />
          </FormField>
        </div>
      ))}
    </>
  );
}

function hasMatchValue(filter: FieldFilterState): boolean {
  if (filter.mode === 'filled' || filter.mode === 'empty') return true;
  if (filter.values && filter.values.length > 0) return true;
  return Boolean(filter.value?.trim());
}

/**
 * Renders search, sort, and filter controls for the old leads list page.
 */
export function OldLeadListToolbar({
  state,
  onChange,
  onApply,
  salespeople,
  isManager,
}: OldLeadListToolbarProps) {
  const [showFilters, setShowFilters] = useState(false);
  const { data: properties } = useProperties();
  const { locale, t } = useTranslation();

  const propertyNames = useMemo(() => (properties ?? []).map((p) => p.hotel_name), [properties]);

  function setFieldFilter(fieldId: string, filter: FieldFilterState | undefined) {
    const fieldFilters = { ...state.fieldFilters };
    if (!filter || (filter.mode === 'match' && !hasMatchValue(filter))) {
      delete fieldFilters[fieldId];
    } else {
      fieldFilters[fieldId] = filter;
    }
    onChange({ ...state, fieldFilters });
  }

  function clearFilters() {
    onChange(DEFAULT_OLD_LEAD_LIST_STATE);
  }

  const sections = ['genel', 'profil', 'detay', 'sistem'] as const;
  const sectionTitles = {
    genel: t('leads.overview'),
    profil: t('leads.profile'),
    detay: t('leads.detay'),
    sistem: t('filters.sectionSistem'),
  };

  return (
    <div className="mb-4 space-y-3">
      <div className="flex flex-wrap items-end gap-3">
        <FormField
          label={t('filters.search')}
          htmlFor="old_lead_search"
          className="min-w-[200px] flex-1"
        >
          <Input
            id="old_lead_search"
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

        <FormField label={t('filters.sort')} htmlFor="old_lead_sort" className="min-w-[160px]">
          <Select value={state.sort} onValueChange={(v) => onChange({ ...state, sort: v })}>
            <SelectTrigger id="old_lead_sort">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {OLD_SORTABLE_COLUMN_OPTIONS.map((col) => (
                <SelectItem key={col} value={col}>
                  {formatSortColumn(locale, col)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>

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
              const fields = filterFieldsBySection(section, OLD_LEAD_FILTER_FIELD_REGISTRY);
              return (
                <ListFilterSection
                  key={section}
                  title={sectionTitles[section]}
                  defaultOpen={section === 'genel'}
                >
                  {fields.map((def: FilterFieldDef) => {
                    if (def.managerOnly && !isManager) return null;
                    return (
                      <FilterFieldControl
                        key={def.id}
                        def={def}
                        filter={state.fieldFilters[def.id]}
                        onChange={(f) => setFieldFilter(def.id, f)}
                        salespeople={salespeople}
                        propertyNames={propertyNames}
                        idPrefix="old_filter"
                      />
                    );
                  })}
                  {section === 'sistem' && (
                    <OldSistemDateRanges state={state} onChange={onChange} />
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
