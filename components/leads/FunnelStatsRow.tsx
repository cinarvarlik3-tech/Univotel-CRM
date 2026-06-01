/**
 * Compact stats row — missing fields, funnel distribution summary, hotel rec status.
 */
import { useState } from 'react';
import { IconCheck } from '@tabler/icons-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { formatEnumLabel } from '@/lib/i18n/enum-labels';
import { useTranslation } from '@/hooks/useTranslation';
import { FUNNEL_STATUSES, TERMINAL_FUNNEL_STATUSES } from '@/lib/constants';
import { parseRecHotel } from '@/lib/leads/parse-rec-hotel';
import type { RecHotelItem } from '@/types/domain';
import type { FunnelViewResponse } from '@/pages/api/leads/[id]/funnel-view';

interface FunnelStatsRowProps {
  leadId: string;
  missingFields: FunnelViewResponse['missing_fields'];
  missingRecFieldNames: string[];
  distribution: Record<string, number>;
  recHotel: ReturnType<typeof parseRecHotel>;
  recFieldsComplete: boolean;
}

const TERMINAL_SET = new Set<string>(TERMINAL_FUNNEL_STATUSES);
const ACTIVE_STAGES = FUNNEL_STATUSES.filter((s) => !TERMINAL_SET.has(s));

/**
 * Renders the stats row below the pipeline strip.
 * @param props - Stats data from funnel-view API.
 * @returns Stats row element.
 */
export function FunnelStatsRow({
  leadId,
  missingFields,
  missingRecFieldNames,
  distribution,
  recHotel,
  recFieldsComplete,
}: FunnelStatsRowProps) {
  const { locale } = useTranslation();
  const [requesting, setRequesting] = useState(false);
  const [recError, setRecError] = useState('');

  // Build compact distribution text — only active stages with count > 0
  const distributionParts = ACTIVE_STAGES.filter((s) => (distribution[s] ?? 0) > 0).map((s) => {
    const label = formatEnumLabel(locale, 'funnel', s);
    const short = label.split(' ')[0] ?? label;
    return `${short}: ${distribution[s]}`;
  });
  const distributionText = distributionParts.length > 0 ? distributionParts.join(' · ') : '—';

  async function handleRequestRec() {
    setRecError('');
    setRequesting(true);
    try {
      const res = await fetch(`/api/leads/${leadId}/request-rec`, { method: 'POST' });
      const json = await res.json();
      if (!res.ok) {
        setRecError(json.error ?? 'İstek gönderilemedi');
      }
    } catch {
      setRecError('İstek gönderilemedi');
    } finally {
      setRequesting(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-start gap-x-4 gap-y-2">
        {/* Missing fields */}
        <div className="flex flex-col gap-1">
          <div
            className={cn(
              'flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
              missingFields.required_complete
                ? 'bg-emerald-100 text-emerald-700'
                : 'bg-amber-100 text-amber-700',
            )}
          >
            {missingFields.required_complete ? (
              <>
                <IconCheck className="size-3" />
                <span>Tüm bilgiler dolu</span>
              </>
            ) : (
              <span>{missingFields.count} alan eksik</span>
            )}
          </div>
          {missingFields.names.length > 0 && (
            <p className="pl-1 text-[10px] text-text-tertiary">{missingFields.names.join(', ')}</p>
          )}
        </div>

        {/* Funnel distribution summary */}
        <p className="truncate pt-0.5 text-[11px] text-text-secondary" title={distributionText}>
          {distributionText}
        </p>

        {/* Rec hotel status */}
        <RecStatus
          recHotel={recHotel}
          recFieldsComplete={recFieldsComplete}
          missingRecFieldNames={missingRecFieldNames}
          requesting={requesting}
          recError={recError}
          onRequestRec={handleRequestRec}
        />
      </div>
    </div>
  );
}

interface RecStatusProps {
  recHotel: RecHotelItem[] | null;
  recFieldsComplete: boolean;
  missingRecFieldNames: string[];
  requesting: boolean;
  recError: string;
  onRequestRec: () => void;
}

function RecStatus({
  recHotel,
  recFieldsComplete,
  missingRecFieldNames,
  requesting,
  recError,
  onRequestRec,
}: RecStatusProps) {
  if (recHotel && recHotel.length > 0) {
    return (
      <div className="flex flex-wrap gap-1">
        {recHotel.map((item) => (
          <span
            key={item.property_id}
            className="rounded-full bg-surface-hover px-2 py-0.5 text-[11px] font-medium text-text-primary"
            title={item.tags.join(', ')}
          >
            {item.hotel_name}
          </span>
        ))}
      </div>
    );
  }

  if (!recFieldsComplete) {
    return (
      <div className="flex flex-col gap-1">
        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
          Öneri için bilgi eksik
        </span>
        {missingRecFieldNames.length > 0 && (
          <p className="pl-1 text-[10px] text-text-tertiary">{missingRecFieldNames.join(', ')}</p>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-0.5">
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={onRequestRec}
        disabled={requesting}
        className="h-6 px-2 text-xs"
      >
        {requesting ? 'Gönderiliyor…' : 'Öneri Al'}
      </Button>
      {recError && <p className="text-[10px] text-brand-red">{recError}</p>}
    </div>
  );
}
