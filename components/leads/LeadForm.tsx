/**
 * Manual lead creation form component.
 */
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
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
    <form onSubmit={handleSubmit}>
      <Input
        label="Name"
        id="lead_name"
        value={leadName}
        onChange={(e) => setLeadName(e.target.value)}
      />
      <Input
        label="Phone *"
        id="lead_phone"
        value={leadPhone}
        onChange={(e) => setLeadPhone(e.target.value)}
        required
      />
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
      <label htmlFor="notes">
        <div>Notes</div>
        <textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
      </label>
      {error && <p className="error">{error}</p>}
      <Button type="submit" disabled={submitting}>
        {submitting ? 'Creating...' : 'Create Lead'}
      </Button>
    </form>
  );
}
