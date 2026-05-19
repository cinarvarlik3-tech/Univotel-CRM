/**
 * Toolbar for lead list filters, search, and sort controls.
 */
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import {
  FUNNEL_STATUSES,
  LEAD_SOURCES,
  LANGUAGES,
  PERSONA_TYPES,
  SORTABLE_COLUMN_OPTIONS,
  STUDENT_STAGES,
  UNI_YEARS,
} from '@/lib/constants';
import type { SalespersonOption } from '@/types/domain';

/** Filter state for lead list queries. */
export interface LeadListFilterState {
  sort: string;
  search: string;
  fuzzy: boolean;
  filters: Record<string, string>;
  createdFrom: string;
  createdTo: string;
  slaFrom: string;
  slaTo: string;
  scoreMin: string;
}

export const DEFAULT_LEAD_LIST_STATE: LeadListFilterState = {
  sort: 'created_at',
  search: '',
  fuzzy: false,
  filters: {},
  createdFrom: '',
  createdTo: '',
  slaFrom: '',
  slaTo: '',
  scoreMin: '',
};

interface LeadListToolbarProps {
  state: LeadListFilterState;
  onChange: (state: LeadListFilterState) => void;
  onApply: () => void;
  salespeople?: SalespersonOption[];
  isManager?: boolean;
}

/**
 * Renders search, sort, and filter controls for the leads list page.
 * @param props - Current filter state and change handlers.
 * @returns Filter toolbar element.
 */
export function LeadListToolbar({
  state,
  onChange,
  onApply,
  salespeople,
  isManager,
}: LeadListToolbarProps) {
  function setFilter(field: string, value: string) {
    const filters = { ...state.filters };
    if (value) {
      filters[field] = value;
    } else {
      delete filters[field];
    }
    onChange({ ...state, filters });
  }

  function clearFilters() {
    onChange(DEFAULT_LEAD_LIST_STATE);
  }

  return (
    <div className="toolbar">
      <label>
        Search (name or phone)
        <Input
          id="lead_search"
          value={state.search}
          onChange={(e) => onChange({ ...state, search: e.target.value })}
          placeholder="Name or phone..."
        />
      </label>

      <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <input
          type="checkbox"
          checked={state.fuzzy}
          onChange={(e) => onChange({ ...state, fuzzy: e.target.checked })}
        />
        Fuzzy search
      </label>

      <Select
        label="Sort"
        id="lead_sort"
        value={state.sort}
        onChange={(e) => onChange({ ...state, sort: e.target.value })}
      >
        {SORTABLE_COLUMN_OPTIONS.map((col) => (
          <option key={col} value={col}>
            {col}
          </option>
        ))}
      </Select>

      <Select
        label="Funnel"
        id="filter_funnel"
        value={state.filters.funnel_status ?? ''}
        onChange={(e) => setFilter('funnel_status', e.target.value)}
      >
        <option value="">All</option>
        {FUNNEL_STATUSES.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </Select>

      <Select
        label="SLA"
        id="filter_sla"
        value={state.filters.sla_status ?? ''}
        onChange={(e) => setFilter('sla_status', e.target.value)}
      >
        <option value="">All</option>
        <option value="on_time">on_time</option>
        <option value="at_risk">at_risk</option>
        <option value="breached">breached</option>
      </Select>

      <Select
        label="Source"
        id="filter_source"
        value={state.filters.lead_source ?? ''}
        onChange={(e) => setFilter('lead_source', e.target.value)}
      >
        <option value="">All</option>
        {LEAD_SOURCES.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </Select>

      <Select
        label="Stage"
        id="filter_stage"
        value={state.filters.student_stage ?? ''}
        onChange={(e) => setFilter('student_stage', e.target.value)}
      >
        <option value="">All</option>
        {STUDENT_STAGES.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </Select>

      <Select
        label="Persona"
        id="filter_persona"
        value={state.filters.persona_type ?? ''}
        onChange={(e) => setFilter('persona_type', e.target.value)}
      >
        <option value="">All</option>
        {PERSONA_TYPES.map((p) => (
          <option key={p} value={p}>
            {p}
          </option>
        ))}
      </Select>

      <Select
        label="Language"
        id="filter_language"
        value={state.filters.language ?? ''}
        onChange={(e) => setFilter('language', e.target.value)}
      >
        <option value="">All</option>
        {LANGUAGES.map((l) => (
          <option key={l} value={l}>
            {l}
          </option>
        ))}
      </Select>

      <Select
        label="Organic"
        id="filter_organic"
        value={state.filters.is_organic ?? ''}
        onChange={(e) => setFilter('is_organic', e.target.value)}
      >
        <option value="">All</option>
        <option value="true">Yes</option>
        <option value="false">No</option>
      </Select>

      <Input
        label="Min score"
        id="filter_score_min"
        type="number"
        value={state.scoreMin}
        onChange={(e) => onChange({ ...state, scoreMin: e.target.value })}
      />

      <Input
        label="University"
        id="filter_university"
        value={state.filters.university ?? ''}
        onChange={(e) => setFilter('university', e.target.value)}
      />

      <Select
        label="Uni year"
        id="filter_uni_year"
        value={state.filters.uni_year ?? ''}
        onChange={(e) => setFilter('uni_year', e.target.value)}
      >
        <option value="">All</option>
        {UNI_YEARS.map((y) => (
          <option key={y} value={y}>
            {y}
          </option>
        ))}
      </Select>

      <Input
        label="Created from"
        id="created_from"
        type="date"
        value={state.createdFrom}
        onChange={(e) => onChange({ ...state, createdFrom: e.target.value })}
      />
      <Input
        label="Created to"
        id="created_to"
        type="date"
        value={state.createdTo}
        onChange={(e) => onChange({ ...state, createdTo: e.target.value })}
      />
      <Input
        label="SLA deadline from"
        id="sla_from"
        type="date"
        value={state.slaFrom}
        onChange={(e) => onChange({ ...state, slaFrom: e.target.value })}
      />
      <Input
        label="SLA deadline to"
        id="sla_to"
        type="date"
        value={state.slaTo}
        onChange={(e) => onChange({ ...state, slaTo: e.target.value })}
      />

      {isManager && salespeople && (
        <Select
          label="Assignee"
          id="filter_assigned"
          value={state.filters.assigned_to ?? ''}
          onChange={(e) => setFilter('assigned_to', e.target.value)}
        >
          <option value="">All</option>
          {salespeople.map((sp) => (
            <option key={sp.id} value={sp.id}>
              {sp.full_name}
            </option>
          ))}
        </Select>
      )}

      <Button type="button" onClick={onApply}>
        Apply
      </Button>
      <Button type="button" onClick={clearFilters}>
        Clear
      </Button>
    </div>
  );
}
