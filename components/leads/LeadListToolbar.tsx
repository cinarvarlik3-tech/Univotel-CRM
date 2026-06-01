/**
 * Toolbar for lead list filters, search, and sort controls.
 */
import { IconFilter } from '@tabler/icons-react';
import { useState } from 'react';
import {
  DataQualityCheckboxes,
  DormAwaitingCheckboxes,
  ListFilterSection,
  PresenceFilterSelect,
} from '@/components/leads/list-filter-controls';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
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
import {
  DORM_AWAITING_VALUES,
  FUNNEL_STATUSES,
  LANGUAGES,
  LEAD_SOURCES,
  LOSS_REASONS,
  MESSAGE_FROM_VALUES,
  PERSONA_TYPES,
  ROOM_CATEGORY_VALUES,
  SORTABLE_COLUMN_OPTIONS,
  SPECIAL_STATES,
  STUDENT_STAGES,
  UNI_YEARS,
} from '@/lib/constants';
import { formatEnumLabel, formatSortColumn } from '@/lib/i18n/enum-labels';
import {
  DEFAULT_EXTENDED_LIST_FILTER_FIELDS,
  type ExtendedListFilterFields,
} from '@/lib/ui/list-filter-types';
import type { SalespersonOption } from '@/types/domain';

/** Filter state for lead list queries. */
export interface LeadListFilterState extends ExtendedListFilterFields {
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
  ...DEFAULT_EXTENDED_LIST_FILTER_FIELDS,
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
  const { data: properties } = useProperties();
  const { locale, t } = useTranslation();

  function setFilter(field: string, value: string) {
    const filters = { ...state.filters };
    if (value) {
      filters[field] = value;
    } else {
      delete filters[field];
    }
    onChange({ ...state, filters, unassignedOnly: false });
  }

  function setAssignee(value: string) {
    const filters = { ...state.filters };
    delete filters.assigned_to;
    if (value === '__unassigned__') {
      onChange({ ...state, filters, unassignedOnly: true });
      return;
    }
    if (value && value !== 'all') {
      filters.assigned_to = value;
    }
    onChange({ ...state, filters, unassignedOnly: false });
  }

  function clearFilters() {
    onChange(DEFAULT_LEAD_LIST_STATE);
  }

  const assigneeValue = state.unassignedOnly
    ? '__unassigned__'
    : (state.filters.assigned_to ?? 'all');

  return (
    <div className="mb-4 space-y-3">
      <div className="flex flex-wrap items-end gap-3">
        <FormField
          label={t('filters.search')}
          htmlFor="lead_search"
          className="min-w-[200px] flex-1"
        >
          <Input
            id="lead_search"
            value={state.search}
            onChange={(e) => onChange({ ...state, search: e.target.value })}
            placeholder={t('filters.searchNameOrPhoneShort')}
          />
        </FormField>

        <Button type="button" variant="secondary" onClick={() => setShowFilters((v) => !v)}>
          <IconFilter size={16} />
          {t('common.filters')}
        </Button>

        <Button type="button" onClick={onApply}>
          {t('common.apply')}
        </Button>
      </div>

      <CollapsiblePanel open={showFilters}>
        <div className="rounded-[10px] border border-border-default bg-surface-card p-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 pb-2">
              <Checkbox
                id="fuzzy_search"
                checked={state.fuzzy}
                onCheckedChange={(checked) => onChange({ ...state, fuzzy: checked === true })}
              />
              <label htmlFor="fuzzy_search" className="text-xs text-text-secondary">
                {t('filters.fuzzySearch')}
              </label>
            </div>

            <ListFilterSection title={t('filters.sectionPipeline')} defaultOpen>
              <FormField label={t('filters.sort')} htmlFor="lead_sort">
                <Select value={state.sort} onValueChange={(v) => onChange({ ...state, sort: v })}>
                  <SelectTrigger id="lead_sort">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SORTABLE_COLUMN_OPTIONS.map((col) => (
                      <SelectItem key={col} value={col}>
                        {formatSortColumn(locale, col)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>

              <FormField label={t('filters.funnel')} htmlFor="filter_funnel">
                <Select
                  value={state.filters.funnel_status ?? ''}
                  onValueChange={(v) => setFilter('funnel_status', v === 'all' ? '' : v)}
                >
                  <SelectTrigger id="filter_funnel">
                    <SelectValue placeholder={t('common.all')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('common.all')}</SelectItem>
                    {FUNNEL_STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {formatEnumLabel(locale, 'funnel', s)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>

              <FormField label={t('filters.sla')} htmlFor="filter_sla">
                <Select
                  value={state.filters.sla_status ?? ''}
                  onValueChange={(v) => setFilter('sla_status', v === 'all' ? '' : v)}
                >
                  <SelectTrigger id="filter_sla">
                    <SelectValue placeholder={t('common.all')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('common.all')}</SelectItem>
                    <SelectItem value="on_time">
                      {formatEnumLabel(locale, 'sla', 'on_time')}
                    </SelectItem>
                    <SelectItem value="breached">
                      {formatEnumLabel(locale, 'sla', 'breached')}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </FormField>

              <FormField label={t('filters.source')} htmlFor="filter_source">
                <Select
                  value={state.filters.lead_source ?? ''}
                  onValueChange={(v) => setFilter('lead_source', v === 'all' ? '' : v)}
                >
                  <SelectTrigger id="filter_source">
                    <SelectValue placeholder={t('common.all')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('common.all')}</SelectItem>
                    {LEAD_SOURCES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {formatEnumLabel(locale, 'source', s)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>

              <FormField label={t('filters.channel')} htmlFor="filter_channel">
                <Select
                  value={state.filters.message_from ?? ''}
                  onValueChange={(v) => setFilter('message_from', v === 'all' ? '' : v)}
                >
                  <SelectTrigger id="filter_channel">
                    <SelectValue placeholder={t('common.all')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('common.all')}</SelectItem>
                    {MESSAGE_FROM_VALUES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {formatEnumLabel(locale, 'channel', s)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>

              <FormField label={t('filters.stage')} htmlFor="filter_stage">
                <Select
                  value={state.filters.student_stage ?? ''}
                  onValueChange={(v) => setFilter('student_stage', v === 'all' ? '' : v)}
                >
                  <SelectTrigger id="filter_stage">
                    <SelectValue placeholder={t('common.all')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('common.all')}</SelectItem>
                    {STUDENT_STAGES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {formatEnumLabel(locale, 'stage', s)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>

              <FormField label={t('filters.specialState')} htmlFor="filter_special_state">
                <Select
                  value={state.filters.special_state ?? ''}
                  onValueChange={(v) => setFilter('special_state', v === 'all' ? '' : v)}
                >
                  <SelectTrigger id="filter_special_state">
                    <SelectValue placeholder={t('common.all')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('common.all')}</SelectItem>
                    {SPECIAL_STATES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {formatEnumLabel(locale, 'special', s)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>

              <FormField label={t('filters.lossReason')} htmlFor="filter_loss_reason">
                <Select
                  value={state.filters.loss_reason ?? ''}
                  onValueChange={(v) => setFilter('loss_reason', v === 'all' ? '' : v)}
                >
                  <SelectTrigger id="filter_loss_reason">
                    <SelectValue placeholder={t('common.all')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('common.all')}</SelectItem>
                    {LOSS_REASONS.map((s) => (
                      <SelectItem key={s} value={s}>
                        {formatEnumLabel(locale, 'loss', s)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>

              <FormField label={t('filters.persona')} htmlFor="filter_persona">
                <Select
                  value={state.filters.persona_type ?? ''}
                  onValueChange={(v) => setFilter('persona_type', v === 'all' ? '' : v)}
                >
                  <SelectTrigger id="filter_persona">
                    <SelectValue placeholder={t('common.all')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('common.all')}</SelectItem>
                    {PERSONA_TYPES.map((p) => (
                      <SelectItem key={p} value={p}>
                        {formatEnumLabel(locale, 'persona', p)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>

              <FormField label={t('filters.language')} htmlFor="filter_language">
                <Select
                  value={state.filters.language ?? ''}
                  onValueChange={(v) => setFilter('language', v === 'all' ? '' : v)}
                >
                  <SelectTrigger id="filter_language">
                    <SelectValue placeholder={t('common.all')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('common.all')}</SelectItem>
                    {LANGUAGES.map((l) => (
                      <SelectItem key={l} value={l}>
                        {formatEnumLabel(locale, 'language', l)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>

              <FormField label={t('filters.organic')} htmlFor="filter_organic">
                <Select
                  value={state.filters.is_organic ?? ''}
                  onValueChange={(v) => setFilter('is_organic', v === 'all' ? '' : v)}
                >
                  <SelectTrigger id="filter_organic">
                    <SelectValue placeholder={t('common.all')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('common.all')}</SelectItem>
                    <SelectItem value="true">{t('common.yes')}</SelectItem>
                    <SelectItem value="false">{t('common.no')}</SelectItem>
                  </SelectContent>
                </Select>
              </FormField>

              <FormField label={t('filters.minScore')} htmlFor="filter_score_min">
                <Input
                  id="filter_score_min"
                  type="number"
                  value={state.scoreMin}
                  onChange={(e) => onChange({ ...state, scoreMin: e.target.value })}
                />
              </FormField>
            </ListFilterSection>

            <ListFilterSection title={t('filters.sectionAssignmentDates')}>
              {isManager && salespeople && (
                <FormField label={t('filters.assignee')} htmlFor="filter_assigned">
                  <Select value={assigneeValue} onValueChange={setAssignee}>
                    <SelectTrigger id="filter_assigned">
                      <SelectValue placeholder={t('common.all')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t('common.all')}</SelectItem>
                      <SelectItem value="__unassigned__">{t('common.unassigned')}</SelectItem>
                      {salespeople.map((sp) => (
                        <SelectItem key={sp.id} value={sp.id}>
                          {sp.full_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormField>
              )}

              <FormField label={t('filters.createdFrom')} htmlFor="created_from">
                <Input
                  id="created_from"
                  type="date"
                  value={state.createdFrom}
                  onChange={(e) => onChange({ ...state, createdFrom: e.target.value })}
                />
              </FormField>

              <FormField label={t('filters.createdTo')} htmlFor="created_to">
                <Input
                  id="created_to"
                  type="date"
                  value={state.createdTo}
                  onChange={(e) => onChange({ ...state, createdTo: e.target.value })}
                />
              </FormField>

              <FormField label={t('filters.lastContactFrom')} htmlFor="last_contact_from">
                <Input
                  id="last_contact_from"
                  type="date"
                  value={state.lastContactFrom}
                  onChange={(e) => onChange({ ...state, lastContactFrom: e.target.value })}
                />
              </FormField>

              <FormField label={t('filters.lastContactTo')} htmlFor="last_contact_to">
                <Input
                  id="last_contact_to"
                  type="date"
                  value={state.lastContactTo}
                  onChange={(e) => onChange({ ...state, lastContactTo: e.target.value })}
                />
              </FormField>

              <FormField label={t('filters.slaFrom')} htmlFor="sla_from">
                <Input
                  id="sla_from"
                  type="date"
                  value={state.slaFrom}
                  onChange={(e) => onChange({ ...state, slaFrom: e.target.value })}
                />
              </FormField>

              <FormField label={t('filters.slaTo')} htmlFor="sla_to">
                <Input
                  id="sla_to"
                  type="date"
                  value={state.slaTo}
                  onChange={(e) => onChange({ ...state, slaTo: e.target.value })}
                />
              </FormField>

              <FormField label={t('filters.moveInFrom')} htmlFor="move_in_from">
                <Input
                  id="move_in_from"
                  type="date"
                  value={state.moveInFrom}
                  onChange={(e) => onChange({ ...state, moveInFrom: e.target.value })}
                />
              </FormField>

              <FormField label={t('filters.moveInTo')} htmlFor="move_in_to">
                <Input
                  id="move_in_to"
                  type="date"
                  value={state.moveInTo}
                  onChange={(e) => onChange({ ...state, moveInTo: e.target.value })}
                />
              </FormField>
            </ListFilterSection>

            <ListFilterSection title={t('filters.sectionStudentProfile')}>
              <FormField label={t('filters.university')} htmlFor="filter_university">
                <Input
                  id="filter_university"
                  value={state.filters.university ?? ''}
                  onChange={(e) => setFilter('university', e.target.value)}
                  placeholder={t('filters.partialMatch')}
                />
              </FormField>

              <FormField label={t('filters.uniYear')} htmlFor="filter_uni_year">
                <Select
                  value={state.filters.uni_year ?? ''}
                  onValueChange={(v) => setFilter('uni_year', v === 'all' ? '' : v)}
                >
                  <SelectTrigger id="filter_uni_year">
                    <SelectValue placeholder={t('common.all')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('common.all')}</SelectItem>
                    {UNI_YEARS.map((y) => (
                      <SelectItem key={y} value={y}>
                        {formatEnumLabel(locale, 'uniYear', y)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>

              <FormField label={t('filters.gender')} htmlFor="filter_gender">
                <Select
                  value={state.filters.student_gender ?? ''}
                  onValueChange={(v) => setFilter('student_gender', v === 'all' ? '' : v)}
                >
                  <SelectTrigger id="filter_gender">
                    <SelectValue placeholder={t('common.all')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('common.all')}</SelectItem>
                    <SelectItem value="male">
                      {formatEnumLabel(locale, 'gender', 'male')}
                    </SelectItem>
                    <SelectItem value="female">
                      {formatEnumLabel(locale, 'gender', 'female')}
                    </SelectItem>
                    <SelectItem value="other">
                      {formatEnumLabel(locale, 'gender', 'other')}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </FormField>

              <FormField label={t('filters.nationality')} htmlFor="filter_nationality">
                <Input
                  id="filter_nationality"
                  value={state.nationality}
                  onChange={(e) => onChange({ ...state, nationality: e.target.value })}
                />
              </FormField>

              <DormAwaitingCheckboxes
                idPrefix="lead"
                values={DORM_AWAITING_VALUES}
                selected={state.dormAwaiting}
                onChange={(dormAwaiting) => onChange({ ...state, dormAwaiting })}
              />
            </ListFilterSection>

            <ListFilterSection title={t('filters.sectionHousingIntent')}>
              <FormField label={t('filters.budgetMin')} htmlFor="filter_budget_min">
                <Input
                  id="filter_budget_min"
                  type="number"
                  value={state.budgetMin}
                  onChange={(e) => onChange({ ...state, budgetMin: e.target.value })}
                />
              </FormField>

              <FormField label={t('filters.budgetMax')} htmlFor="filter_budget_max">
                <Input
                  id="filter_budget_max"
                  type="number"
                  value={state.budgetMax}
                  onChange={(e) => onChange({ ...state, budgetMax: e.target.value })}
                />
              </FormField>

              <FormField label={t('filters.preferredDistrict')} htmlFor="filter_preferred_district">
                <Input
                  id="filter_preferred_district"
                  value={state.preferredDistrict}
                  onChange={(e) => onChange({ ...state, preferredDistrict: e.target.value })}
                />
              </FormField>

              <FormField label={t('filters.campus')} htmlFor="filter_campus">
                <Input
                  id="filter_campus"
                  value={state.campus}
                  onChange={(e) => onChange({ ...state, campus: e.target.value })}
                />
              </FormField>

              <FormField label={t('filters.roomCategory')} htmlFor="filter_room_category">
                <Select
                  value={state.roomCategory || 'all'}
                  onValueChange={(v) => onChange({ ...state, roomCategory: v === 'all' ? '' : v })}
                >
                  <SelectTrigger id="filter_room_category">
                    <SelectValue placeholder={t('common.all')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('common.all')}</SelectItem>
                    {ROOM_CATEGORY_VALUES.map((v) => (
                      <SelectItem key={v} value={v}>
                        {formatEnumLabel(locale, 'room', v)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>

              <FormField
                label={t('filters.districtPreference')}
                htmlFor="filter_district_preference"
              >
                <Input
                  id="filter_district_preference"
                  value={state.districtPreference}
                  onChange={(e) => onChange({ ...state, districtPreference: e.target.value })}
                />
              </FormField>

              <FormField label={t('filters.interestedHotel')} htmlFor="filter_interested_hotel">
                <Select
                  value={state.interestedHotel || 'all'}
                  onValueChange={(v) =>
                    onChange({ ...state, interestedHotel: v === 'all' ? '' : v })
                  }
                >
                  <SelectTrigger id="filter_interested_hotel">
                    <SelectValue placeholder={t('common.all')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('common.all')}</SelectItem>
                    {(properties ?? []).map((p) => (
                      <SelectItem key={p.id} value={p.hotel_name}>
                        {p.hotel_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>

              <FormField label={t('filters.roomType')} htmlFor="filter_room_type">
                <Input
                  id="filter_room_type"
                  value={state.roomType}
                  onChange={(e) => onChange({ ...state, roomType: e.target.value })}
                  placeholder={t('filters.exactArrayValue')}
                />
              </FormField>

              <PresenceFilterSelect
                id="filter_has_rec_hotel"
                label={t('filters.hasHotelRec')}
                value={state.hasRecHotel}
                onChange={(hasRecHotel) => onChange({ ...state, hasRecHotel })}
              />
            </ListFilterSection>

            <ListFilterSection title={t('filters.sectionComplianceContacts')}>
              <FormField label={t('filters.kvkkOptIn')} htmlFor="filter_kvkk">
                <Select
                  value={state.filters.kvkk_opt_in ?? ''}
                  onValueChange={(v) => setFilter('kvkk_opt_in', v === 'all' ? '' : v)}
                >
                  <SelectTrigger id="filter_kvkk">
                    <SelectValue placeholder={t('common.all')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('common.all')}</SelectItem>
                    <SelectItem value="true">{t('common.yes')}</SelectItem>
                    <SelectItem value="false">{t('common.no')}</SelectItem>
                  </SelectContent>
                </Select>
              </FormField>

              <FormField label={t('filters.marketingOptIn')} htmlFor="filter_marketing">
                <Select
                  value={state.filters.marketing_opt_in ?? ''}
                  onValueChange={(v) => setFilter('marketing_opt_in', v === 'all' ? '' : v)}
                >
                  <SelectTrigger id="filter_marketing">
                    <SelectValue placeholder={t('common.all')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('common.all')}</SelectItem>
                    <SelectItem value="true">{t('common.yes')}</SelectItem>
                    <SelectItem value="false">{t('common.no')}</SelectItem>
                  </SelectContent>
                </Select>
              </FormField>

              <PresenceFilterSelect
                id="filter_has_parent_phone"
                label={t('filters.hasParentPhone')}
                value={state.hasParentPhone}
                onChange={(hasParentPhone) => onChange({ ...state, hasParentPhone })}
              />

              <PresenceFilterSelect
                id="filter_has_parent_name"
                label={t('filters.hasParentName')}
                value={state.hasParentName}
                onChange={(hasParentName) => onChange({ ...state, hasParentName })}
              />

              <DataQualityCheckboxes
                idPrefix="lead"
                missingUniversity={state.missingUniversity}
                missingGender={state.missingGender}
                missingBudget={state.missingBudget}
                onChange={(patch) => onChange({ ...state, ...patch })}
              />
            </ListFilterSection>
          </div>

          <div className="mt-3 flex gap-2">
            <Button type="button" variant="secondary" onClick={clearFilters}>
              {t('common.clearAll')}
            </Button>
          </div>
        </div>
      </CollapsiblePanel>
    </div>
  );
}
