/**
 * Visual audience builder for campaigns (no JSON).
 */
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { FormSelect } from '@/components/ui/form-select';
import { Input } from '@/components/ui/input';
import {
  DEFAULT_CAMPAIGN_AUDIENCE,
  type CampaignAudienceState,
} from '@/lib/campaigns/campaign-form-ui';
import {
  FUNNEL_STATUSES,
  LANGUAGES,
  LEAD_SOURCES,
  PERSONA_TYPES,
  STUDENT_STAGES,
  UNI_YEARS,
} from '@/lib/constants';
import type { SalespersonOption } from '@/types/domain';

interface CampaignAudienceFiltersProps {
  state: CampaignAudienceState;
  onChange: (state: CampaignAudienceState) => void;
  salespeople?: SalespersonOption[];
  previewCount: number | null;
  previewLoading: boolean;
  onPreview: () => void;
}

/**
 * Renders dropdown and date filters that define which leads receive the campaign.
 */
export function CampaignAudienceFilters({
  state,
  onChange,
  salespeople,
  previewCount,
  previewLoading,
  onPreview,
}: CampaignAudienceFiltersProps) {
  function setFilter(field: string, value: string) {
    const filters = { ...state.filters };
    if (value) {
      filters[field] = value;
    } else {
      delete filters[field];
    }
    onChange({ ...state, filters });
  }

  function clearAudience() {
    onChange(DEFAULT_CAMPAIGN_AUDIENCE);
  }

  return (
    <fieldset className="space-y-4 rounded-lg border border-border-default p-4">
      <legend className="px-1 text-sm font-medium text-text-primary">
        Audience — who receives this campaign
      </legend>
      <p className="text-xs text-text-secondary">
        Only leads matching all selected filters are included. Leave a filter on &quot;All&quot; to
        ignore it.
      </p>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
        <FormSelect
          label="Funnel status"
          id="campaign_funnel"
          value={state.filters.funnel_status ?? 'all'}
          onValueChange={(v) => setFilter('funnel_status', v === 'all' ? '' : v)}
          options={[
            { value: 'all', label: 'All' },
            ...FUNNEL_STATUSES.map((s) => ({ value: s, label: s })),
          ]}
        />

        <FormSelect
          label="Student stage"
          id="campaign_stage"
          value={state.filters.student_stage ?? 'all'}
          onValueChange={(v) => setFilter('student_stage', v === 'all' ? '' : v)}
          options={[
            { value: 'all', label: 'All' },
            ...STUDENT_STAGES.map((s) => ({ value: s, label: s })),
          ]}
        />

        <FormSelect
          label="Lead source"
          id="campaign_source"
          value={state.filters.lead_source ?? 'all'}
          onValueChange={(v) => setFilter('lead_source', v === 'all' ? '' : v)}
          options={[
            { value: 'all', label: 'All' },
            ...LEAD_SOURCES.map((s) => ({ value: s, label: s })),
          ]}
        />

        <FormSelect
          label="SLA status"
          id="campaign_sla"
          value={state.filters.sla_status ?? 'all'}
          onValueChange={(v) => setFilter('sla_status', v === 'all' ? '' : v)}
          options={[
            { value: 'all', label: 'All' },
            { value: 'on_time', label: 'On time' },
            { value: 'at_risk', label: 'At risk' },
            { value: 'breached', label: 'Breached' },
          ]}
        />

        <FormSelect
          label="Persona"
          id="campaign_persona"
          value={state.filters.persona_type ?? 'all'}
          onValueChange={(v) => setFilter('persona_type', v === 'all' ? '' : v)}
          options={[
            { value: 'all', label: 'All' },
            ...PERSONA_TYPES.map((p) => ({ value: p, label: p })),
          ]}
        />

        <FormSelect
          label="Lead language"
          id="campaign_lead_lang"
          value={state.filters.language ?? 'all'}
          onValueChange={(v) => setFilter('language', v === 'all' ? '' : v)}
          options={[
            { value: 'all', label: 'All' },
            ...LANGUAGES.map((l) => ({ value: l, label: l })),
          ]}
        />

        <FormSelect
          label="Organic"
          id="campaign_organic"
          value={state.filters.is_organic ?? 'all'}
          onValueChange={(v) => setFilter('is_organic', v === 'all' ? '' : v)}
          options={[
            { value: 'all', label: 'All' },
            { value: 'true', label: 'Yes' },
            { value: 'false', label: 'No' },
          ]}
        />

        <FormSelect
          label="University year"
          id="campaign_uni_year"
          value={state.filters.uni_year ?? 'all'}
          onValueChange={(v) => setFilter('uni_year', v === 'all' ? '' : v)}
          options={[
            { value: 'all', label: 'All' },
            ...UNI_YEARS.map((y) => ({ value: y, label: y })),
          ]}
        />

        {salespeople && salespeople.length > 0 && (
          <FormSelect
            label="Assigned to"
            id="campaign_assignee"
            value={state.filters.assigned_to ?? 'all'}
            onValueChange={(v) => setFilter('assigned_to', v === 'all' ? '' : v)}
            options={[
              { value: 'all', label: 'All' },
              ...salespeople.map((sp) => ({ value: sp.id, label: sp.full_name })),
            ]}
          />
        )}

        <FormField label="University (exact match)" htmlFor="campaign_university">
          <Input
            id="campaign_university"
            value={state.filters.university ?? ''}
            onChange={(e) => setFilter('university', e.target.value)}
          />
        </FormField>

        <FormField label="Minimum lead score" htmlFor="campaign_score_min">
          <Input
            id="campaign_score_min"
            type="number"
            min={0}
            max={100}
            value={state.scoreMin}
            onChange={(e) => onChange({ ...state, scoreMin: e.target.value })}
          />
        </FormField>

        <FormField label="Created from" htmlFor="campaign_created_from">
          <Input
            id="campaign_created_from"
            type="date"
            value={state.createdFrom}
            onChange={(e) => onChange({ ...state, createdFrom: e.target.value })}
          />
        </FormField>
        <FormField label="Created to" htmlFor="campaign_created_to">
          <Input
            id="campaign_created_to"
            type="date"
            value={state.createdTo}
            onChange={(e) => onChange({ ...state, createdTo: e.target.value })}
          />
        </FormField>
        <FormField label="SLA deadline from" htmlFor="campaign_sla_from">
          <Input
            id="campaign_sla_from"
            type="date"
            value={state.slaFrom}
            onChange={(e) => onChange({ ...state, slaFrom: e.target.value })}
          />
        </FormField>
        <FormField label="SLA deadline to" htmlFor="campaign_sla_to">
          <Input
            id="campaign_sla_to"
            type="date"
            value={state.slaTo}
            onChange={(e) => onChange({ ...state, slaTo: e.target.value })}
          />
        </FormField>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" onClick={onPreview} disabled={previewLoading}>
          {previewLoading ? 'Counting…' : 'Preview audience size'}
        </Button>
        <Button type="button" variant="secondary" onClick={clearAudience}>
          Reset filters
        </Button>
        {previewCount !== null && (
          <span className="text-sm text-text-secondary">
            <strong className="text-text-primary">{previewCount}</strong> lead
            {previewCount === 1 ? '' : 's'} match
          </span>
        )}
      </div>
    </fieldset>
  );
}
