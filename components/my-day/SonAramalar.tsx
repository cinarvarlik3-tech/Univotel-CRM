/**
 * Son Aramalar (Last Calls) — My Day section (D22, §4.5).
 * Shows per-agent inbound + outbound CDR calls, newest first.
 * Each row = lead · time · direction · answered/missed + one-tap "log info".
 * Unlogged calls are highlighted as needing attention.
 */
import { IconPhone, IconPhoneIncoming, IconPhoneOff, IconPhoneX } from '@tabler/icons-react';
import { Button } from '@/components/ui/button';
import { formatRelativeTime } from '@/lib/ui/format-relative-time';
import type { RecentCallItem } from '@/lib/my-day/aggregations';
import { cn } from '@/lib/utils';

interface SonAramalarProps {
  calls: RecentCallItem[];
  onOpenLead: (leadUuid: string) => void;
}

function CallIcon({
  direction,
  answered,
}: {
  direction: 'inbound' | 'outbound';
  answered: boolean;
}) {
  if (!answered) {
    return direction === 'inbound' ? (
      <IconPhoneX className="size-3.5 text-brand-red" />
    ) : (
      <IconPhoneOff className="size-3.5 text-text-tertiary" />
    );
  }
  return direction === 'inbound' ? (
    <IconPhoneIncoming className="size-3.5 text-green-500" />
  ) : (
    <IconPhone className="size-3.5 text-brand-blue" />
  );
}

function callLabel(
  direction: 'inbound' | 'outbound',
  answered: boolean,
  durationSeconds: number,
): string {
  if (!answered) {
    return direction === 'inbound' ? 'Cevapsız (gelen)' : 'Cevap yok (giden)';
  }
  const dk = Math.floor(durationSeconds / 60);
  const sn = durationSeconds % 60;
  const dur = dk > 0 ? `${dk}dk ${sn}sn` : `${sn}sn`;
  return direction === 'inbound' ? `Gelen · ${dur}` : `Giden · ${dur}`;
}

export function SonAramalar({ calls, onOpenLead }: SonAramalarProps) {
  if (calls.length === 0) {
    return (
      <div className="rounded-lg border border-border-default bg-surface-card px-4 py-4 text-center">
        <p className="text-sm text-text-tertiary">Son 20 aramada kayıt yok.</p>
      </div>
    );
  }

  const unloggedCount = calls.filter((c) => !c.isLogged).length;

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-semibold text-text-primary">Son Aramalar</p>
        {unloggedCount > 0 && (
          <span className="rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-semibold text-orange-700">
            {unloggedCount} kaydedilmedi
          </span>
        )}
      </div>
      <div className="flex flex-col gap-1.5">
        {calls.map((call) => (
          <div
            key={call.id}
            className={cn(
              'flex items-center gap-3 rounded-lg border bg-surface-card px-3 py-2.5',
              !call.isLogged
                ? 'border-orange-200 bg-orange-50/30 dark:border-orange-900/40 dark:bg-orange-950/10'
                : 'border-border-default',
            )}
          >
            <CallIcon direction={call.direction} answered={call.answered} />

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  className="truncate text-sm font-medium text-text-primary hover:underline"
                  onClick={() => onOpenLead(call.leadUuid)}
                >
                  {call.leadName ?? call.leadPhone ?? '—'}
                </button>
                {!call.isLogged && (
                  <span className="shrink-0 rounded-full bg-orange-100 px-1.5 py-0.5 text-[9px] font-semibold text-orange-700">
                    Kaydedilmedi
                  </span>
                )}
              </div>
              <div className="mt-0.5 flex items-center gap-2 text-xs text-text-tertiary">
                <span>{callLabel(call.direction, call.answered, call.durationSeconds)}</span>
                <span>·</span>
                <span>{formatRelativeTime(new Date(call.calledAt))}</span>
              </div>
            </div>

            {/* D22: one-tap "log info" opens the lead panel */}
            <Button
              size="sm"
              variant={call.isLogged ? 'secondary' : 'default'}
              className="shrink-0 text-xs"
              onClick={() => onOpenLead(call.leadUuid)}
            >
              {call.isLogged ? 'Görüntüle' : 'Kaydet'}
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
