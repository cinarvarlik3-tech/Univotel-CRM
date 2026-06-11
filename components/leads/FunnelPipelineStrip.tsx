/**
 * Horizontal pipeline visualization — stage nodes with current position highlight and hover tooltips.
 */
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { IconChevronRight } from '@tabler/icons-react';
import { cn } from '@/lib/utils';
import { formatEnumLabel } from '@/lib/i18n/enum-labels';
import { useTranslation } from '@/hooks/useTranslation';
import { FUNNEL_STATUSES, TERMINAL_FUNNEL_STATUSES } from '@/lib/constants';
import type { FunnelViewResponse } from '@/pages/api/leads/[id]/funnel-view';

interface FunnelPipelineStripProps {
  pipeline: FunnelViewResponse['pipeline'];
}

const TERMINAL_SET = new Set<string>(TERMINAL_FUNNEL_STATUSES);
const ACTIVE_STAGES = FUNNEL_STATUSES.filter((s) => !TERMINAL_SET.has(s));
const TERMINAL_STAGES = FUNNEL_STATUSES.filter((s) => TERMINAL_SET.has(s));

/**
 * Distinct short labels per stage — avoids collisions when multiple stages share the same first word.
 * Full label is always shown in the hover tooltip.
 */
const STAGE_SHORT_LABELS: Record<string, string> = {
  yeni: 'Yeni',
  aranacak: 'Aranacak',
  arandi: 'Arandı',
  'arandi-acmadi': 'Açmadı',
  'bizi-aradi-konustuk': 'Bizi\nAradı',
  ziyaret: 'Ziyaret',
  'ziyaret-etmedi': 'Ziy.\nEtmedi',
  'ziyaret-etti': 'Ziy.\nEtti',
  'teklif-gonderildi': 'Teklif',
  'kapora-alindi': 'Kapora',
  'sozlesme-imzalandi': 'Sözleşme',
  lost: 'Kayıp',
};

interface TooltipData {
  stage: string;
  count: number;
  timeInStageDays: number | null;
  isStale: boolean;
  staleDays: number | null;
}

interface TooltipState {
  data: TooltipData;
  anchor: { x: number; y: number };
}

/**
 * Portal tooltip — renders at document.body so it escapes any overflow/clip containers.
 */
function StageTooltip({ state }: { state: TooltipState }) {
  const { locale } = useTranslation();
  const label = formatEnumLabel(locale, 'funnel', state.data.stage);
  const { x, y } = state.anchor;

  return createPortal(
    <div
      className="pointer-events-none fixed z-[9999] whitespace-nowrap rounded-md border border-border-default bg-surface-card px-3 py-2 text-xs shadow-lg"
      style={{ left: x, top: y, transform: 'translate(-50%, calc(-100% - 8px))' }}
    >
      <p className="font-semibold text-text-primary">{label}</p>
      <p className="mt-0.5 text-text-secondary">{state.data.count} lead</p>
      {state.data.timeInStageDays !== null && (
        <p className="text-text-secondary">{state.data.timeInStageDays} gündür bu aşamada</p>
      )}
      {state.data.isStale && state.data.staleDays !== null && (
        <p className="mt-0.5 font-medium text-amber-600">
          {state.data.staleDays} gündür görüşülmedi
        </p>
      )}
    </div>,
    document.body,
  );
}

/**
 * Renders the horizontal funnel pipeline strip.
 * @param props - Pipeline data from funnel-view API.
 * @returns Pipeline strip element.
 */
export function FunnelPipelineStrip({ pipeline }: FunnelPipelineStripProps) {
  const { locale } = useTranslation();
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const { current_stage, time_in_stage_days, is_stale, stale_days, distribution } = pipeline;

  function handleEnter(e: React.MouseEvent<HTMLDivElement>, stage: string) {
    const rect = e.currentTarget.getBoundingClientRect();
    const count = distribution[stage] ?? 0;
    const isCurrent = stage === current_stage;
    setTooltip({
      data: {
        stage,
        count,
        timeInStageDays: isCurrent ? time_in_stage_days : null,
        isStale: isCurrent ? is_stale : false,
        staleDays: isCurrent ? stale_days : null,
      },
      anchor: { x: rect.left + rect.width / 2, y: rect.top },
    });
  }

  function handleLeave() {
    setTooltip(null);
  }

  function renderStageNode(stage: string, isTerminal: boolean) {
    const isCurrent = stage === current_stage;
    const count = distribution[stage] ?? 0;
    const fullLabel = formatEnumLabel(locale, 'funnel', stage);
    const shortLabel = STAGE_SHORT_LABELS[stage] ?? fullLabel;

    return (
      <div
        key={stage}
        className="flex flex-col items-center"
        onMouseEnter={(e) => handleEnter(e, stage)}
        onMouseLeave={handleLeave}
      >
        {/* Node circle */}
        <div
          className={cn(
            'flex items-center justify-center rounded-full border-2 text-[10px] font-bold transition-all',
            isTerminal
              ? cn(
                  'size-6 border-border-default text-text-tertiary',
                  isCurrent && 'border-text-tertiary bg-text-tertiary text-white',
                )
              : cn(
                  'size-7 border-border-strong text-text-secondary hover:border-brand-blue hover:text-brand-blue',
                  isCurrent && [
                    'border-brand-blue bg-brand-blue text-white',
                    is_stale && 'border-amber-500 bg-amber-500 ring-2 ring-amber-300',
                  ],
                ),
          )}
        >
          {count > 0 ? count : '·'}
        </div>

        {/* Stage label — allow 2 lines, no truncation */}
        <span
          className={cn(
            'mt-1 w-[52px] whitespace-pre-line text-center text-[9px] leading-tight',
            isTerminal ? 'text-text-tertiary' : 'text-text-secondary',
            isCurrent && !isTerminal && 'font-semibold text-brand-blue',
            isCurrent && is_stale && !isTerminal && 'text-amber-600',
          )}
          title={fullLabel}
        >
          {shortLabel}
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {mounted && tooltip && <StageTooltip state={tooltip} />}

      {/* Active stages row */}
      <div className="flex items-start gap-0 overflow-x-auto pb-1">
        {ACTIVE_STAGES.map((stage, idx) => (
          <div key={stage} className="flex items-start">
            {renderStageNode(stage, false)}
            {idx < ACTIVE_STAGES.length - 1 && (
              <IconChevronRight className="mt-2.5 size-3 shrink-0 text-border-strong" />
            )}
          </div>
        ))}
      </div>

      {/* Terminal stages row — smaller, greyed out */}
      <div className="flex items-start gap-3 border-t border-border-default pt-2">
        <span className="mt-0.5 shrink-0 text-[9px] uppercase tracking-wide text-text-tertiary">
          Sonuç
        </span>
        <div className="flex items-start gap-2">
          {TERMINAL_STAGES.map((stage) => renderStageNode(stage, true))}
        </div>
      </div>
    </div>
  );
}
