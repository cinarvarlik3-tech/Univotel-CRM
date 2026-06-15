import { useCallback, useState, type ReactNode } from 'react';
import { CreateTaskDialog } from '@/components/actions/CreateTaskDialog';
import { LogContactDialog } from '@/components/actions/LogContactDialog';
import { VisitScheduleDialog } from '@/components/leads/VisitScheduleDialog';
import { ReassignModal } from '@/components/modals/ReassignModal';
import { StagePickerModal } from '@/components/modals/StagePickerModal';
import { Button } from '@/components/ui/button';
import { useActionToast } from '@/hooks/useActionToast';
import { useTranslation } from '@/hooks/useTranslation';
import type { LeadWithDetails, SalespersonOption } from '@/types/domain';

export type LeadRowActionPreset = 'manager' | 'mine' | 'call-awaiting' | 'nurture' | 'post-visit';

type DialogKind = 'task' | 'visit' | 'reassign' | 'stage' | 'log-contact';

interface ActiveDialog {
  kind: DialogKind;
  lead: LeadWithDetails;
  onDone: () => void;
}

interface UseLeadRowActionsOptions {
  preset: LeadRowActionPreset;
  salespeople?: SalespersonOption[];
  /** Primary action rendered before secondary buttons (e.g. call outcome). */
  leading?: (lead: LeadWithDetails, onDone: () => void) => ReactNode;
}

function leadDisplayName(lead: LeadWithDetails): string {
  return lead.display_name ?? lead.lead_name ?? lead.uuid;
}

/**
 * Shared row action buttons + modal host for lead list pages.
 */
export function useLeadRowActions({ preset, salespeople = [], leading }: UseLeadRowActionsOptions) {
  const { t } = useTranslation();
  const { show: showToast, node: toastNode } = useActionToast();
  const [active, setActive] = useState<ActiveDialog | null>(null);

  const open = useCallback((kind: DialogKind, lead: LeadWithDetails, onDone: () => void) => {
    setActive({ kind, lead, onDone });
  }, []);

  const close = useCallback(() => setActive(null), []);

  const handleSuccess = useCallback(
    (messageKey: string) => {
      if (active) active.onDone();
      showToast(t(messageKey));
      close();
    },
    [active, close, showToast, t],
  );

  const renderRowActions = useCallback(
    (lead: LeadWithDetails, onDone: () => void) => {
      const btn = (kind: DialogKind, label: string) => (
        <Button
          key={kind}
          size="sm"
          variant="secondary"
          onClick={(e) => {
            e.stopPropagation();
            open(kind, lead, onDone);
          }}
        >
          {label}
        </Button>
      );

      const buttons: ReactNode[] = [];

      if (leading) buttons.push(leading(lead, onDone));

      switch (preset) {
        case 'manager':
          buttons.push(
            btn('task', t('actions.createTaskShort')),
            btn('visit', t('actions.scheduleVisit')),
            btn('reassign', t('actions.reassign')),
            btn('stage', t('actions.moveStage')),
          );
          break;
        case 'mine':
          buttons.push(
            btn('log-contact', t('actions.logContact')),
            btn('visit', t('actions.scheduleVisit')),
            btn('task', t('actions.createTaskShort')),
            btn('stage', t('actions.moveStage')),
          );
          break;
        case 'call-awaiting':
          buttons.push(
            <Button
              key="log-call"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                open('log-contact', lead, onDone);
              }}
            >
              {t('actions.logCallOutcome')}
            </Button>,
            btn('visit', t('actions.scheduleVisit')),
            btn('task', t('actions.createTaskShort')),
            btn('stage', t('actions.moveStage')),
          );
          break;
        case 'nurture':
          buttons.push(
            btn('visit', t('actions.scheduleVisit')),
            btn('stage', t('actions.moveStage')),
          );
          break;
        case 'post-visit':
          buttons.push(
            btn('stage', t('actions.moveStage')),
            btn('visit', t('actions.scheduleVisit')),
            btn('task', t('actions.createTaskShort')),
          );
          break;
      }

      return <div className="flex flex-wrap justify-end gap-1">{buttons}</div>;
    },
    [leading, open, preset, t],
  );

  const dialogs = (
    <>
      {toastNode}
      {active?.kind === 'task' && (
        <CreateTaskDialog
          open
          leadUuid={active.lead.uuid}
          onClose={close}
          onSuccess={() => handleSuccess('actions.taskCreatedToast')}
        />
      )}
      {active?.kind === 'visit' && (
        <VisitScheduleDialog
          open
          leadUuid={active.lead.uuid}
          onClose={close}
          onSuccess={() => handleSuccess('actions.visitScheduledToast')}
        />
      )}
      {active?.kind === 'log-contact' && (
        <LogContactDialog
          open
          leadUuid={active.lead.uuid}
          onClose={close}
          onSuccess={() => handleSuccess('actions.contactLoggedToast')}
        />
      )}
      {active?.kind === 'stage' && (
        <StagePickerModal
          open
          leadUuid={active.lead.uuid}
          leadName={leadDisplayName(active.lead)}
          currentStage={active.lead.funnel_status}
          onClose={close}
          onSuccess={() => handleSuccess('actions.stageUpdated')}
        />
      )}
      {active?.kind === 'reassign' && (
        <ReassignModal
          open
          leadUuid={active.lead.uuid}
          leadName={leadDisplayName(active.lead)}
          currentAssigneeId={active.lead.assigned_to}
          salespeople={salespeople}
          onClose={close}
          onSuccess={() => handleSuccess('actions.reassignedToast')}
        />
      )}
    </>
  );

  return { renderRowActions, dialogs };
}
