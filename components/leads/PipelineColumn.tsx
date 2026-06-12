/**
 * Single funnel stage column for the pipeline board.
 */
import { cn } from '@/lib/utils';
import { formatEnumLabel } from '@/lib/i18n/enum-labels';
import { useTranslation } from '@/hooks/useTranslation';
import { PipelineLeadCard } from '@/components/leads/PipelineLeadCard';
import type { LeadWithDetails } from '@/types/domain';

interface PipelineColumnProps {
  stage: string;
  leads: LeadWithDetails[];
  isTerminal?: boolean;
  compact?: boolean;
  selectedId?: string | null;
  onLeadClick: (uuid: string) => void;
  labelOverride?: string;
  highlightInactive?: boolean;
}

/**
 * Renders a kanban column for a single funnel stage.
 * In compact mode the column expands to fill available width instead of using a fixed size.
 */
export function PipelineColumn({
  stage,
  leads,
  isTerminal = false,
  compact = false,
  selectedId,
  onLeadClick,
  labelOverride,
  highlightInactive = false,
}: PipelineColumnProps) {
  const { locale } = useTranslation();
  const label = labelOverride ?? formatEnumLabel(locale, 'funnel', stage);

  return (
    <div
      className={cn(
        'flex flex-col rounded-xl border border-border-default',
        compact ? 'min-w-0 flex-1' : 'w-[260px] shrink-0',
        isTerminal ? 'bg-surface-page opacity-75' : 'bg-surface-page',
      )}
    >
      {/* Column header */}
      <div
        className={cn(
          'flex items-center justify-between gap-1 border-b border-border-default',
          compact ? 'px-1.5 py-1' : 'px-3 py-2.5',
        )}
      >
        <span
          className={cn(
            'truncate font-semibold',
            compact ? 'text-[9px]' : 'text-xs',
            isTerminal ? 'text-text-tertiary' : 'text-text-primary',
          )}
        >
          {label}
        </span>
        <span
          className={cn(
            'shrink-0 rounded-full font-bold tabular-nums',
            compact ? 'px-1 py-px text-[8px]' : 'px-2 py-0.5 text-[10px]',
            isTerminal ? 'bg-surface-card text-text-tertiary' : 'bg-brand-blue/10 text-brand-blue',
            leads.length === 0 && 'opacity-40',
          )}
        >
          {leads.length}
        </span>
      </div>

      {/* Card list */}
      <div
        className={cn('flex flex-col overflow-y-auto', compact ? 'gap-0.5 p-1' : 'gap-2 p-2')}
        style={{ maxHeight: compact ? '65vh' : '70vh' }}
      >
        {leads.length === 0 ? (
          <p
            className={cn(
              'text-center text-text-tertiary',
              compact ? 'py-3 text-[9px]' : 'py-6 text-[11px]',
            )}
          >
            —
          </p>
        ) : (
          leads.map((lead) => (
            <PipelineLeadCard
              key={lead.uuid}
              lead={lead}
              isSelected={selectedId === lead.uuid}
              compact={compact}
              highlightInactive={highlightInactive}
              onClick={onLeadClick}
            />
          ))
        )}
      </div>
    </div>
  );
}
