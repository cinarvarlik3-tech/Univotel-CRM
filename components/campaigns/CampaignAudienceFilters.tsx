/**
 * Visual audience builder for campaigns (no JSON).
 */
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { FormSelect } from '@/components/ui/form-select';
import { Input } from '@/components/ui/input';
import { useTranslation } from '@/hooks/useTranslation';
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
import { formatEnumLabel, formatNumber } from '@/lib/i18n';
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
  const { locale, t } = useTranslation();

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

  const allOption = { value: 'all', label: t('common.all') };

  return (
    <fieldset className="space-y-4 rounded-lg border border-border-default p-4">
      <legend className="px-1 text-sm font-medium text-text-primary">
        {t('campaigns.audienceLegend')}
      </legend>
      <p className="text-xs text-text-secondary">{t('campaigns.audienceHelp')}</p>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
        <FormSelect
          label={t('campaigns.funnelStatus')}
          id="campaign_funnel"
          value={state.filters.funnel_status ?? 'all'}
          onValueChange={(v) => setFilter('funnel_status', v === 'all' ? '' : v)}
          options={[
            allOption,
            ...FUNNEL_STATUSES.map((s) => ({
              value: s,
              label: formatEnumLabel(locale, 'funnel', s),
            })),
          ]}
        />

        <FormSelect
          label={t('campaigns.studentStage')}
          id="campaign_stage"
          value={state.filters.student_stage ?? 'all'}
          onValueChange={(v) => setFilter('student_stage', v === 'all' ? '' : v)}
          options={[
            allOption,
            ...STUDENT_STAGES.map((s) => ({
              value: s,
              label: formatEnumLabel(locale, 'stage', s),
            })),
          ]}
        />

        <FormSelect
          label={t('campaigns.leadSource')}
          id="campaign_source"
          value={state.filters.lead_source ?? 'all'}
          onValueChange={(v) => setFilter('lead_source', v === 'all' ? '' : v)}
          options={[
            allOption,
            ...LEAD_SOURCES.map((s) => ({
              value: s,
              label: formatEnumLabel(locale, 'source', s),
            })),
          ]}
        />

        <FormSelect
          label={t('campaigns.slaStatus')}
          id="campaign_sla"
          value={state.filters.sla_status ?? 'all'}
          onValueChange={(v) => setFilter('sla_status', v === 'all' ? '' : v)}
          options={[
            allOption,
            { value: 'on_time', label: formatEnumLabel(locale, 'sla', 'on_time') },
            { value: 'breached', label: formatEnumLabel(locale, 'sla', 'breached') },
          ]}
        />

        <FormSelect
          label={t('filters.persona')}
          id="campaign_persona"
          value={state.filters.persona_type ?? 'all'}
          onValueChange={(v) => setFilter('persona_type', v === 'all' ? '' : v)}
          options={[
            allOption,
            ...PERSONA_TYPES.map((p) => ({
              value: p,
              label: formatEnumLabel(locale, 'persona', p),
            })),
          ]}
        />

        <FormSelect
          label={t('campaigns.leadLanguage')}
          id="campaign_lead_lang"
          value={state.filters.language ?? 'all'}
          onValueChange={(v) => setFilter('language', v === 'all' ? '' : v)}
          options={[
            allOption,
            ...LANGUAGES.map((l) => ({
              value: l,
              label: formatEnumLabel(locale, 'language', l),
            })),
          ]}
        />

        <FormSelect
          label={t('filters.organic')}
          id="campaign_organic"
          value={state.filters.is_organic ?? 'all'}
          onValueChange={(v) => setFilter('is_organic', v === 'all' ? '' : v)}
          options={[
            allOption,
            { value: 'true', label: t('common.yes') },
            { value: 'false', label: t('common.no') },
          ]}
        />

        <FormSelect
          label={t('campaigns.universityYear')}
          id="campaign_uni_year"
          value={state.filters.uni_year ?? 'all'}
          onValueChange={(v) => setFilter('uni_year', v === 'all' ? '' : v)}
          options={[
            allOption,
            ...UNI_YEARS.map((y) => ({
              value: y,
              label: formatEnumLabel(locale, 'uniYear', y),
            })),
          ]}
        />

        {salespeople && salespeople.length > 0 && (
          <FormSelect
            label={t('filters.assignee')}
            id="campaign_assignee"
            value={state.filters.assigned_to ?? 'all'}
            onValueChange={(v) => setFilter('assigned_to', v === 'all' ? '' : v)}
            options={[
              allOption,
              ...salespeople.map((sp) => ({ value: sp.id, label: sp.full_name })),
            ]}
          />
        )}

        <FormField label={t('campaigns.universityExact')} htmlFor="campaign_university">
          <Input
            id="campaign_university"
            value={state.filters.university ?? ''}
            onChange={(e) => setFilter('university', e.target.value)}
          />
        </FormField>

        <FormField label={t('campaigns.minimumLeadScore')} htmlFor="campaign_score_min">
          <Input
            id="campaign_score_min"
            type="number"
            min={0}
            max={100}
            value={state.scoreMin}
            onChange={(e) => onChange({ ...state, scoreMin: e.target.value })}
          />
        </FormField>

        <FormField label={t('filters.createdFrom')} htmlFor="campaign_created_from">
          <Input
            id="campaign_created_from"
            type="date"
            value={state.createdFrom}
            onChange={(e) => onChange({ ...state, createdFrom: e.target.value })}
          />
        </FormField>
        <FormField label={t('filters.createdTo')} htmlFor="campaign_created_to">
          <Input
            id="campaign_created_to"
            type="date"
            value={state.createdTo}
            onChange={(e) => onChange({ ...state, createdTo: e.target.value })}
          />
        </FormField>
        <FormField label={t('campaigns.slaDeadlineFrom')} htmlFor="campaign_sla_from">
          <Input
            id="campaign_sla_from"
            type="date"
            value={state.slaFrom}
            onChange={(e) => onChange({ ...state, slaFrom: e.target.value })}
          />
        </FormField>
        <FormField label={t('campaigns.slaDeadlineTo')} htmlFor="campaign_sla_to">
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
          {previewLoading ? t('common.counting') : t('campaigns.previewAudience')}
        </Button>
        <Button type="button" variant="secondary" onClick={clearAudience}>
          {t('campaigns.resetFilters')}
        </Button>
        {previewCount !== null && (
          <span className="text-sm text-text-secondary">
            <strong className="text-text-primary">{formatNumber(previewCount, locale)}</strong>{' '}
            {previewCount === 1
              ? t('common.leadMatch', { count: previewCount })
              : t('common.leadsMatch', { count: previewCount })}
          </span>
        )}
      </div>
    </fieldset>
  );
}
