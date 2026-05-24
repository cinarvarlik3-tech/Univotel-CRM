/**
 * Form for editing core lead fields (student_stage, persona, special_state, notes, language, score).
 */
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FormField } from '@/components/ui/form-field';
import { FormSelect } from '@/components/ui/form-select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { LANGUAGES, PERSONA_TYPES, SPECIAL_STATES, STUDENT_STAGES } from '@/lib/constants';
import type { LeadWithDetails } from '@/types/domain';

interface LeadCoreFieldsFormProps {
  lead: LeadWithDetails;
  leadId: string;
  onSaved: () => void;
  embedded?: boolean;
}

/**
 * Renders editable core lead fields and PATCHes /api/leads/[id].
 * @param props - Lead data and callbacks.
 * @returns Core fields form card.
 */
export function LeadCoreFieldsForm({ lead, leadId, onSaved, embedded }: LeadCoreFieldsFormProps) {
  const [studentStage, setStudentStage] = useState(lead.student_stage);
  const [personaType, setPersonaType] = useState(lead.persona_type ?? '');
  const [specialState, setSpecialState] = useState(lead.special_state ?? '');
  const [language, setLanguage] = useState(lead.language);
  const [leadScore, setLeadScore] = useState(lead.lead_score?.toString() ?? '0');
  const [notes, setNotes] = useState(lead.notes ?? '');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setStudentStage(lead.student_stage);
    setPersonaType(lead.persona_type ?? '');
    setSpecialState(lead.special_state ?? '');
    setLanguage(lead.language);
    setLeadScore(lead.lead_score?.toString() ?? '0');
    setNotes(lead.notes ?? '');
  }, [lead]);

  async function handleSave() {
    setSaving(true);
    setError('');

    const body: Record<string, string | number | null> = {
      student_stage: studentStage,
      notes,
      language,
      lead_score: Number(leadScore),
      persona_type: personaType || null,
      special_state: specialState || null,
    };

    const res = await fetch(`/api/leads/${leadId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const json = await res.json();
    setSaving(false);

    if (!res.ok) {
      setError(json.error ?? 'Failed to save');
      return;
    }

    onSaved();
  }

  const formBody = (
    <>
      <FormSelect
        label="Student stage"
        id="student_stage"
        value={studentStage}
        onValueChange={setStudentStage}
        options={STUDENT_STAGES.map((s) => ({ value: s, label: s }))}
      />
      <FormSelect
        label="Language"
        id="language"
        value={language}
        onValueChange={setLanguage}
        options={LANGUAGES.map((l) => ({ value: l, label: l }))}
      />
      <FormField label="Lead score (0–100)" htmlFor="lead_score">
        <Input
          id="lead_score"
          type="number"
          min={0}
          max={100}
          value={leadScore}
          onChange={(e) => setLeadScore(e.target.value)}
        />
      </FormField>
      <FormSelect
        label="Persona"
        id="persona_type"
        value={personaType || '__none__'}
        onValueChange={(v) => setPersonaType(v === '__none__' ? '' : v)}
        options={[
          { value: '__none__', label: '—' },
          ...PERSONA_TYPES.map((p) => ({ value: p, label: p })),
        ]}
      />
      <FormSelect
        label="Special state"
        id="special_state"
        value={specialState || '__none__'}
        onValueChange={(v) => setSpecialState(v === '__none__' ? '' : v)}
        options={[
          { value: '__none__', label: '—' },
          ...SPECIAL_STATES.map((s) => ({ value: s, label: s })),
        ]}
      />
      <FormField label="Notes" htmlFor="lead_notes">
        <Textarea
          id="lead_notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
        />
      </FormField>
      {error && <p className="text-xs text-brand-red">{error}</p>}
      <Button type="button" onClick={handleSave} disabled={saving}>
        {saving ? 'Saving...' : 'Save profile'}
      </Button>
    </>
  );

  if (embedded) {
    return <div className="flex flex-col gap-4">{formBody}</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Lead profile</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">{formBody}</CardContent>
    </Card>
  );
}
