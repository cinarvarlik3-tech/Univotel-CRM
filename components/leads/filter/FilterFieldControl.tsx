/**
 * Generic filter control for a single registry field.
 */
import { Checkbox } from '@/components/ui/checkbox';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { UniversityCombobox } from '@/components/ui/university-combobox';
import { FilterModeToggle } from '@/components/leads/filter/FilterModeToggle';
import { useTranslation } from '@/hooks/useTranslation';
import { useUniversities } from '@/hooks/useUniversities';
import { formatEnumLabel } from '@/lib/i18n/enum-labels';
import type { FilterFieldDef } from '@/lib/leads/filter-field-registry';
import type { ComparisonOp, FieldFilterState, FilterMode } from '@/types/filter';
import type { SalespersonOption } from '@/types/domain';

const COMPARISON_OPS: ComparisonOp[] = ['eq', 'neq', 'gt', 'gte', 'lt', 'lte'];

const OP_LABEL_KEYS: Record<ComparisonOp, string> = {
  eq: 'filters.opEq',
  neq: 'filters.opNeq',
  gt: 'filters.opGt',
  gte: 'filters.opGte',
  lt: 'filters.opLt',
  lte: 'filters.opLte',
};

interface FilterFieldControlProps {
  def: FilterFieldDef;
  filter: FieldFilterState | undefined;
  onChange: (filter: FieldFilterState | undefined) => void;
  salespeople?: SalespersonOption[];
  propertyNames?: string[];
  idPrefix?: string;
}

function defaultFilter(mode: FilterMode = 'match'): FieldFilterState {
  return { mode, operator: 'gte', fuzzy: false, dateKind: 'date' };
}

/**
 * Renders mode toggle and value input(s) for one filterable field.
 */
export function FilterFieldControl({
  def,
  filter,
  onChange,
  salespeople,
  propertyNames,
  idPrefix = 'filter',
}: FilterFieldControlProps) {
  const { locale, t } = useTranslation();
  const { data: universities, isLoading: universitiesLoading } = useUniversities();

  const state = filter ?? defaultFilter();
  const fieldId = `${idPrefix}_${def.id}`;
  const label = t(def.labelKey);

  function setMode(mode: FilterMode) {
    onChange({ ...defaultFilter(mode), mode });
  }

  function setPatch(patch: Partial<FieldFilterState>) {
    onChange({ ...state, ...patch });
  }

  const showValue = state.mode === 'match';

  return (
    <FormField label={label} htmlFor={fieldId} className="space-y-1.5">
      <FilterModeToggle mode={state.mode} onChange={setMode} />

      {showValue && def.kind === 'enum' && def.options && (
        <Select
          value={state.value ?? ''}
          onValueChange={(v) => setPatch({ value: v || undefined })}
        >
          <SelectTrigger id={fieldId}>
            <SelectValue placeholder={t('common.all')} />
          </SelectTrigger>
          <SelectContent>
            {def.options.map((opt) => (
              <SelectItem key={opt} value={opt}>
                {formatEnumLabel(locale, def.enumGroup ?? 'funnel', opt)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {showValue && def.kind === 'boolean' && (
        <Select
          value={state.value ?? ''}
          onValueChange={(v) => setPatch({ value: v || undefined })}
        >
          <SelectTrigger id={fieldId}>
            <SelectValue placeholder={t('common.all')} />
          </SelectTrigger>
          <SelectContent>
            {def.id === 'rec_hotel' ? (
              <>
                <SelectItem value="yes">{t('common.yes')}</SelectItem>
                <SelectItem value="no">{t('common.no')}</SelectItem>
              </>
            ) : (
              <>
                <SelectItem value="true">{t('common.yes')}</SelectItem>
                <SelectItem value="false">{t('common.no')}</SelectItem>
              </>
            )}
          </SelectContent>
        </Select>
      )}

      {showValue && def.kind === 'text' && def.id === 'interested_hotel' && propertyNames ? (
        <Select
          value={state.value ?? ''}
          onValueChange={(v) => setPatch({ value: v || undefined })}
        >
          <SelectTrigger id={fieldId}>
            <SelectValue placeholder={t('common.all')} />
          </SelectTrigger>
          <SelectContent>
            {propertyNames.map((name) => (
              <SelectItem key={name} value={name}>
                {name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : null}

      {showValue && def.kind === 'text' && def.id !== 'interested_hotel' && (
        <>
          <Input
            id={fieldId}
            value={state.value ?? ''}
            onChange={(e) => setPatch({ value: e.target.value })}
            placeholder={def.supportsFuzzy ? t('filters.partialMatch') : undefined}
          />
          {def.supportsFuzzy && (
            <div className="flex items-center gap-1.5">
              <Checkbox
                id={`${fieldId}_fuzzy`}
                checked={state.fuzzy ?? false}
                onCheckedChange={(checked) => setPatch({ fuzzy: checked === true })}
              />
              <label htmlFor={`${fieldId}_fuzzy`} className="text-[10px] text-text-secondary">
                {t('filters.fuzzyField')}
              </label>
            </div>
          )}
        </>
      )}

      {showValue && def.kind === 'multiselect' && def.options && (
        <div className="space-y-1 rounded-md border border-border-default p-2">
          {def.options.map((opt) => {
            const selected = state.values ?? [];
            const checked = selected.includes(opt);
            return (
              <div key={opt} className="flex items-center gap-2">
                <Checkbox
                  id={`${fieldId}_${opt}`}
                  checked={checked}
                  onCheckedChange={(isChecked) => {
                    const next = isChecked ? [...selected, opt] : selected.filter((v) => v !== opt);
                    setPatch({ values: next.length > 0 ? next : undefined });
                  }}
                />
                <label htmlFor={`${fieldId}_${opt}`} className="text-xs text-text-secondary">
                  {formatEnumLabel(locale, def.enumGroup ?? 'dorm', opt)}
                </label>
              </div>
            );
          })}
        </div>
      )}

      {showValue && def.kind === 'number' && (
        <div className="flex gap-1">
          <Select
            value={state.operator ?? 'gte'}
            onValueChange={(v) => setPatch({ operator: v as ComparisonOp })}
          >
            <SelectTrigger className="w-[72px] shrink-0">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {COMPARISON_OPS.map((op) => (
                <SelectItem key={op} value={op}>
                  {t(OP_LABEL_KEYS[op])}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            id={fieldId}
            type="number"
            value={state.value ?? ''}
            onChange={(e) => setPatch({ value: e.target.value })}
            className="min-w-0 flex-1"
          />
        </div>
      )}

      {showValue && def.kind === 'date' && (
        <div className="space-y-1">
          {def.supportsDatetime && (
            <Select
              value={state.dateKind ?? 'date'}
              onValueChange={(v) =>
                setPatch({ dateKind: v as 'date' | 'datetime', value: undefined })
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date">{t('filters.dateOnly')}</SelectItem>
                <SelectItem value="datetime">{t('filters.dateTime')}</SelectItem>
              </SelectContent>
            </Select>
          )}
          <div className="flex gap-1">
            <Select
              value={state.operator ?? 'gte'}
              onValueChange={(v) => setPatch({ operator: v as ComparisonOp })}
            >
              <SelectTrigger className="w-[72px] shrink-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {COMPARISON_OPS.map((op) => (
                  <SelectItem key={op} value={op}>
                    {t(OP_LABEL_KEYS[op])}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              id={fieldId}
              type={state.dateKind === 'datetime' ? 'datetime-local' : 'date'}
              value={state.value ?? ''}
              onChange={(e) => setPatch({ value: e.target.value })}
              className="min-w-0 flex-1"
            />
          </div>
        </div>
      )}

      {showValue && def.kind === 'assignee' && salespeople && (
        <Select
          value={state.value ?? ''}
          onValueChange={(v) => setPatch({ value: v || undefined })}
        >
          <SelectTrigger id={fieldId}>
            <SelectValue placeholder={t('common.all')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__unassigned__">{t('common.unassigned')}</SelectItem>
            {salespeople.map((sp) => (
              <SelectItem key={sp.id} value={sp.id}>
                {sp.full_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {showValue && def.kind === 'university' && (
        <>
          <UniversityCombobox
            id={fieldId}
            value={state.value ?? ''}
            universities={universities ?? []}
            loading={universitiesLoading}
            placeholder={t('filters.partialMatch')}
            onSelect={(uniName) => setPatch({ value: uniName })}
            onClear={() => setPatch({ value: undefined })}
            listboxId={`${fieldId}_listbox`}
          />
          <div className="flex items-center gap-1.5">
            <Checkbox
              id={`${fieldId}_fuzzy`}
              checked={state.fuzzy ?? true}
              onCheckedChange={(checked) => setPatch({ fuzzy: checked === true })}
            />
            <label htmlFor={`${fieldId}_fuzzy`} className="text-[10px] text-text-secondary">
              {t('filters.fuzzyField')}
            </label>
          </div>
        </>
      )}
    </FormField>
  );
}
