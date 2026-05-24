/**
 * Toolbar for lead list filters, search, and sort controls.
 */
import { IconFilter } from '@tabler/icons-react';
import { Button } from '@/components/ui/button';
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
import { useState } from 'react';

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
  const [showFilters, setShowFilters] = useState(false);

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
    <div className="mb-4 space-y-3">
      <div className="flex flex-wrap items-end gap-3">
        <FormField label="Search" htmlFor="lead_search" className="min-w-[200px] flex-1">
          <Input
            id="lead_search"
            value={state.search}
            onChange={(e) => onChange({ ...state, search: e.target.value })}
            placeholder="Name or phone..."
          />
        </FormField>

        <Button type="button" variant="secondary" onClick={() => setShowFilters((v) => !v)}>
          <IconFilter size={16} />
          Filters
        </Button>

        <Button type="button" onClick={onApply}>
          Apply
        </Button>
      </div>

      {showFilters && (
        <div className="rounded-[10px] border border-border-default bg-surface-card p-4">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            <div className="col-span-full flex items-center gap-2">
              <Checkbox
                id="fuzzy_search"
                checked={state.fuzzy}
                onCheckedChange={(checked) => onChange({ ...state, fuzzy: checked === true })}
              />
              <label htmlFor="fuzzy_search" className="text-xs text-text-secondary">
                Fuzzy search
              </label>
            </div>

            <FormField label="Sort" htmlFor="lead_sort">
              <Select value={state.sort} onValueChange={(v) => onChange({ ...state, sort: v })}>
                <SelectTrigger id="lead_sort">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SORTABLE_COLUMN_OPTIONS.map((col) => (
                    <SelectItem key={col} value={col}>
                      {col}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>

            <FormField label="Funnel" htmlFor="filter_funnel">
              <Select
                value={state.filters.funnel_status ?? ''}
                onValueChange={(v) => setFilter('funnel_status', v === 'all' ? '' : v)}
              >
                <SelectTrigger id="filter_funnel">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {FUNNEL_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>

            <FormField label="SLA" htmlFor="filter_sla">
              <Select
                value={state.filters.sla_status ?? ''}
                onValueChange={(v) => setFilter('sla_status', v === 'all' ? '' : v)}
              >
                <SelectTrigger id="filter_sla">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="on_time">on_time</SelectItem>
                  <SelectItem value="at_risk">at_risk</SelectItem>
                  <SelectItem value="breached">breached</SelectItem>
                </SelectContent>
              </Select>
            </FormField>

            <FormField label="Source" htmlFor="filter_source">
              <Select
                value={state.filters.lead_source ?? ''}
                onValueChange={(v) => setFilter('lead_source', v === 'all' ? '' : v)}
              >
                <SelectTrigger id="filter_source">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {LEAD_SOURCES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>

            <FormField label="Stage" htmlFor="filter_stage">
              <Select
                value={state.filters.student_stage ?? ''}
                onValueChange={(v) => setFilter('student_stage', v === 'all' ? '' : v)}
              >
                <SelectTrigger id="filter_stage">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {STUDENT_STAGES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>

            <FormField label="Persona" htmlFor="filter_persona">
              <Select
                value={state.filters.persona_type ?? ''}
                onValueChange={(v) => setFilter('persona_type', v === 'all' ? '' : v)}
              >
                <SelectTrigger id="filter_persona">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {PERSONA_TYPES.map((p) => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>

            <FormField label="Language" htmlFor="filter_language">
              <Select
                value={state.filters.language ?? ''}
                onValueChange={(v) => setFilter('language', v === 'all' ? '' : v)}
              >
                <SelectTrigger id="filter_language">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {LANGUAGES.map((l) => (
                    <SelectItem key={l} value={l}>
                      {l}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>

            <FormField label="Organic" htmlFor="filter_organic">
              <Select
                value={state.filters.is_organic ?? ''}
                onValueChange={(v) => setFilter('is_organic', v === 'all' ? '' : v)}
              >
                <SelectTrigger id="filter_organic">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="true">Yes</SelectItem>
                  <SelectItem value="false">No</SelectItem>
                </SelectContent>
              </Select>
            </FormField>

            <FormField label="Min score" htmlFor="filter_score_min">
              <Input
                id="filter_score_min"
                type="number"
                value={state.scoreMin}
                onChange={(e) => onChange({ ...state, scoreMin: e.target.value })}
              />
            </FormField>

            <FormField label="University" htmlFor="filter_university">
              <Input
                id="filter_university"
                value={state.filters.university ?? ''}
                onChange={(e) => setFilter('university', e.target.value)}
              />
            </FormField>

            <FormField label="Uni year" htmlFor="filter_uni_year">
              <Select
                value={state.filters.uni_year ?? ''}
                onValueChange={(v) => setFilter('uni_year', v === 'all' ? '' : v)}
              >
                <SelectTrigger id="filter_uni_year">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {UNI_YEARS.map((y) => (
                    <SelectItem key={y} value={y}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>

            <FormField label="Created from" htmlFor="created_from">
              <Input
                id="created_from"
                type="date"
                value={state.createdFrom}
                onChange={(e) => onChange({ ...state, createdFrom: e.target.value })}
              />
            </FormField>

            <FormField label="Created to" htmlFor="created_to">
              <Input
                id="created_to"
                type="date"
                value={state.createdTo}
                onChange={(e) => onChange({ ...state, createdTo: e.target.value })}
              />
            </FormField>

            <FormField label="SLA from" htmlFor="sla_from">
              <Input
                id="sla_from"
                type="date"
                value={state.slaFrom}
                onChange={(e) => onChange({ ...state, slaFrom: e.target.value })}
              />
            </FormField>

            <FormField label="SLA to" htmlFor="sla_to">
              <Input
                id="sla_to"
                type="date"
                value={state.slaTo}
                onChange={(e) => onChange({ ...state, slaTo: e.target.value })}
              />
            </FormField>

            {isManager && salespeople && (
              <FormField label="Assignee" htmlFor="filter_assigned">
                <Select
                  value={state.filters.assigned_to ?? ''}
                  onValueChange={(v) => setFilter('assigned_to', v === 'all' ? '' : v)}
                >
                  <SelectTrigger id="filter_assigned">
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    {salespeople.map((sp) => (
                      <SelectItem key={sp.id} value={sp.id}>
                        {sp.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>
            )}
          </div>

          <div className="mt-3 flex gap-2">
            <Button type="button" variant="secondary" onClick={clearFilters}>
              Clear all
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
