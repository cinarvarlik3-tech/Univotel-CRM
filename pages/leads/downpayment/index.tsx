import { useState } from 'react';
import { StageLeadPage } from '@/components/leads/StageLeadPage';
import { SetMoveInDialog } from '@/components/actions/SetMoveInDialog';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/hooks/useTranslation';
import type { LeadWithDetails } from '@/types/domain';

type ActiveDialog = {
  lead: LeadWithDetails;
  onDone: () => void;
} | null;

export default function DownpaymentPage() {
  const { t } = useTranslation();
  const [active, setActive] = useState<ActiveDialog>(null);

  function renderRowActions(lead: LeadWithDetails, onDone: () => void) {
    return (
      <Button size="sm" variant="secondary" onClick={() => setActive({ lead, onDone })}>
        {t('actions.setMoveIn')}
      </Button>
    );
  }

  return (
    <>
      <StageLeadPage
        titleKey="downpayment.title"
        stageFilter="&filter[funnel_status][eq]=kapora-alindi"
        basePath="/leads/downpayment"
        renderRowActions={renderRowActions}
      />
      {active && (
        <SetMoveInDialog
          open
          leadUuid={active.lead.uuid}
          field="move_in"
          onClose={() => setActive(null)}
          onSuccess={() => {
            active.onDone();
            setActive(null);
          }}
        />
      )}
    </>
  );
}
