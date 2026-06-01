/**
 * Recommendation request button with polling for async Make.com results.
 */
import { useEffect, useRef, useState } from 'react';
import { LeadRecHotel } from '@/components/leads/LeadRecHotel';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/hooks/useTranslation';
import { parseRecHotel } from '@/lib/leads/parse-rec-hotel';
import { isRecEligibleGender } from '@/lib/ui/format-student-gender';
import type { LeadDetailRow } from '@/types/domain';

interface LeadRecommendationPanelProps {
  leadId: string;
  details: LeadDetailRow | null;
  onRecLoaded: () => void;
}

const POLL_INTERVAL_MS = 3000;
const POLL_TIMEOUT_MS = 30000;

/**
 * Renders the recommendation trigger button and result cards for a lead.
 * @param props - Lead id, details row, and reload callback after results arrive.
 * @returns Recommendation action panel.
 */
export function LeadRecommendationPanel({
  leadId,
  details,
  onRecLoaded,
}: LeadRecommendationPanelProps) {
  const { t } = useTranslation();
  const [requesting, setRequesting] = useState(false);
  const [validationError, setValidationError] = useState('');
  const [statusMessage, setStatusMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollDeadlineRef = useRef<number | null>(null);

  const recommendations = parseRecHotel(details?.rec_hotel);

  useEffect(() => {
    return () => {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
      }
    };
  }, []);

  /**
   * Polls lead detail until rec_hotel is populated or timeout elapses.
   */
  function startPolling() {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
    }

    pollDeadlineRef.current = Date.now() + POLL_TIMEOUT_MS;

    pollTimerRef.current = setInterval(async () => {
      if (pollDeadlineRef.current !== null && Date.now() >= pollDeadlineRef.current) {
        if (pollTimerRef.current) {
          clearInterval(pollTimerRef.current);
          pollTimerRef.current = null;
        }
        return;
      }

      try {
        const res = await fetch(`/api/leads/${leadId}`);
        const json = await res.json();
        if (!res.ok) {
          return;
        }

        const leadDetails = json.data?.lead_details;
        const parsed = parseRecHotel(
          Array.isArray(leadDetails) ? leadDetails[0]?.rec_hotel : leadDetails?.rec_hotel,
        );

        if (parsed && parsed.length > 0) {
          if (pollTimerRef.current) {
            clearInterval(pollTimerRef.current);
            pollTimerRef.current = null;
          }
          onRecLoaded();
        }
      } catch {
        // Silent poll failures; user can reopen the panel later.
      }
    }, POLL_INTERVAL_MS);
  }

  async function handleRequestRec() {
    setValidationError('');
    setStatusMessage(null);

    const campus = details?.campus;
    const budget = details?.budget_max;
    const roomCategory = details?.room_category;

    if (
      !isRecEligibleGender(details?.student_gender) ||
      !campus ||
      budget == null ||
      !roomCategory
    ) {
      setValidationError(
        details?.student_gender === 'other'
          ? t('leads.recGenderRequired')
          : t('leads.recFieldsRequired'),
      );
      return;
    }

    setRequesting(true);

    try {
      const res = await fetch(`/api/leads/${leadId}/request-rec`, { method: 'POST' });
      const json = await res.json();
      setRequesting(false);

      if (!res.ok) {
        setStatusMessage({
          type: 'error',
          text: json.error ?? t('leads.recRequestFailed'),
        });
        return;
      }

      setStatusMessage({
        type: 'success',
        text: t('leads.recRequestSent'),
      });
      startPolling();
    } catch {
      setRequesting(false);
      setStatusMessage({
        type: 'error',
        text: t('leads.recRequestFailed'),
      });
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {validationError && <p className="text-xs text-brand-red">{validationError}</p>}

      {statusMessage && (
        <p
          className={
            statusMessage.type === 'success' ? 'text-xs text-emerald-700' : 'text-xs text-brand-red'
          }
        >
          {statusMessage.text}
        </p>
      )}

      <Button type="button" onClick={handleRequestRec} disabled={requesting}>
        {requesting ? t('leads.recSending') : t('leads.recGet')}
      </Button>

      <LeadRecHotel
        recommendations={recommendations}
        onSelect={() => {
          // Selection is local-only until rec_hotel_selected exists.
        }}
      />
    </div>
  );
}
