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

export default function DealSignedPage() {
  const { t } = useTranslation();
  const [active, setActive] = useState<ActiveDialog>(null);

  function renderRowActions(lead: LeadWithDetails, onDone: () => void) {
    return (
      <Button size="sm" variant="secondary" onClick={() => setActive({ lead, onDone })}>
        {t('actions.setActualMoveIn')}
      </Button>
    );
  }

  return (
    <>
      <StageLeadPage
        titleKey="dealSigned.title"
        stageFilter="&filter[funnel_status][eq]=sozlesme-imzalandi"
        basePath="/leads/deal-signed"
        renderRowActions={renderRowActions}
      />
      {active && (
        <SetMoveInDialog
          open
          leadUuid={active.lead.uuid}
          field="actual_move_in_date"
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
