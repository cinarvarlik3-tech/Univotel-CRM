/**
 * Create campaign page.
 */
import { useRouter } from 'next/router';
import { AppShell } from '@/components/layout/AppShell';
import { CampaignForm } from '@/components/campaigns/CampaignForm';
import { useAuth } from '@/hooks/useAuth';
import { useTranslation } from '@/hooks/useTranslation';
import { isManagerOrAbove } from '@/lib/auth/roles';

export default function NewCampaignPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const router = useRouter();

  if (user && !isManagerOrAbove(user.role)) {
    if (typeof window !== 'undefined') router.replace('/leads');
    return null;
  }

  return (
    <AppShell title={t('campaigns.newCampaignTitle')}>
      <CampaignForm onCreated={(id) => router.push(`/campaigns/${id}`)} />
    </AppShell>
  );
}
