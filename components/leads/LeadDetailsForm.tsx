/**
 * Form for editing lead_details profile fields via PATCH /api/lead-details.
 */
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { DORM_AWAITING_VALUES, UNI_YEARS } from '@/lib/constants';
import { useProperties } from '@/hooks/useProperties';
import type { LeadDetailRow } from '@/types/domain';

interface LeadDetailsFormProps {
  leadId: string;
  details: LeadDetailRow | null;
  onSaved: () => void;
}

/**
 * Renders lead_details edit form for API-supported fields.
 * @param props - Lead UUID and current details row.
 * @returns Lead details form card.
 */
export function LeadDetailsForm({ leadId, details, onSaved }: LeadDetailsFormProps) {
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

  return (
    <div className="card">
      <h3>Student details</h3>
      <p style={{ fontSize: 12, color: '#64748b' }}>
        Gender and nationality may be hidden per KVKK if you are not the assignee.
      </p>

      {details?.rec_hotel && (
        <p>
          <strong>Recommended hotel (auto):</strong> {details.rec_hotel}
        </p>
      )}

      <Input
        label="University"
        id="university"
        value={university}
        onChange={(e) => setUniversity(e.target.value)}
      />
      <Input
        label="Budget min"
        id="budget_min"
        type="number"
        value={budgetMin}
        onChange={(e) => setBudgetMin(e.target.value)}
      />
      <Input
        label="Budget max"
        id="budget_max"
        type="number"
        value={budgetMax}
        onChange={(e) => setBudgetMax(e.target.value)}
      />
      <Input
        label="Move-in date"
        id="move_in"
        type="date"
        value={moveIn}
        onChange={(e) => setMoveIn(e.target.value)}
      />
      <Select
        label="Uni year"
        id="uni_year"
        value={uniYear}
        onChange={(e) => setUniYear(e.target.value)}
      >
        <option value="">—</option>
        {UNI_YEARS.map((y) => (
          <option key={y} value={y}>
            {y}
          </option>
        ))}
      </Select>
      <Input
        label="Parent name"
        id="parent_name"
        value={parentName}
        onChange={(e) => setParentName(e.target.value)}
      />
      <Input
        label="Preferred district"
        id="preferred_district"
        value={preferredDistrict}
        onChange={(e) => setPreferredDistrict(e.target.value)}
      />

      {properties && properties.length > 0 && (
        <fieldset>
          <legend>Interested hotels</legend>
          {properties.map((p) => (
            <label key={p.id} style={{ display: 'block' }}>
              <input
                type="checkbox"
                checked={interestedHotels.includes(p.hotel_name)}
                onChange={() => toggleHotel(p.hotel_name)}
              />{' '}
              {p.hotel_name}
            </label>
          ))}
        </fieldset>
      )}

      <Input
        label="Room types (comma-separated)"
        id="room_type"
        value={roomTypes}
        onChange={(e) => setRoomTypes(e.target.value)}
      />

      <fieldset>
        <legend>Dorm awaiting</legend>
        {DORM_AWAITING_VALUES.map((v) => (
          <label key={v} style={{ display: 'block' }}>
            <input
              type="checkbox"
              checked={dormAwaiting.includes(v)}
              onChange={() => toggleDorm(v)}
            />{' '}
            {v}
          </label>
        ))}
      </fieldset>

      <Select
        label="Student gender"
        id="student_gender"
        value={studentGender}
        onChange={(e) => setStudentGender(e.target.value)}
      >
        <option value="">—</option>
        <option value="male">male</option>
        <option value="female">female</option>
        <option value="other">other</option>
      </Select>
      <Input
        label="Nationality"
        id="nationality"
        value={nationality}
        onChange={(e) => setNationality(e.target.value)}
      />

      <label style={{ display: 'block' }}>
        <input
          type="checkbox"
          checked={kvkkOptIn}
          onChange={(e) => setKvkkOptIn(e.target.checked)}
        />{' '}
        KVKK opt-in
      </label>
      <label style={{ display: 'block' }}>
        <input
          type="checkbox"
          checked={marketingOptIn}
          onChange={(e) => setMarketingOptIn(e.target.checked)}
        />{' '}
        Marketing opt-in
      </label>

      {error && <p className="error">{error}</p>}
      <Button type="button" onClick={handleSave} disabled={saving}>
        {saving ? 'Saving...' : 'Save details'}
      </Button>
    </div>
  );
}

