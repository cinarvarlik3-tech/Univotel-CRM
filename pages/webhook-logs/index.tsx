/**
 * Manager webhook logs page — failed inbound webhook audit and replay.
 */
import { useRouter } from 'next/router';
import { AppShell } from '@/components/layout/AppShell';
import { WebhookLogTable } from '@/components/webhook-logs/WebhookLogTable';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/useAuth';
import { useWebhookLogs } from '@/hooks/useWebhookLogs';
import { isManagerOrAbove } from '@/lib/auth/roles';

export default function WebhookLogsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { data, mutate, error, isLoading } = useWebhookLogs('?limit=50');

  if (user && !isManagerOrAbove(user.role)) {
    if (typeof window !== 'undefined') router.replace('/leads');
    return null;
  }

  async function handleReplay(id: string) {
    const res = await fetch(`/api/webhook-logs/${id}/replay`, { method: 'POST' });
    if (res.ok) await mutate();
  }

  return (
    <AppShell title="Webhook Logs">
      {isLoading && <Skeleton className="h-64 w-full" />}
      {error && <p className="text-sm text-brand-red">Failed to load webhook logs.</p>}
      {data && <WebhookLogTable items={data.items} onReplay={handleReplay} />}
    </AppShell>
  );
}
