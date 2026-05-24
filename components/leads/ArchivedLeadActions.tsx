/**
 * Manager-only unarchive action for archived lead detail page.
 */
import { useRouter } from 'next/router';
import { useState } from 'react';
import { AUTO_ARCHIVE_CUTOFF_DAYS } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface ArchivedLeadActionsProps {
  leadId: string;
}

/**
 * Renders unarchive confirmation and action for archived leads.
 * @param props - Archived lead UUID.
 * @returns Actions card element.
 */
export function ArchivedLeadActions({ leadId }: ArchivedLeadActionsProps) {
  const router = useRouter();
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleUnarchive() {
    if (
      !window.confirm('Restore this lead to active lists? It will keep its current funnel status.')
    ) {
      return;
    }

    setSaving(true);
    setError('');

    const res = await fetch(`/api/leads/archived/${leadId}/unarchive`, { method: 'POST' });
    const json = await res.json();
    setSaving(false);

    if (!res.ok) {
      setError(json.error ?? 'Unarchive failed');
      return;
    }

    router.push(`/leads/${leadId}`);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Manager actions</CardTitle>
        <CardDescription>
          Unarchived leads return with the same assignee and funnel status. Terminal leads may be
          auto-archived again after {AUTO_ARCHIVE_CUTOFF_DAYS} days.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <Button type="button" onClick={handleUnarchive} disabled={saving}>
          {saving ? 'Restoring...' : 'Unarchive lead'}
        </Button>
        {error && <p className="text-xs text-brand-red">{error}</p>}
      </CardContent>
    </Card>
  );
}
