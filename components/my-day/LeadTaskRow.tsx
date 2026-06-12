/**
 * Shared lead row for contact-driven task containers (Nurtures, Calls, Post-visit).
 * Displays lead name, stage pill, last-contact age, and one primary action button.
 */
import { IconClock } from '@tabler/icons-react';
import { cn } from '@/lib/utils';
import { StatusBadge } from '@/components/ui/status-badge';

export interface LeadTaskRowData {
  uuid: string;
  name: string | null;
  phone?: string | null;
  stage: string;
  channel?: string | null;
  lastContactLabel?: string;
  /** Set when the 24h WhatsApp window is closing (0 < hoursLeft ≤ 6). */
  hoursUntil24h?: number | null;
  actionLabel: string;
}

interface LeadTaskRowProps {
  row: LeadTaskRowData;
  onOpen: (uuid: string) => void;
  onAction: (uuid: string) => void;
}

function ChannelBadge({ channel }: { channel: string | null | undefined }) {
  if (channel === 'whatsapp') {
    return <span className="shrink-0 text-[10px] font-bold text-green-600">WA</span>;
  }
  if (channel === 'instagram') {
    return <span className="shrink-0 text-[10px] font-bold text-pink-600">IG</span>;
  }
  return null;
}

export function LeadTaskRow({ row, onOpen, onAction }: LeadTaskRowProps) {
  const flag24h =
    typeof row.hoursUntil24h === 'number' && row.hoursUntil24h > 0 && row.hoursUntil24h <= 6;

  return (
    <div
      className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-row-hover"
      onClick={() => onOpen(row.uuid)}
    >
      <ChannelBadge channel={row.channel} />

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-medium text-text-primary">
            {row.name ?? row.phone ?? '—'}
          </span>
          {flag24h && (
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-amber-500/20 bg-amber-500/15 px-1.5 py-0.5 text-[11px] text-amber-700">
              <IconClock className="h-3 w-3" />
              {row.hoursUntil24h! < 1 ? '<1s' : `${Math.round(row.hoursUntil24h!)}s`}
            </span>
          )}
        </div>
        <div className="mt-0.5 flex items-center gap-1.5">
          <StatusBadge status={row.stage} type="funnel" className="text-[10px] py-0 px-1.5" />
          {row.lastContactLabel && (
            <span className="text-xs text-text-tertiary">· {row.lastContactLabel}</span>
          )}
          {row.phone && !row.name && (
            <span className="truncate text-xs text-text-tertiary">· {row.phone}</span>
          )}
        </div>
      </div>

      <button
        type="button"
        className={cn(
          'shrink-0 rounded-md border border-border-default bg-surface-card px-2.5 py-1 text-xs font-medium text-text-secondary',
          'hover:border-border-strong hover:text-text-primary transition-colors',
        )}
        onClick={(e) => {
          e.stopPropagation();
          onAction(row.uuid);
        }}
      >
        {row.actionLabel}
      </button>
    </div>
  );
}
