/**
 * Campaign detail page — start, cancel, progress summary.
 */
import { useRouter } from 'next/router';
import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { KvList } from '@/components/ui/kv-list';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/useAuth';
import { useCampaign } from '@/hooks/useCampaigns';

export default function CampaignDetailPage() {
  const router = useRouter();
  const id = typeof router.query.id === 'string' ? router.query.id : undefined;
  const { user } = useAuth();
  const { data, mutate, error, isLoading } = useCampaign(id);

  if (user && user.role !== 'manager') {
    if (typeof window !== 'undefined') router.replace('/leads');
    return null;
  }

  async function startCampaign() {
    if (!id) return;
    await fetch(`/api/campaigns/${id}/start`, { method: 'POST' });
    await mutate();
  }

  async function cancelCampaign() {
    if (!id) return;
    await fetch(`/api/campaigns/${id}/cancel`, { method: 'POST' });
    await mutate();
  }

  const campaign = data?.campaign;
  const summary = data?.summary;

  return (
    <AppShell title="Campaign">
      {isLoading && <Skeleton className="h-64 w-full" />}
      {error && <p className="text-sm text-brand-red">Failed to load campaign.</p>}
      {campaign && (
        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle>{campaign.template_id}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <KvList
                items={[
                  { term: 'Status', value: campaign.status },
                  { term: 'Template', value: campaign.template_id },
                ]}
              />
              {summary && (
                <KvList
                  items={[
                    { term: 'Total', value: String(summary.total) },
                    { term: 'Pending', value: String(summary.pending) },
                    { term: 'Sent', value: String(summary.sent) },
                    { term: 'Failed', value: String(summary.failed) },
                    { term: 'Skipped', value: String(summary.skipped) },
                  ]}
                />
              )}
              <div className="flex gap-2">
                {campaign.status === 'draft' && (
                  <Button type="button" onClick={startCampaign}>
                    Start
                  </Button>
                )}
                {campaign.status === 'running' && (
                  <Button type="button" variant="destructive" onClick={cancelCampaign}>
                    Cancel
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </AppShell>
  );
}
