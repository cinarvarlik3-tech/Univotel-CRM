/**
 * Funnel View tab content — pipeline strip, stats row, and activity timeline.
 */
import useSWR from 'swr';
import { FunnelPipelineStrip } from '@/components/leads/FunnelPipelineStrip';
import { FunnelStatsRow } from '@/components/leads/FunnelStatsRow';
import { FunnelTimeline } from '@/components/leads/FunnelTimeline';
import { cn } from '@/lib/utils';
import type { FunnelViewResponse } from '@/pages/api/leads/[id]/funnel-view';
import type { SalespersonOption } from '@/types/domain';

interface FunnelViewProps {
  leadId: string;
  salespeople?: SalespersonOption[];
  isFullScreen: boolean;
  onToggleFullScreen: () => void;
}

async function fetcher(url: string): Promise<FunnelViewResponse> {
  const res = await fetch(url);
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? 'Failed to load');
  return json.data;
}

/**
 * Renders the Funnel View tab with pipeline, stats, and activity timeline.
 * @param props - Lead ID, salespeople list, and full screen state.
 * @returns Funnel View panel.
 */
export function FunnelView({
  leadId,
  salespeople,
  isFullScreen,
  onToggleFullScreen,
}: FunnelViewProps) {
  const { data, error, isLoading } = useSWR<FunnelViewResponse>(
    `/api/leads/${leadId}/funnel-view`,
    fetcher,
    { revalidateOnFocus: false },
  );

  return (
    <div className={cn('flex min-h-0 flex-1 flex-col', isFullScreen && 'flex-row')}>
      {/* Left column (or full column in side panel) */}
      <div
        className={cn(
          'flex min-h-0 flex-col',
          isFullScreen ? 'w-[420px] shrink-0 border-r border-border-default' : 'flex-1',
        )}
      >
        {isLoading && (
          <div className="flex flex-col gap-2 px-4 py-3">
            <div className="h-8 w-full animate-pulse rounded bg-surface-hover" />
            <div className="h-6 w-3/4 animate-pulse rounded bg-surface-hover" />
          </div>
        )}

        {error && !isLoading && (
          <p className="px-4 py-3 text-xs text-brand-red">Veriler yüklenemedi.</p>
        )}

        {data && !isLoading && (
          <>
            {/* Pipeline strip */}
            <div className="shrink-0 px-4 pb-3 pt-3">
              <FunnelPipelineStrip pipeline={data.pipeline} />
            </div>

            {/* Stats row */}
            <div className="shrink-0 border-t border-border-default px-4 py-2">
              <FunnelStatsRow
                leadId={leadId}
                missingFields={data.missing_fields}
                missingRecFieldNames={data.missing_rec_field_names}
                distribution={data.pipeline.distribution}
                recHotel={data.rec_hotel}
                recFieldsComplete={data.rec_fields_complete}
              />
            </div>

            {/* Timeline — flex-1 only in side panel mode; full screen puts timeline in right column */}
            {!isFullScreen && (
              <div className="min-h-0 flex-1 overflow-y-auto border-t border-border-default">
                <FunnelTimeline timeline={data.timeline} salespeople={salespeople} />
              </div>
            )}
          </>
        )}
      </div>

      {/* Right column — timeline only in full screen */}
      {isFullScreen && data && !isLoading && (
        <div className="min-h-0 flex-1 overflow-y-auto">
          <FunnelTimeline timeline={data.timeline} salespeople={salespeople} />
        </div>
      )}
    </div>
  );
}
