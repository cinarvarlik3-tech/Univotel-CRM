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
import { DORM_AWAITING_VALUES, UNI_YEARS } from '@/lib/constants';
import { useProperties } from '@/hooks/useProperties';
import type { LeadDetailRow } from '@/types/domain';

interface LeadDetailsFormProps {
  leadId: string;
  details: LeadDetailRow | null;
  onSaved: () => void;
  embedded?: boolean;
}

/**
 * Renders lead_details edit form for API-supported fields.
 * @param props - Lead UUID and current details row.
 * @returns Lead details form card.
 */
export function LeadDetailsForm({ leadId, details, onSaved, embedded }: LeadDetailsFormProps) {
  const { data: properties } = useProperties();
  const d = details;

  const [university, setUniversity] = useState(d?.university ?? '');
  const [budgetMin, setBudgetMin] = useState(d?.budget_min?.toString() ?? '');
  const [budgetMax, setBudgetMax] = useState(d?.budget_max?.toString() ?? '');
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
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!details) return;
    setUniversity(details.university ?? '');
    setBudgetMin(details.budget_min?.toString() ?? '');
    setBudgetMax(details.budget_max?.toString() ?? '');
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
      budget_min: budgetMin ? Number(budgetMin) : null,
      budget_max: budgetMax ? Number(budgetMax) : null,
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
    };

    const res = await fetch(`/api/lead-details/${leadId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const json = await res.json();
    setSaving(false);

    if (!res.ok) {
      setError(json.error ?? 'Failed to save details');
      return;
    }

    onSaved();
  }

  const formBody = (
    <>
      {!embedded && details?.rec_hotel && (
        <p className="text-sm text-text-primary">
          <strong>Recommended hotel (auto):</strong> {details.rec_hotel}
        </p>
      )}
      {embedded && (
        <p className="text-xs text-text-secondary">
          Gender and nationality may be hidden per KVKK if you are not the assignee.
        </p>
      )}

      <div className="grid grid-cols-2 gap-3">
        <FormField label="University" htmlFor="university" className="col-span-2">
          <Input
            id="university"
            value={university}
            onChange={(e) => setUniversity(e.target.value)}
          />
        </FormField>
        <FormField label="Budget min" htmlFor="budget_min">
          <Input
            id="budget_min"
            type="number"
            value={budgetMin}
            onChange={(e) => setBudgetMin(e.target.value)}
          />
        </FormField>
        <FormField label="Budget max" htmlFor="budget_max">
          <Input
            id="budget_max"
            type="number"
            value={budgetMax}
            onChange={(e) => setBudgetMax(e.target.value)}
          />
        </FormField>
        <FormField label="Move-in date" htmlFor="move_in" className="col-span-2">
          <Input
            id="move_in"
            type="date"
            value={moveIn}
            onChange={(e) => setMoveIn(e.target.value)}
          />
        </FormField>
      </div>

      <FormSelect
        label="Uni year"
        id="uni_year"
        value={uniYear || '__none__'}
        onValueChange={(v) => setUniYear(v === '__none__' ? '' : v)}
        options={[
          { value: '__none__', label: '—' },
          ...UNI_YEARS.map((y) => ({ value: y, label: y })),
        ]}
      />
      <FormField label="Parent name" htmlFor="parent_name">
        <Input
          id="parent_name"
          value={parentName}
          onChange={(e) => setParentName(e.target.value)}
        />
      </FormField>
      <FormField label="Preferred district" htmlFor="preferred_district">
        <Input
          id="preferred_district"
          value={preferredDistrict}
          onChange={(e) => setPreferredDistrict(e.target.value)}
        />
      </FormField>

      {properties && properties.length > 0 && (
        <fieldset className="space-y-2 rounded-lg border border-border-default p-4">
          <legend className="px-1 text-sm font-medium text-text-primary">Interested hotels</legend>
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

      <FormField label="Room types (comma-separated)" htmlFor="room_type">
        <Input id="room_type" value={roomTypes} onChange={(e) => setRoomTypes(e.target.value)} />
      </FormField>

      <fieldset className="space-y-2 rounded-lg border border-border-default p-4">
        <legend className="px-1 text-sm font-medium text-text-primary">Dorm awaiting</legend>
        {DORM_AWAITING_VALUES.map((v) => (
          <div key={v} className="flex items-center gap-2">
            <Checkbox
              id={`dorm_${v}`}
              checked={dormAwaiting.includes(v)}
              onCheckedChange={() => toggleDorm(v)}
            />
            <label htmlFor={`dorm_${v}`} className="text-sm text-text-primary">
              {v}
            </label>
          </div>
        ))}
      </fieldset>

      <FormSelect
        label="Student gender"
        id="student_gender"
        value={studentGender || '__none__'}
        onValueChange={(v) => setStudentGender(v === '__none__' ? '' : v)}
        options={[
          { value: '__none__', label: '—' },
          { value: 'male', label: 'male' },
          { value: 'female', label: 'female' },
          { value: 'other', label: 'other' },
        ]}
      />
      <FormField label="Nationality" htmlFor="nationality">
        <Input
          id="nationality"
          value={nationality}
          onChange={(e) => setNationality(e.target.value)}
        />
      </FormField>

      <div className="flex items-center gap-2">
        <Checkbox
          id="kvkk_opt_in"
          checked={kvkkOptIn}
          onCheckedChange={(checked) => setKvkkOptIn(checked === true)}
        />
        <label htmlFor="kvkk_opt_in" className="text-sm text-text-primary">
          KVKK opt-in
        </label>
      </div>
      <div className="flex items-center gap-2">
        <Checkbox
          id="marketing_opt_in"
          checked={marketingOptIn}
          onCheckedChange={(checked) => setMarketingOptIn(checked === true)}
        />
        <label htmlFor="marketing_opt_in" className="text-sm text-text-primary">
          Marketing opt-in
        </label>
      </div>

      {error && <p className="text-xs text-brand-red">{error}</p>}
      <Button type="button" onClick={handleSave} disabled={saving}>
        {saving ? 'Saving...' : 'Save details'}
      </Button>
    </>
  );

  if (embedded) {
    return <div className="flex flex-col gap-4">{formBody}</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Student details</CardTitle>
        <CardDescription>
          Gender and nationality may be hidden per KVKK if you are not the assignee.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">{formBody}</CardContent>
    </Card>
  );
}
