/**
 * Pipeline board view — groups leads into funnel stage columns.
 */
import { useMemo } from 'react';
import useSWR from 'swr';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { PipelineColumn } from '@/components/leads/PipelineColumn';
import { FUNNEL_COMPARTMENTS, FUNNEL_STATUSES, TERMINAL_FUNNEL_STATUSES } from '@/lib/constants';
import { buildLeadsQueryString } from '@/lib/ui/build-leads-query-string';
import { isFieldFilterActive } from '@/types/filter';
import type { LeadListFilterState } from '@/types/filter';
import type { LeadWithDetails } from '@/types/domain';
import { useTranslation } from '@/hooks/useTranslation';

const TERMINAL_SET = new Set<string>(TERMINAL_FUNNEL_STATUSES);
const ACTIVE_STAGES = FUNNEL_STATUSES.filter((s) => !TERMINAL_SET.has(s));
const TERMINAL_STAGES = FUNNEL_STATUSES.filter((s) => TERMINAL_SET.has(s));
const SKIP_PIPELINE_FIELDS = new Set(['funnel_status']);

const COMPARTMENT_I18N_KEYS: Record<string, string> = {
  cold: 'compartments.cold',
  'expecting-call': 'compartments.expectingCall',
  nurture: 'compartments.nurture',
  'will-visit': 'compartments.willVisit',
  'failed-visit': 'compartments.failedVisit',
  'post-visit-nurture': 'compartments.postVisit',
  downpayment: 'compartments.downpayment',
  'deal-signed': 'compartments.dealSigned',
};

interface PipelineViewProps {
  appliedState: LeadListFilterState;
  mine?: boolean;
  compact?: boolean;
  selectedId?: string | null;
  onLeadClick: (uuid: string) => void;
  /** When true, groups columns by FUNNEL_COMPARTMENTS instead of individual funnel stages. */
  compartmentMode?: boolean;
}

async function fetchPipeline(url: string): Promise<{ leads: LeadWithDetails[] }> {
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch pipeline');
  const json = await res.json();
  return json.data as { leads: LeadWithDetails[] };
}

/**
 * Builds the query string for the pipeline API from filter state.
 * Strips funnel_status filter since all stages are shown as columns.
 */
function buildPipelineQuery(state: LeadListFilterState, mine?: boolean): string {
  return buildLeadsQueryString({
    search: state.search,
    fieldFilters: state.fieldFilters,
    createdFrom: state.createdFrom,
    createdTo: state.createdTo,
    slaFrom: state.slaFrom,
    slaTo: state.slaTo,
    lastContactFrom: state.lastContactFrom,
    lastContactTo: state.lastContactTo,
    moveInFrom: state.moveInFrom,
    moveInTo: state.moveInTo,
    skipFields: SKIP_PIPELINE_FIELDS,
    forceFieldFilters: {
      deal_awaiting: { mode: 'match', value: 'false' },
    },
    mine,
  });
}

function groupByStage(leads: LeadWithDetails[]): Record<string, LeadWithDetails[]> {
  const map: Record<string, LeadWithDetails[]> = {};
  for (const lead of leads) {
    const stage = lead.funnel_status;
    if (!map[stage]) map[stage] = [];
    map[stage].push(lead);
  }
  return map;
}

function groupByCompartment(leads: LeadWithDetails[]): Record<string, LeadWithDetails[]> {
  const stageToCompartment: Record<string, string> = {};
  for (const [compartment, stages] of Object.entries(FUNNEL_COMPARTMENTS)) {
    for (const stage of stages) {
      stageToCompartment[stage] = compartment;
    }
  }
  const map: Record<string, LeadWithDetails[]> = {};
  for (const lead of leads) {
    const compartment = stageToCompartment[lead.funnel_status] ?? lead.funnel_status;
    if (!map[compartment]) map[compartment] = [];
    map[compartment].push(lead);
  }
  return map;
}

/**
 * Renders the pipeline kanban board grouped by funnel stage.
 */
export function PipelineView({
  appliedState,
  mine,
  compact = false,
  selectedId,
  onLeadClick,
  compartmentMode = false,
}: PipelineViewProps) {
  const { t } = useTranslation();
  const qs = buildPipelineQuery(appliedState, mine);
  const url = `/api/leads/pipeline${qs}`;

  const funnelFilterActive = isFieldFilterActive(appliedState.fieldFilters.funnel_status);
  const highlightInactive = appliedState.search.trim().length > 0;

  const { data, error, isLoading } = useSWR(url, fetchPipeline, {
    revalidateOnFocus: false,
    keepPreviousData: true,
  });

  const grouped = useMemo(
    () =>
      compartmentMode ? groupByCompartment(data?.leads ?? []) : groupByStage(data?.leads ?? []),
    [data, compartmentMode],
  );

  const compartmentOrder = Object.keys(FUNNEL_COMPARTMENTS);

  const containerClass = cn('flex pb-4 pt-1', compact ? 'gap-1' : 'gap-3 overflow-x-auto');

  if (isLoading && !data) {
    return (
      <div className={containerClass}>
        {ACTIVE_STAGES.map((stage) => (
          <div
            key={stage}
            className={cn(
              'flex flex-col gap-2 rounded-xl border border-border-default bg-surface-page p-3',
              compact ? 'min-w-0 flex-1' : 'w-[260px] shrink-0',
            )}
          >
            <Skeleton className="h-4 w-16" />
            <Skeleton className={cn('w-full', compact ? 'h-6' : 'h-[72px]')} />
            <Skeleton className={cn('w-full', compact ? 'h-6 opacity-70' : 'h-[72px]')} />
            {!compact && <Skeleton className="h-[72px] w-full opacity-60" />}
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <p className="py-8 text-center text-sm text-brand-red">{t('leads.pipelineLoadFailed')}</p>
    );
  }

  return (
    <>
      {funnelFilterActive && (
        <p className="mb-2 text-xs text-text-secondary">{t('filters.pipelineFunnelHint')}</p>
      )}
      <div className={containerClass}>
        {compartmentMode ? (
          compartmentOrder.map((compartment) => (
            <PipelineColumn
              key={compartment}
              stage={compartment}
              leads={grouped[compartment] ?? []}
              compact={compact}
              selectedId={selectedId}
              onLeadClick={onLeadClick}
              highlightInactive={highlightInactive}
              labelOverride={t(
                (COMPARTMENT_I18N_KEYS[compartment] ?? `compartments.${compartment}`) as Parameters<
                  typeof t
                >[0],
              )}
            />
          ))
        ) : (
          <>
            {ACTIVE_STAGES.map((stage) => (
              <PipelineColumn
                key={stage}
                stage={stage}
                leads={grouped[stage] ?? []}
                compact={compact}
                selectedId={selectedId}
                onLeadClick={onLeadClick}
                highlightInactive={highlightInactive}
              />
            ))}

            <div
              className={cn(
                'self-stretch bg-border-default',
                compact ? 'mx-0.5 w-px' : 'mx-1 w-px shrink-0',
              )}
            />

            {TERMINAL_STAGES.map((stage) => (
              <PipelineColumn
                key={stage}
                stage={stage}
                leads={grouped[stage] ?? []}
                isTerminal
                compact={compact}
                selectedId={selectedId}
                onLeadClick={onLeadClick}
                highlightInactive={highlightInactive}
              />
            ))}
          </>
        )}
      </div>
    </>
  );
}
