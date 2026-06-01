/**
 * Campaigns list page (manager).
 */
import Link from 'next/link';
import { useRouter } from 'next/router';
import { IconPlus } from '@tabler/icons-react';
import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useAuth } from '@/hooks/useAuth';
import { useTranslation } from '@/hooks/useTranslation';
import { formatDateTime } from '@/lib/i18n';
import { isManagerOrAbove } from '@/lib/auth/roles';
import { useCampaigns } from '@/hooks/useCampaigns';

export default function CampaignsIndexPage() {
  const { locale, t } = useTranslation();
  const { user } = useAuth();
  const router = useRouter();
  const { data, error, isLoading } = useCampaigns();

  if (user && !isManagerOrAbove(user.role)) {
    if (typeof window !== 'undefined') router.replace('/leads');
    return null;
  }

  return (
    <AppShell
      title={t('campaigns.title')}
      actions={
        <Button asChild>
          <Link href="/campaigns/new">
            <IconPlus size={16} />
            {t('campaigns.newCampaign')}
          </Link>
        </Button>
      }
    >
      {isLoading && <Skeleton className="h-64 w-full" />}
      {error && <p className="text-sm text-brand-red">{t('campaigns.failedToLoad')}</p>}
      {data && (
        <div className="overflow-hidden rounded-[10px] border border-border-default bg-surface-card">
          <Table>
            <TableHeader>
              <TableRow className="h-[34px] hover:bg-transparent">
                <TableHead>{t('campaigns.tableTemplate')}</TableHead>
                <TableHead>{t('campaigns.tableStatus')}</TableHead>
                <TableHead>{t('campaigns.tableDailySent')}</TableHead>
                <TableHead>{t('campaigns.tableCreated')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(data?.items ?? []).map((c) => (
                <TableRow key={c.id}>
                  <TableCell>
                    <Link
                      href={`/campaigns/${c.id}`}
                      className="font-medium text-brand-blue hover:underline"
                    >
                      {c.template_id}
                    </Link>
                  </TableCell>
                  <TableCell className="text-text-secondary">{c.status}</TableCell>
                  <TableCell className="text-text-secondary">{c.daily_send_count}</TableCell>
                  <TableCell className="text-text-secondary">
                    {formatDateTime(c.created_at, locale)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </AppShell>
  );
}
