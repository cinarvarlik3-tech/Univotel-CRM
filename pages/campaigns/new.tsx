/**
 * Create campaign page.
 */
import { useRouter } from 'next/router';
import { AppShell } from '@/components/layout/AppShell';
import { CampaignForm } from '@/components/campaigns/CampaignForm';
import { useAuth } from '@/hooks/useAuth';

export default function NewCampaignPage() {
  const { user } = useAuth();
  const router = useRouter();

  if (user && user.role !== 'manager') {
    if (typeof window !== 'undefined') router.replace('/leads');
    return null;
  }

  return (
    <AppShell title="New campaign">
      <CampaignForm onCreated={(id) => router.push(`/campaigns/${id}`)} />
    </AppShell>
  );
}
