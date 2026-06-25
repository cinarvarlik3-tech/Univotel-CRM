/**
 * Manager webhook logs page — failed inbound webhook audit and replay.
 */
import { useState } from 'react';
import { useRouter } from 'next/router';
import { AppShell } from '@/components/layout/AppShell';
import { WebhookLogTable } from '@/components/webhook-logs/WebhookLogTable';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/useAuth';
import { useTranslation } from '@/hooks/useTranslation';
import { useWebhookLogs } from '@/hooks/useWebhookLogs';
import { isManagerOrAbove } from '@/lib/auth/roles';
import { WEBHOOK_ATTENTION_STATUSES } from '@/lib/webhooks/webhook-outcome';

const ATTENTION_QUERY = `?status=${WEBHOOK_ATTENTION_STATUSES.join(',')}&limit=50`;
const ALL_QUERY = '?limit=50';

export default function WebhookLogsPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const router = useRouter();
  const [showAll, setShowAll] = useState(false);
  const { data, mutate, error, isLoading } = useWebhookLogs(showAll ? ALL_QUERY : ATTENTION_QUERY);

  if (user && !isManagerOrAbove(user.role)) {
    if (typeof window !== 'undefined') router.replace('/leads');
    return null;
  }

  async function handleReplay(id: string) {
    const res = await fetch(`/api/webhook-logs/${id}/replay`, { method: 'POST' });
    if (res.ok) await mutate();
  }

  return (
    <AppShell title={t('webhooks.title')}>
      <div className="mb-3 flex gap-2">
        <Button
          type="button"
          variant={showAll ? 'ghost' : 'default'}
          onClick={() => setShowAll(false)}
        >
          {t('webhooks.filterNeedsAttention')}
        </Button>
        <Button
          type="button"
          variant={showAll ? 'default' : 'ghost'}
          onClick={() => setShowAll(true)}
        >
          {t('webhooks.filterAll')}
        </Button>
      </div>
      {isLoading && <Skeleton className="h-64 w-full" />}
      {error && <p className="text-sm text-brand-red">{t('webhooks.failedToLoad')}</p>}
      {data && <WebhookLogTable items={data.items} onReplay={handleReplay} />}
    </AppShell>
  );
}
