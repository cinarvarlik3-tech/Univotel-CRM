/**
 * Son Aramalar — timeline feed of recent CDR calls.
 * Unlogged calls are badged and can be filtered with the "Sadece kaydedilmemiş" toggle.
 * D15 attention-queue backstop is folded in as an "unlogged" badge + filter state.
 */
import { useState } from 'react';
import { IconPhoneIncoming, IconPhoneOutgoing } from '@tabler/icons-react';
import { cn } from '@/lib/utils';
import { TaskContainerCard } from './TaskContainerCard';
import type { RecentCallRow } from '@/lib/my-day/cockpit';

interface SonAramalarCardProps {
  calls: RecentCallRow[];
  isLoading?: boolean;
  onOpenLead: (uuid: string) => void;
}

export function SonAramalarCard({ calls, isLoading, onOpenLead }: SonAramalarCardProps) {
  const [onlyUnlogged, setOnlyUnlogged] = useState(false);
  const unloggedCount = calls.filter((c) => !c.isLogged).length;
  const shown = onlyUnlogged ? calls.filter((c) => !c.isLogged) : calls;

  const headerAction = (
    <button
      type="button"
      onClick={() => setOnlyUnlogged((v) => !v)}
      className={cn(
        'shrink-0 rounded-md border px-2.5 py-1 text-[11px] font-medium transition-colors',
        onlyUnlogged
          ? 'border-amber-400/30 bg-amber-500/15 text-amber-700'
          : 'border-border-default bg-surface-card text-text-secondary hover:text-text-primary',
      )}
    >
      {onlyUnlogged ? `Kaydedilmemiş (${unloggedCount})` : 'Kaydedilmemiş'}
    </button>
  );

  return (
    <TaskContainerCard
      containerKey="recentCalls"
      count={unloggedCount > 0 ? unloggedCount : undefined}
      headerAction={headerAction}
      isLoading={isLoading}
      isEmpty={!isLoading && shown.length === 0}
    >
      {shown.map((call) => (
        <div
          key={call.id}
          className="flex items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-row-hover"
        >
          {/* Time */}
          <span className="w-10 shrink-0 text-xs tabular-nums text-text-tertiary">
            {call.timeLabel}
          </span>

          {/* Direction icon */}
          {call.direction === 'inbound' ? (
            <IconPhoneIncoming className="h-4 w-4 shrink-0 text-emerald-600" />
          ) : (
            <IconPhoneOutgoing className="h-4 w-4 shrink-0 text-indigo-600" />
          )}

          {/* Lead info */}
          <div className="min-w-0 flex-1">
            <button
              type="button"
              className="truncate text-sm font-medium text-text-primary hover:underline"
              onClick={() => onOpenLead(call.leadUuid)}
            >
              {call.leadName ?? call.leadPhone ?? '—'}
            </button>
            <div className="mt-0.5 flex items-center gap-2 text-xs">
              <span className={call.answered ? 'text-emerald-600' : 'text-rose-600'}>
                {call.answered ? 'Cevaplandı' : 'Cevapsız'}
              </span>
              {!call.isLogged && (
                <span className="rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[10px] text-amber-700">
                  kaydedilmedi
                </span>
              )}
            </div>
          </div>

          {/* Action */}
          {!call.isLogged && (
            <button
              type="button"
              className="shrink-0 rounded-md border border-border-default bg-surface-card px-2.5 py-1 text-xs font-medium text-text-secondary hover:border-border-strong hover:text-text-primary transition-colors"
              onClick={() => onOpenLead(call.leadUuid)}
            >
              Bilgi kaydet
            </button>
          )}
        </div>
      ))}
    </TaskContainerCard>
  );
}
