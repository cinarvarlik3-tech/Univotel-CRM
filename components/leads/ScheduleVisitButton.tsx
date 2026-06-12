/**
 * Toolbar action for the Visit Calendar: pick a lead, then open the existing
 * VisitScheduleDialog to schedule a visit for that lead.
 */
import { useState } from 'react';
import { IconPlus } from '@tabler/icons-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { LeadPickerInput } from '@/components/leads/LeadPickerInput';
import { VisitScheduleDialog } from '@/components/leads/VisitScheduleDialog';
import { useTranslation } from '@/hooks/useTranslation';

interface ScheduleVisitButtonProps {
  /** Called after a visit has been successfully scheduled. */
  onScheduled: () => void;
}

/**
 * Renders the "Schedule visit" button and its two-step flow.
 * @param props - onScheduled refetch callback.
 * @returns Button + lead-picker dialog + schedule dialog.
 */
export function ScheduleVisitButton({ onScheduled }: ScheduleVisitButtonProps) {
  const { t } = useTranslation();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [leadUuid, setLeadUuid] = useState('');
  const [leadLabel, setLeadLabel] = useState('');

  /** Resets the picker selection and closes both dialogs. */
  function reset() {
    setLeadUuid('');
    setLeadLabel('');
    setPickerOpen(false);
    setScheduleOpen(false);
  }

  return (
    <>
      <Button onClick={() => setPickerOpen(true)}>
        <IconPlus className="size-4" />
        {t('visitCalendar.scheduleVisit')}
      </Button>

      <Dialog open={pickerOpen} onOpenChange={(open) => !open && setPickerOpen(false)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t('visitCalendar.pickLeadTitle')}</DialogTitle>
            <DialogDescription>{t('visitCalendar.pickLeadHint')}</DialogDescription>
          </DialogHeader>

          <LeadPickerInput
            value={leadUuid}
            label={leadLabel}
            onChange={(uuid, label) => {
              setLeadUuid(uuid);
              setLeadLabel(label);
            }}
          />

          <DialogFooter>
            <Button variant="secondary" onClick={() => setPickerOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button
              disabled={!leadUuid}
              onClick={() => {
                setPickerOpen(false);
                setScheduleOpen(true);
              }}
            >
              {t('visitCalendar.continueToSchedule')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {scheduleOpen && leadUuid && (
        <VisitScheduleDialog
          open={scheduleOpen}
          leadUuid={leadUuid}
          onClose={() => setScheduleOpen(false)}
          onSuccess={() => {
            onScheduled();
            reset();
          }}
        />
      )}
    </>
  );
}
