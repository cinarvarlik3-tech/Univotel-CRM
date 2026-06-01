/**
 * Manual lead creation page.
 */
import { useRouter } from 'next/router';
import { AppShell } from '@/components/layout/AppShell';
import { LeadForm } from '@/components/leads/LeadForm';
import { useTranslation } from '@/hooks/useTranslation';

/**
 * Renders form for manually creating a new lead.
 * @returns New lead page wrapped in AppShell.
 */
export default function NewLeadPage() {
  const router = useRouter();
  const { t } = useTranslation();

  async function handleSubmit(data: {
    lead_name: string;
    lead_phone: string;
    language?: string;
    university?: string;
    budget_min?: number;
    budget_max?: number;
    notes?: string;
  }) {
    const res = await fetch('/api/leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    const json = await res.json();

    if (!res.ok) {
      throw new Error(json.error ?? t('leads.failedToCreate'));
    }

    if (json.data.duplicate) {
      router.push(`/leads/${json.data.existingUuid}`);
    } else {
      router.push(`/leads/${json.data.uuid}`);
    }
  }

  return (
    <AppShell title={t('leads.newLead')}>
      <LeadForm onSubmit={handleSubmit} />
    </AppShell>
  );
}
