/**
 * Manual lead creation form component.
 */
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { FormSelect } from '@/components/ui/form-select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { LANGUAGES } from '@/lib/constants';

interface LeadFormProps {
  onSubmit: (data: {
    lead_name: string;
    lead_phone: string;
    language?: string;
    university?: string;
    budget_min?: number;
    budget_max?: number;
    notes?: string;
  }) => Promise<void>;
}

/**
 * Renders a form for manually creating a lead.
 * @param props - onSubmit callback for form submission.
 * @returns Lead creation form.
 */
export function LeadForm({ onSubmit }: LeadFormProps) {
  const [leadName, setLeadName] = useState('');
  const [leadPhone, setLeadPhone] = useState('');
  const [language, setLanguage] = useState('tr');
  const [university, setUniversity] = useState('');
  const [budgetMin, setBudgetMin] = useState('');
  const [budgetMax, setBudgetMax] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      await onSubmit({
        lead_name: leadName,
        lead_phone: leadPhone,
        language,
        university: university || undefined,
        budget_min: budgetMin ? Number(budgetMin) : undefined,
        budget_max: budgetMax ? Number(budgetMax) : undefined,
        notes: notes || undefined,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create lead');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex max-w-md flex-col gap-4">
      <FormField label="Name" htmlFor="lead_name">
        <Input id="lead_name" value={leadName} onChange={(e) => setLeadName(e.target.value)} />
      </FormField>
      <FormField label="Phone *" htmlFor="lead_phone">
        <Input
          id="lead_phone"
          value={leadPhone}
          onChange={(e) => setLeadPhone(e.target.value)}
          required
        />
      </FormField>
      <FormSelect
        label="Language"
        id="language"
        value={language}
        onValueChange={setLanguage}
        options={LANGUAGES.map((l) => ({ value: l, label: l }))}
      />
      <FormField label="University" htmlFor="university">
        <Input id="university" value={university} onChange={(e) => setUniversity(e.target.value)} />
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
      <FormField label="Notes" htmlFor="notes">
        <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
      </FormField>
      {error && <p className="text-xs text-brand-red">{error}</p>}
      <Button type="submit" disabled={submitting}>
        {submitting ? 'Creating...' : 'Create Lead'}
      </Button>
    </form>
  );
}
