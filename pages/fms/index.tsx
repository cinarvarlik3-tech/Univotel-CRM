/**
 * FMS dashboard — partner/property filters, triple metrics, pie chart, customer list.
 */
import { useCallback } from 'react';
import { useRouter } from 'next/router';
import { FmsCustomerList } from '@/components/finance/FmsCustomerList';
import { FmsPieChart } from '@/components/finance/FmsPieChart';
import { FmsSearchBar } from '@/components/finance/FmsSearchBar';
import { useFmsSelection } from '@/components/finance/FmsSelectionContext';
import { FmsShell } from '@/components/finance/FmsShell';
import { FmsTripleBox } from '@/components/finance/FmsTripleBox';
import { LeadDetailPanel } from '@/components/leads/LeadDetailPanel';
import { useFmsDashboard, useFmsLookups } from '@/hooks/useFms';
import { useAuth } from '@/hooks/useAuth';
import { useSalespeople } from '@/hooks/useSalespeople';
import { useTranslation } from '@/hooks/useTranslation';
import { UNATTRIBUTED_PARTNER_ID } from '@/lib/finance/constants';
import { isManagerOrAbove } from '@/lib/auth/roles';

function selectedLeadFromQuery(
  query: Record<string, string | string[] | undefined>,
): string | null {
  const selected = query.selected;
  if (typeof selected === 'string' && selected.length > 0) return selected;
  return null;
}

/** Must render inside FmsShell so FmsSelectionProvider wraps this tree. */
function FmsDashboardContent() {
  const { t } = useTranslation();
  const router = useRouter();
  const { user } = useAuth();
  const { data: salespeople } = useSalespeople();
  const { partnerId, propertyId, setPartnerId, setPartnerAndProperty } = useFmsSelection();

  const { data: lookups } = useFmsLookups(null);
  const { data, error, isLoading } = useFmsDashboard(partnerId, propertyId);
  const showSkeleton = isLoading && !data;

  const selectedLeadId = router.isReady ? selectedLeadFromQuery(router.query) : null;
  const panelOpen = selectedLeadId !== null;
  const isManager = user ? isManagerOrAbove(user.role) : false;

  const openLead = useCallback(
    (uuid: string) => {
      router.push({ pathname: '/fms', query: { ...router.query, selected: uuid } }, undefined, {
        shallow: true,
      });
    },
    [router],
  );

  const closeLead = useCallback(() => {
    const nextQuery = { ...router.query };
    delete nextQuery.selected;
    router.push({ pathname: '/fms', query: nextQuery }, undefined, { shallow: true });
  }, [router]);

  const handlePartnerChange = useCallback(
    (id: string | null) => {
      setPartnerId(id);
    },
    [setPartnerId],
  );

  const handlePropertyChange = useCallback(
    (id: string | null) => {
      if (!id) {
        setPartnerAndProperty(partnerId, null);
        return;
      }
      const prop = lookups?.properties.find((p) => p.id === id);
      setPartnerAndProperty(prop?.partnerId ?? UNATTRIBUTED_PARTNER_ID, id);
    },
    [setPartnerAndProperty, partnerId, lookups?.properties],
  );

  return (
    <>
      <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-5">
        {error && (
          <div className="rounded-lg border border-border-default bg-surface-card px-4 py-3 text-sm text-text-secondary">
            {t('fms.failedToLoad')}
          </div>
        )}

        <FmsSearchBar
          partnerId={partnerId}
          propertyId={propertyId}
          onPartnerChange={handlePartnerChange}
          onPropertyChange={handlePropertyChange}
        />

        <FmsTripleBox metrics={data?.metrics} isLoading={showSkeleton} />

        <FmsPieChart pie={data?.pie} isLoading={showSkeleton} />

        <FmsCustomerList
          customers={data?.customers}
          isLoading={showSkeleton}
          onViewLead={openLead}
        />
      </div>

      <LeadDetailPanel
        leadId={selectedLeadId}
        open={panelOpen}
        onClose={closeLead}
        isManager={isManager}
        salespeople={salespeople}
      />
    </>
  );
}

export default function FmsDashboardPage() {
  const { t } = useTranslation();

  return (
    <FmsShell title={t('fms.title')}>
      <FmsDashboardContent />
    </FmsShell>
  );
}
