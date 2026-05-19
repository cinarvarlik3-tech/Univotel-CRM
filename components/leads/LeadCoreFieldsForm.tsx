/**
 * Form for editing core lead fields (student_stage, persona, special_state, notes, language, score).
 */
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { LANGUAGES, PERSONA_TYPES, SPECIAL_STATES, STUDENT_STAGES } from '@/lib/constants';
import type { LeadWithDetails } from '@/types/domain';

interface LeadCoreFieldsFormProps {
  lead: LeadWithDetails;
  leadId: string;
  onSaved: () => void;
}

/**
 * Renders editable core lead fields and PATCHes /api/leads/[id].
 * @param props - Lead data and callbacks.
 * @returns Core fields form card.
 */
export function LeadCoreFieldsForm({ lead, leadId, onSaved }: LeadCoreFieldsFormProps) {
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

  return (
    <div className="card">
      <h3>Lead profile</h3>
      <Select
        label="Student stage"
        id="student_stage"
        value={studentStage}
        onChange={(e) => setStudentStage(e.target.value)}
      >
        {STUDENT_STAGES.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </Select>
      <Select
        label="Language"
        id="language"
        value={language}
        onChange={(e) => setLanguage(e.target.value)}
      >
        {LANGUAGES.map((l) => (
          <option key={l} value={l}>
            {l}
          </option>
        ))}
      </Select>
      <Input
        label="Lead score (0–100)"
        id="lead_score"
        type="number"
        min={0}
        max={100}
        value={leadScore}
        onChange={(e) => setLeadScore(e.target.value)}
      />
      <Select
        label="Persona"
        id="persona_type"
        value={personaType}
        onChange={(e) => setPersonaType(e.target.value)}
      >
        <option value="">—</option>
        {PERSONA_TYPES.map((p) => (
          <option key={p} value={p}>
            {p}
          </option>
        ))}
      </Select>
      <Select
        label="Special state"
        id="special_state"
        value={specialState}
        onChange={(e) => setSpecialState(e.target.value)}
      >
        <option value="">—</option>
        {SPECIAL_STATES.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </Select>
      <label htmlFor="lead_notes">
        <div>Notes</div>
        <textarea
          id="lead_notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
        />
      </label>
      {error && <p className="error">{error}</p>}
      <Button type="button" onClick={handleSave} disabled={saving}>
        {saving ? 'Saving...' : 'Save profile'}
      </Button>
    </div>
  );
}
