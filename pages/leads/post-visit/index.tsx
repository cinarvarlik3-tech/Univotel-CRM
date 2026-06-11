import { useState } from 'react';
import { StageLeadPage } from '@/components/leads/StageLeadPage';
import { LogContactDialog } from '@/components/actions/LogContactDialog';
import { CreateTaskDialog } from '@/components/actions/CreateTaskDialog';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/hooks/useTranslation';
import type { LeadWithDetails } from '@/types/domain';

type ActiveDialog = {
  type: 'log-contact' | 'create-task';
  lead: LeadWithDetails;
  onDone: () => void;
} | null;

export default function PostVisitPage() {
  const { t } = useTranslation();
  const [active, setActive] = useState<ActiveDialog>(null);

  function renderRowActions(lead: LeadWithDetails, onDone: () => void) {
    return (
      <div className="flex gap-1">
        <Button
          size="sm"
          variant="secondary"
          onClick={() => setActive({ type: 'log-contact', lead, onDone })}
        >
          {t('actions.logContact')}
        </Button>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => setActive({ type: 'create-task', lead, onDone })}
        >
          {t('actions.createTask')}
        </Button>
      </div>
    );
  }

  return (
    <>
      <StageLeadPage
        titleKey="postVisit.title"
        stageFilter="&filter[funnel_status][in]=ziyaret-etti,teklif-gonderildi"
        basePath="/leads/post-visit"
        renderRowActions={renderRowActions}
      />
      {active?.type === 'log-contact' && (
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
      {active?.type === 'create-task' && (
        <CreateTaskDialog
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
