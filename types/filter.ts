/**
 * Lead list filter state types (Genel / Profil / Detay / Sistem panel).
 */

/** How a single field filter is applied. */
export type FilterMode = 'match' | 'filled' | 'empty';

/** Comparison operators for date and numeric fields. */
export type ComparisonOp = 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte';

/** Whether a datetime filter uses date-only or full timestamp input. */
export type DateInputKind = 'date' | 'datetime';

/** Per-field filter state. Inactive when mode is unset (field not filtered). */
export interface FieldFilterState {
  mode: FilterMode;
  value?: string;
  values?: string[];
  operator?: ComparisonOp;
  fuzzy?: boolean;
  dateKind?: DateInputKind;
}

/** Sistem section date-range shortcuts (from/to pairs). */
export interface SistemDateRanges {
  createdFrom: string;
  createdTo: string;
  slaFrom: string;
  slaTo: string;
  lastContactFrom: string;
  lastContactTo: string;
  moveInFrom: string;
  moveInTo: string;
}

/** Full lead list toolbar / pipeline filter state. */
export interface LeadListFilterState extends SistemDateRanges {
  sort: string;
  /** Sort direction. Defaults to 'desc'. Use 'asc' for "En son temas" (furthest-past-first). */
  sortDir: 'asc' | 'desc';
  search: string;
  fieldFilters: Record<string, FieldFilterState>;
}

export const EMPTY_SISTEM_DATE_RANGES: SistemDateRanges = {
  createdFrom: '',
  createdTo: '',
  slaFrom: '',
  slaTo: '',
  lastContactFrom: '',
  lastContactTo: '',
  moveInFrom: '',
  moveInTo: '',
};

export const DEFAULT_LEAD_LIST_STATE: LeadListFilterState = {
  sort: 'created_at',
  sortDir: 'desc',
  search: '',
  fieldFilters: {},
  ...EMPTY_SISTEM_DATE_RANGES,
};

/** Returns true when a field filter is actively applied. */
export function isFieldFilterActive(filter: FieldFilterState | undefined): boolean {
  if (!filter?.mode) return false;
  if (filter.mode === 'filled' || filter.mode === 'empty') return true;
  if (filter.mode === 'match') {
    if (filter.values && filter.values.length > 0) return true;
    return Boolean(filter.value?.trim());
  }
  return false;
}
