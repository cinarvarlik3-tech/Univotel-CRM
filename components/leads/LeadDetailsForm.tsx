/**
 * Form for editing lead_details profile fields via PATCH /api/lead-details.
 */
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { FormField } from '@/components/ui/form-field';
import { FormSelect } from '@/components/ui/form-select';
import { Input } from '@/components/ui/input';
import { UniversityCombobox } from '@/components/ui/university-combobox';
import { useTranslation } from '@/hooks/useTranslation';
import { useUniversities } from '@/hooks/useUniversities';
import { formatEnumLabel } from '@/lib/i18n/enum-labels';
import { BUDGET_TIERS, DORM_AWAITING_VALUES, UNI_YEARS } from '@/lib/constants';
import { lookupSchoolShortname } from '@/lib/leads/lookup-school-shortname';
import { useProperties } from '@/hooks/useProperties';
import type { LeadDetailRow } from '@/types/domain';

interface LeadDetailsFormProps {
  leadId: string;
  details: LeadDetailRow | null;
  onSaved: () => void;
  embedded?: boolean;
}

const GENDER_VALUES = ['male', 'female', 'other'] as const;
const ROOM_CATEGORIES = ['single', 'double', 'triple', 'quad'] as const;

/**
 * Renders lead_details edit form for API-supported fields.
 * @param props - Lead UUID and current details row.
 * @returns Lead details form card.
 */
export function LeadDetailsForm({ leadId, details, onSaved, embedded }: LeadDetailsFormProps) {
  const { locale, t } = useTranslation();
  const { data: properties } = useProperties();
  const { data: universities = [], isLoading: universitiesLoading } = useUniversities();
  const d = details;

  const [university, setUniversity] = useState(d?.university ?? '');
  const [budgetTier, setBudgetTier] = useState(d?.budget_tier ?? '');
  const [moveIn, setMoveIn] = useState(d?.move_in?.slice(0, 10) ?? '');
  const [uniYear, setUniYear] = useState(d?.uni_year ?? '');
  const [parentName, setParentName] = useState(d?.parent_name ?? '');
  const [preferredDistrict, setPreferredDistrict] = useState(d?.preferred_district ?? '');
  const [studentGender, setStudentGender] = useState(d?.student_gender ?? '');
  const [nationality, setNationality] = useState(d?.nationality ?? '');
  const [interestedHotels, setInterestedHotels] = useState<string[]>(d?.interested_hotel ?? []);
  const [roomTypes, setRoomTypes] = useState((d?.room_type ?? []).join(', '));
  const [dormAwaiting, setDormAwaiting] = useState<string[]>(d?.dorm_awaiting ?? []);
  const [kvkkOptIn, setKvkkOptIn] = useState(d?.kvkk_opt_in ?? false);
  const [marketingOptIn, setMarketingOptIn] = useState(d?.marketing_opt_in ?? false);
  const [campus, setCampus] = useState(d?.campus ?? '');
  const [roomCategory, setRoomCategory] = useState(d?.room_category ?? '');
  const [districtPreference, setDistrictPreference] = useState(d?.district_preference ?? '');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!details) return;
    setUniversity(details.university ?? '');
    setBudgetTier(details.budget_tier ?? '');
    setMoveIn(details.move_in?.slice(0, 10) ?? '');
    setUniYear(details.uni_year ?? '');
    setParentName(details.parent_name ?? '');
    setPreferredDistrict(details.preferred_district ?? '');
    setStudentGender(details.student_gender ?? '');
    setNationality(details.nationality ?? '');
    setInterestedHotels(details.interested_hotel ?? []);
    setRoomTypes((details.room_type ?? []).join(', '));
    setDormAwaiting(details.dorm_awaiting ?? []);
    setKvkkOptIn(details.kvkk_opt_in ?? false);
    setMarketingOptIn(details.marketing_opt_in ?? false);
    setCampus(details.campus ?? '');
    setRoomCategory(details.room_category ?? '');
    setDistrictPreference(details.district_preference ?? '');
  }, [details]);

  function toggleHotel(name: string) {
    setInterestedHotels((prev) =>
      prev.includes(name) ? prev.filter((h) => h !== name) : [...prev, name],
    );
  }

  function toggleDorm(value: string) {
    setDormAwaiting((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value],
    );
  }

  async function handleSave() {
    setSaving(true);
    setError('');

    const roomTypeArray = roomTypes
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const body: Record<string, unknown> = {
      university: university || null,
      budget_tier: budgetTier || null,
      move_in: moveIn || null,
      uni_year: uniYear || null,
      parent_name: parentName || null,
      preferred_district: preferredDistrict || null,
      student_gender: studentGender || null,
      nationality: nationality || null,
      interested_hotel: interestedHotels,
      room_type: roomTypeArray,
      dorm_awaiting: dormAwaiting,
      kvkk_opt_in: kvkkOptIn,
      marketing_opt_in: marketingOptIn,
      campus: campus || null,
      room_category: roomCategory || null,
      district_preference: districtPreference || null,
    };

    const res = await fetch(`/api/lead-details/${leadId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const json = await res.json();
    setSaving(false);

    if (!res.ok) {
      setError(json.error ?? t('leads.saveDetailsFailed'));
      return;
    }

    onSaved();
  }

  const formBody = (
    <>
      {embedded && <p className="text-xs text-text-secondary">{t('leads.kvkkHiddenNote')}</p>}

      <div className="grid grid-cols-2 gap-3">
        <FormField label={t('filters.university')} htmlFor="university" className="col-span-2">
          <UniversityCombobox
            id="university"
            value={university}
            universities={universities}
            loading={universitiesLoading}
            onSelect={(uniName) => {
              setUniversity(uniName);
            }}
            onClear={() => {
              setUniversity('');
            }}
          />
        </FormField>
        <FormField
          label={t('leads.schoolShortname')}
          htmlFor="school_shortname"
          className="col-span-2"
        >
          <Input
            id="school_shortname"
            value={
              lookupSchoolShortname(university, universities) ?? details?.school_shortname ?? ''
            }
            readOnly
            placeholder="—"
            className="cursor-default bg-surface-muted text-text-secondary"
          />
        </FormField>
        <FormSelect
          label={t('filters.budgetTier')}
          id="budget_tier"
          value={budgetTier || '__none__'}
          onValueChange={(v) => setBudgetTier(v === '__none__' ? '' : v)}
          options={[
            { value: '__none__', label: t('common.emDash') },
            ...BUDGET_TIERS.map((tier) => ({
              value: tier,
              label: formatEnumLabel(locale, 'budgetTier', tier),
            })),
          ]}
        />
        <FormSelect
          label={t('filters.gender')}
          id="student_gender"
          className="col-span-2"
          value={studentGender || '__none__'}
          onValueChange={(v) => setStudentGender(v === '__none__' ? '' : v)}
          options={[
            { value: '__none__', label: t('leads.selectPlaceholder') },
            ...GENDER_VALUES.map((g) => ({
              value: g,
              label: formatEnumLabel(locale, 'gender', g),
            })),
          ]}
        />
        <FormField label={t('leads.moveInDate')} htmlFor="move_in" className="col-span-2">
          <Input
            id="move_in"
            type="date"
            value={moveIn}
            onChange={(e) => setMoveIn(e.target.value)}
          />
        </FormField>
      </div>

      <FormSelect
        label={t('filters.uniYear')}
        id="uni_year"
        value={uniYear || '__none__'}
        onValueChange={(v) => setUniYear(v === '__none__' ? '' : v)}
        options={[
          { value: '__none__', label: t('common.emDash') },
          ...UNI_YEARS.map((y) => ({
            value: y,
            label: formatEnumLabel(locale, 'uniYear', y),
          })),
        ]}
      />
      <FormField label={t('leads.parentName')} htmlFor="parent_name">
        <Input
          id="parent_name"
          value={parentName}
          onChange={(e) => setParentName(e.target.value)}
        />
      </FormField>
      <FormField label={t('filters.preferredDistrict')} htmlFor="preferred_district">
        <Input
          id="preferred_district"
          value={preferredDistrict}
          onChange={(e) => setPreferredDistrict(e.target.value)}
        />
      </FormField>

      {properties && properties.length > 0 && (
        <fieldset className="space-y-2 rounded-lg border border-border-default p-4">
          <legend className="px-1 text-sm font-medium text-text-primary">
            {t('leads.interestedHotels')}
          </legend>
          {properties.map((p) => (
            <div key={p.id} className="flex items-center gap-2">
              <Checkbox
                id={`hotel_${p.id}`}
                checked={interestedHotels.includes(p.hotel_name)}
                onCheckedChange={() => toggleHotel(p.hotel_name)}
              />
              <label htmlFor={`hotel_${p.id}`} className="text-sm text-text-primary">
                {p.hotel_name}
              </label>
            </div>
          ))}
        </fieldset>
      )}

      <FormField label={t('leads.roomTypesComma')} htmlFor="room_type">
        <Input id="room_type" value={roomTypes} onChange={(e) => setRoomTypes(e.target.value)} />
      </FormField>

      <fieldset className="space-y-2 rounded-lg border border-border-default p-4">
        <legend className="px-1 text-sm font-medium text-text-primary">
          {t('leads.dormAwaiting')}
        </legend>
        {DORM_AWAITING_VALUES.map((v) => (
          <div key={v} className="flex items-center gap-2">
            <Checkbox
              id={`dorm_${v}`}
              checked={dormAwaiting.includes(v)}
              onCheckedChange={() => toggleDorm(v)}
            />
            <label htmlFor={`dorm_${v}`} className="text-sm text-text-primary">
              {formatEnumLabel(locale, 'dorm', v)}
            </label>
          </div>
        ))}
      </fieldset>

      <FormField label={t('filters.nationality')} htmlFor="nationality">
        <Input
          id="nationality"
          value={nationality}
          onChange={(e) => setNationality(e.target.value)}
        />
      </FormField>

      <div className="space-y-3 rounded-lg border border-border-default p-4">
        <p className="text-sm font-medium text-text-primary">{t('leads.recInputs')}</p>

        <FormField label={t('leads.recCampus')} htmlFor="campus">
          <Input
            id="campus"
            placeholder={t('leads.recCampusPlaceholder')}
            value={campus}
            onChange={(e) => setCampus(e.target.value)}
          />
        </FormField>

        <FormSelect
          label={t('leads.recRoomType')}
          id="room_category"
          value={roomCategory || '__none__'}
          onValueChange={(v) => setRoomCategory(v === '__none__' ? '' : v)}
          options={[
            { value: '__none__', label: t('leads.selectPlaceholder') },
            ...ROOM_CATEGORIES.map((r) => ({
              value: r,
              label: formatEnumLabel(locale, 'room', r),
            })),
          ]}
        />

        <FormField label={t('leads.recDistrictPref')} htmlFor="district_preference">
          <Input
            id="district_preference"
            placeholder={t('leads.recDistrictPlaceholder')}
            value={districtPreference}
            onChange={(e) => setDistrictPreference(e.target.value)}
          />
        </FormField>
      </div>

      <div className="flex items-center gap-2">
        <Checkbox
          id="kvkk_opt_in"
          checked={kvkkOptIn}
          onCheckedChange={(checked) => setKvkkOptIn(checked === true)}
        />
        <label htmlFor="kvkk_opt_in" className="text-sm text-text-primary">
          {t('filters.kvkkOptIn')}
        </label>
      </div>
      <div className="flex items-center gap-2">
        <Checkbox
          id="marketing_opt_in"
          checked={marketingOptIn}
          onCheckedChange={(checked) => setMarketingOptIn(checked === true)}
        />
        <label htmlFor="marketing_opt_in" className="text-sm text-text-primary">
          {t('filters.marketingOptIn')}
        </label>
      </div>

      {error && <p className="text-xs text-brand-red">{error}</p>}
      <Button type="button" onClick={handleSave} disabled={saving}>
        {saving ? t('common.saving') : t('leads.saveDetails')}
      </Button>
    </>
  );

  if (embedded) {
    return <div className="flex flex-col gap-4">{formBody}</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('leads.studentDetails')}</CardTitle>
        <CardDescription>{t('leads.kvkkHiddenNote')}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">{formBody}</CardContent>
    </Card>
  );
}
