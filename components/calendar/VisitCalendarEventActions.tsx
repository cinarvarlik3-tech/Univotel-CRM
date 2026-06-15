import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { RescheduleDatePopover } from '@/components/modals/RescheduleDatePopover';
import { VisitResultModal, type VisitResultOutcome } from '@/components/modals/VisitResultModal';
import { hasVisitOccurred } from '@/lib/leads/visit-time';
import { useTranslation } from '@/hooks/useTranslation';
import type { CalendarEvent } from './types';

interface VisitCalendarEventActionsProps {
  event: CalendarEvent;
  onReschedule: (event: CalendarEvent, newDateIso: string) => Promise<boolean>;
  onResultSuccess: (outcome: VisitResultOutcome) => void;
}

export function VisitCalendarEventActions({
  event,
  onReschedule,
  onResultSuccess,
}: VisitCalendarEventActionsProps) {
  const { t } = useTranslation();
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [resultOpen, setResultOpen] = useState(false);

  const isScheduled = event.visitStatus === 'scheduled';
  const canLogResult = hasVisitOccurred(event.start);

  if (!isScheduled) return null;

  return (
    <>
      {canLogResult && event.leadUuid && (
        <Button size="sm" onClick={() => setResultOpen(true)}>
          {t('actions.logVisitResult')}
        </Button>
      )}
      <Button size="sm" variant="secondary" onClick={() => setRescheduleOpen(true)}>
        {t('calendar.reschedule')}
      </Button>

      <RescheduleDatePopover
        label={t('calendar.reschedule')}
        currentDate={event.start}
        previewMessageKey="visitCalendar.reschedulePreview"
        open={rescheduleOpen}
        onOpenChange={setRescheduleOpen}
        onConfirm={(iso) => onReschedule(event, iso)}
      />

      {event.leadUuid && (
        <VisitResultModal
          open={resultOpen}
          visitId={event.id}
          leadUuid={event.leadUuid}
          leadName={event.title}
          visitDate={event.start}
          onClose={() => setResultOpen(false)}
          onSuccess={(outcome) => {
            onResultSuccess(outcome);
            setResultOpen(false);
          }}
        />
      )}
    </>
  );
}
