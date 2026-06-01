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
import { useTranslation } from '@/hooks/useTranslation';
import { isManagerOrAbove } from '@/lib/auth/roles';
import { formatNumber } from '@/lib/i18n/format-date';
import { useCampaign } from '@/hooks/useCampaigns';

export default function CampaignDetailPage() {
  const router = useRouter();
  const id = typeof router.query.id === 'string' ? router.query.id : undefined;
  const { locale, t } = useTranslation();
  const { user } = useAuth();
  const { data, mutate, error, isLoading } = useCampaign(id);

  if (user && !isManagerOrAbove(user.role)) {
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
    <AppShell title={t('campaigns.campaign')}>
      {isLoading && <Skeleton className="h-64 w-full" />}
      {error && <p className="text-sm text-brand-red">{t('campaigns.failedToLoadOne')}</p>}
      {campaign && (
        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle>{campaign.template_id}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <KvList
                items={[
                  { term: t('campaigns.status'), value: campaign.status },
                  { term: t('campaigns.template'), value: campaign.template_id },
                ]}
              />
              {summary && (
                <KvList
                  items={[
                    { term: t('campaigns.total'), value: formatNumber(summary.total, locale) },
                    {
                      term: t('campaigns.pending'),
                      value: formatNumber(summary.pending, locale),
                    },
                    { term: t('campaigns.sent'), value: formatNumber(summary.sent, locale) },
                    {
                      term: t('campaigns.failed'),
                      value: formatNumber(summary.failed, locale),
                    },
                    {
                      term: t('campaigns.skipped'),
                      value: formatNumber(summary.skipped, locale),
                    },
                  ]}
                />
              )}
              <div className="flex gap-2">
                {campaign.status === 'draft' && (
                  <Button type="button" onClick={startCampaign}>
                    {t('common.start')}
                  </Button>
                )}
                {campaign.status === 'running' && (
                  <Button type="button" variant="destructive" onClick={cancelCampaign}>
                    {t('common.cancel')}
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
