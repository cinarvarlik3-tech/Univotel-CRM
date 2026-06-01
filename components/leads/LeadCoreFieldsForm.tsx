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
import { useTranslation } from '@/hooks/useTranslation';
import { formatEnumLabel } from '@/lib/i18n/enum-labels';
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
  const { locale, t } = useTranslation();
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
      setError(json.error ?? t('leads.saveFailed'));
      return;
    }

    onSaved();
  }

  const formBody = (
    <>
      <FormSelect
        label={t('leads.studentStage')}
        id="student_stage"
        value={studentStage}
        onValueChange={setStudentStage}
        options={STUDENT_STAGES.map((s) => ({
          value: s,
          label: formatEnumLabel(locale, 'stage', s),
        }))}
      />
      <FormSelect
        label={t('filters.language')}
        id="language"
        value={language}
        onValueChange={setLanguage}
        options={LANGUAGES.map((l) => ({
          value: l,
          label: formatEnumLabel(locale, 'language', l),
        }))}
      />
      <FormField label={t('leads.leadScoreRange')} htmlFor="lead_score">
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
        label={t('filters.persona')}
        id="persona_type"
        value={personaType || '__none__'}
        onValueChange={(v) => setPersonaType(v === '__none__' ? '' : v)}
        options={[
          { value: '__none__', label: t('common.emDash') },
          ...PERSONA_TYPES.map((p) => ({
            value: p,
            label: formatEnumLabel(locale, 'persona', p),
          })),
        ]}
      />
      <FormSelect
        label={t('filters.specialState')}
        id="special_state"
        value={specialState || '__none__'}
        onValueChange={(v) => setSpecialState(v === '__none__' ? '' : v)}
        options={[
          { value: '__none__', label: t('common.emDash') },
          ...SPECIAL_STATES.map((s) => ({
            value: s,
            label: formatEnumLabel(locale, 'special', s),
          })),
        ]}
      />
      <FormField label={t('leads.notes')} htmlFor="lead_notes">
        <Textarea
          id="lead_notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
        />
      </FormField>
      {error && <p className="text-xs text-brand-red">{error}</p>}
      <Button type="button" onClick={handleSave} disabled={saving}>
        {saving ? t('common.saving') : t('leads.saveProfile')}
      </Button>
    </>
  );

  if (embedded) {
    return <div className="flex flex-col gap-4">{formBody}</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('leads.leadProfile')}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">{formBody}</CardContent>
    </Card>
  );
}
