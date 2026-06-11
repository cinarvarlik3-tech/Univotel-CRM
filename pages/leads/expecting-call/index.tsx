import { useState } from 'react';
import { StageLeadPage } from '@/components/leads/StageLeadPage';
import { LogContactDialog } from '@/components/actions/LogContactDialog';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/hooks/useTranslation';
import type { LeadWithDetails } from '@/types/domain';

type ActiveDialog = {
  lead: LeadWithDetails;
  onDone: () => void;
} | null;

export default function ExpectingCallPage() {
  const { t } = useTranslation();
  const [active, setActive] = useState<ActiveDialog>(null);

  function renderRowActions(lead: LeadWithDetails, onDone: () => void) {
    return (
      <Button size="sm" variant="secondary" onClick={() => setActive({ lead, onDone })}>
        {t('actions.logContact')}
      </Button>
    );
  }

  return (
    <>
      <StageLeadPage
        titleKey="expectingCall.title"
        stageFilter="&filter[funnel_status][in]=aranacak,arandi-acmadi"
        basePath="/leads/expecting-call"
        renderRowActions={renderRowActions}
      />
      {active && (
        <LogContactDialog
          open
          leadUuid={active.lead.uuid}
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
