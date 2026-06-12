/**
 * Bugün Taşınanlar — leads whose planned move-in date is today.
 */
import { TaskContainerCard } from './TaskContainerCard';
import type { MoveInRow } from '@/lib/my-day/cockpit';

interface MoveInsCardProps {
  moveIns: MoveInRow[];
  isLoading?: boolean;
  onOpenLead: (uuid: string) => void;
}

export function MoveInsCard({ moveIns, isLoading, onOpenLead }: MoveInsCardProps) {
  return (
    <TaskContainerCard
      containerKey="moveIns"
      count={moveIns.length}
      isLoading={isLoading}
      isEmpty={!isLoading && moveIns.length === 0}
    >
      {moveIns.map((row) => (
        <div
          key={row.uuid}
          className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-row-hover"
          onClick={() => onOpenLead(row.uuid)}
        >
          <div className="min-w-0 flex-1">
            <div className="text-sm font-medium text-text-primary truncate">
              {row.name ?? row.phone ?? '—'}
            </div>
            <div className="mt-0.5 flex items-center gap-2 text-xs text-text-tertiary">
              {row.propertyName && <span className="truncate">{row.propertyName}</span>}
            </div>
          </div>

          <button
            type="button"
            className="shrink-0 rounded-md border border-border-default bg-surface-card px-2.5 py-1 text-xs font-medium text-text-secondary hover:border-border-strong hover:text-text-primary transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              onOpenLead(row.uuid);
            }}
          >
            Taşındı işaretle
          </button>
        </div>
      ))}
    </TaskContainerCard>
  );
}
