/**
 * Filter toolbar for archived leads list page.
 */
import { LEAD_SOURCES } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { FormField } from '@/components/ui/form-field';
import { FormSelect } from '@/components/ui/form-select';
import { Input } from '@/components/ui/input';
import { useTranslation } from '@/hooks/useTranslation';
import { formatEnumLabel } from '@/lib/i18n/enum-labels';
import type { SalespersonOption } from '@/types/domain';

/** Filter state for archived lead list. */
export interface ArchivedLeadListFilterState {
  search: string;
  fuzzy: boolean;
  archiveReason: string;
  leadSource: string;
  assignedTo: string;
  archivedFrom: string;
  archivedTo: string;
}

/** Default archived list filter state. */
export const DEFAULT_ARCHIVED_LIST_STATE: ArchivedLeadListFilterState = {
  search: '',
  fuzzy: false,
  archiveReason: '',
  leadSource: '',
  assignedTo: '',
  archivedFrom: '',
  archivedTo: '',
};

interface ArchivedLeadListToolbarProps {
  state: ArchivedLeadListFilterState;
  onChange: (state: ArchivedLeadListFilterState) => void;
  onApply: () => void;
  salespeople: SalespersonOption[];
}

/**
 * Renders archived lead list filters and apply button.
 * @param props - Filter state, change handler, and salespeople options.
 * @returns Toolbar form element.
 */
export function ArchivedLeadListToolbar({
  state,
  onChange,
  onApply,
  salespeople,
}: ArchivedLeadListToolbarProps) {
  const { locale, t } = useTranslation();

  function update<K extends keyof ArchivedLeadListFilterState>(
    key: K,
    value: ArchivedLeadListFilterState[K],
  ) {
    onChange({ ...state, [key]: value });
  }

  return (
    <Card className="mb-4">
      <CardContent className="flex flex-col gap-4 pt-4">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
          <FormField label={t('filters.searchNameOrPhone')} htmlFor="archived_search">
            <Input
              id="archived_search"
              value={state.search}
              onChange={(e) => update('search', e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && onApply()}
            />
          </FormField>
          <div className="col-span-full flex items-center gap-2">
            <Checkbox
              id="archived_fuzzy"
              checked={state.fuzzy}
              onCheckedChange={(checked) => update('fuzzy', checked === true)}
            />
            <label htmlFor="archived_fuzzy" className="text-xs text-text-secondary">
              {t('filters.fuzzySearch')}
            </label>
          </div>
          <FormSelect
            label={t('filters.outcome')}
            id="archive_reason"
            value={state.archiveReason || 'all'}
            onValueChange={(v) => update('archiveReason', v === 'all' ? '' : v)}
            options={[
              { value: 'all', label: t('common.all') },
              { value: 'won', label: formatEnumLabel(locale, 'archive', 'won') },
              { value: 'lost', label: formatEnumLabel(locale, 'archive', 'lost') },
            ]}
          />
          <FormSelect
            label={t('filters.source')}
            id="archived_lead_source"
            value={state.leadSource || 'all'}
            onValueChange={(v) => update('leadSource', v === 'all' ? '' : v)}
            options={[
              { value: 'all', label: t('common.all') },
              ...LEAD_SOURCES.map((source) => ({
                value: source,
                label: formatEnumLabel(locale, 'source', source),
              })),
            ]}
          />
          <FormSelect
            label={t('archived.tableAssignedTo')}
            id="archived_assigned_to"
            value={state.assignedTo || 'all'}
            onValueChange={(v) => update('assignedTo', v === 'all' ? '' : v)}
            options={[
              { value: 'all', label: t('common.all') },
              ...salespeople.map((sp) => ({ value: sp.id, label: sp.full_name })),
            ]}
          />
          <FormField label={t('filters.archivedFrom')} htmlFor="archived_from">
            <Input
              id="archived_from"
              type="date"
              value={state.archivedFrom}
              onChange={(e) => update('archivedFrom', e.target.value)}
            />
          </FormField>
          <FormField label={t('filters.archivedTo')} htmlFor="archived_to">
            <Input
              id="archived_to"
              type="date"
              value={state.archivedTo}
              onChange={(e) => update('archivedTo', e.target.value)}
            />
          </FormField>
        </div>
        <Button type="button" onClick={onApply}>
          {t('common.applyFilters')}
        </Button>
      </CardContent>
    </Card>
  );
}
