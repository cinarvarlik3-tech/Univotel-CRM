/**
 * Shared UI controls for lead list filter toolbars.
 */
import { IconChevronDown } from '@tabler/icons-react';
import { useId, useState, type ReactNode } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { CollapsiblePanel } from '@/components/ui/collapsible-panel';
import { FormField } from '@/components/ui/form-field';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useTranslation } from '@/hooks/useTranslation';
import { formatEnumLabel } from '@/lib/i18n/enum-labels';
import { cn } from '@/lib/utils';
import type { PresenceFilter } from '@/lib/ui/list-filter-types';

/** Grid layout shared by filter section bodies. */
export const LIST_FILTER_GRID_CLASS =
  'grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5';

interface ListFilterSectionProps {
  title: string;
  children: ReactNode;
  /** Whether the section starts expanded. Pipeline defaults to open. */
  defaultOpen?: boolean;
}

/**
 * Collapsible filter group with a toggle heading.
 * @param props - Section title, children, and initial open state.
 * @returns Collapsible filter section.
 */
export function ListFilterSection({
  title,
  children,
  defaultOpen = false,
}: ListFilterSectionProps) {
  const [open, setOpen] = useState(defaultOpen);
  const panelId = useId();

  return (
    <div className="border-t border-border-default pt-1 first:border-t-0 first:pt-0">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center justify-between rounded-md px-1 py-2 text-left transition-colors hover:bg-row-hover/60"
      >
        <span className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
          {title}
        </span>
        <IconChevronDown
          size={16}
          aria-hidden
          className={cn(
            'shrink-0 text-text-secondary transition-transform duration-200',
            open && 'rotate-180',
          )}
        />
      </button>
      <CollapsiblePanel open={open} id={panelId}>
        <div className={cn(LIST_FILTER_GRID_CLASS, 'pb-1 pt-2')}>{children}</div>
      </CollapsiblePanel>
    </div>
  );
}

interface PresenceFilterSelectProps {
  id: string;
  label: string;
  value: PresenceFilter;
  onChange: (value: PresenceFilter) => void;
}

/**
 * Tri-state select for nullable field presence filters.
 * @param props - Field id, label, value, and change handler.
 * @returns Presence filter select element.
 */
export function PresenceFilterSelect({ id, label, value, onChange }: PresenceFilterSelectProps) {
  const { t } = useTranslation();

  return (
    <FormField label={label} htmlFor={id}>
      <Select value={value} onValueChange={(v) => onChange(v as PresenceFilter)}>
        <SelectTrigger id={id}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="any">{t('common.any')}</SelectItem>
          <SelectItem value="yes">{t('common.yes')}</SelectItem>
          <SelectItem value="no">{t('common.no')}</SelectItem>
        </SelectContent>
      </Select>
    </FormField>
  );
}

interface DormAwaitingCheckboxesProps {
  selected: string[];
  onChange: (values: string[]) => void;
  idPrefix: string;
  values: readonly string[];
}

/**
 * Multi-select dorm awaiting checkboxes (any-of overlap filter).
 * @param props - Selected values and change handler.
 * @returns Dorm awaiting checkbox group.
 */
export function DormAwaitingCheckboxes({
  selected,
  onChange,
  idPrefix,
  values,
}: DormAwaitingCheckboxesProps) {
  const { locale, t } = useTranslation();

  function toggle(value: string) {
    if (selected.includes(value)) {
      onChange(selected.filter((v) => v !== value));
    } else {
      onChange([...selected, value]);
    }
  }

  return (
    <div className="col-span-full space-y-2 rounded-lg border border-border-default p-3">
      <p className="text-sm font-medium text-text-primary">{t('filters.dormAwaitingAnyOf')}</p>
      <div className="grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-3">
        {values.map((value) => (
          <div key={value} className="flex items-center gap-2">
            <Checkbox
              id={`${idPrefix}_dorm_${value}`}
              checked={selected.includes(value)}
              onCheckedChange={() => toggle(value)}
            />
            <label htmlFor={`${idPrefix}_dorm_${value}`} className="text-xs text-text-primary">
              {formatEnumLabel(locale, 'dorm', value)}
            </label>
          </div>
        ))}
      </div>
    </div>
  );
}

interface DataQualityCheckboxesProps {
  idPrefix: string;
  missingUniversity: boolean;
  missingGender: boolean;
  missingBudget: boolean;
  onChange: (patch: {
    missingUniversity?: boolean;
    missingGender?: boolean;
    missingBudget?: boolean;
  }) => void;
}

/**
 * Data completeness toggles for enrichment queues.
 * @param props - Current toggle state and patch handler.
 * @returns Data quality checkbox group.
 */
export function DataQualityCheckboxes({
  idPrefix,
  missingUniversity,
  missingGender,
  missingBudget,
  onChange,
}: DataQualityCheckboxesProps) {
  const { t } = useTranslation();

  return (
    <div className="col-span-full space-y-2 rounded-lg border border-border-default p-3">
      <p className="text-sm font-medium text-text-primary">{t('filters.missingData')}</p>
      <div className="flex flex-wrap gap-4">
        <div className="flex items-center gap-2">
          <Checkbox
            id={`${idPrefix}_missing_university`}
            checked={missingUniversity}
            onCheckedChange={(checked) => onChange({ missingUniversity: checked === true })}
          />
          <label htmlFor={`${idPrefix}_missing_university`} className="text-xs text-text-primary">
            {t('filters.missingUniversity')}
          </label>
        </div>
        <div className="flex items-center gap-2">
          <Checkbox
            id={`${idPrefix}_missing_gender`}
            checked={missingGender}
            onCheckedChange={(checked) => onChange({ missingGender: checked === true })}
          />
          <label htmlFor={`${idPrefix}_missing_gender`} className="text-xs text-text-primary">
            {t('filters.missingGender')}
          </label>
        </div>
        <div className="flex items-center gap-2">
          <Checkbox
            id={`${idPrefix}_missing_budget`}
            checked={missingBudget}
            onCheckedChange={(checked) => onChange({ missingBudget: checked === true })}
          />
          <label htmlFor={`${idPrefix}_missing_budget`} className="text-xs text-text-primary">
            {t('filters.missingBudget')}
          </label>
        </div>
      </div>
    </div>
  );
}
