/**
 * Merged activity timeline — messages, calls, tasks, and status changes sorted newest first.
 */
import {
  IconPhone,
  IconCheck,
  IconClipboardList,
  IconArrowRight,
  IconInfoCircle,
  IconMessage,
} from '@tabler/icons-react';
import { cn } from '@/lib/utils';
import { formatEnumLabel } from '@/lib/i18n/enum-labels';
import { formatDateTime } from '@/lib/i18n/format-date';
import { useTranslation } from '@/hooks/useTranslation';
import type { TimelineEntry } from '@/pages/api/leads/[id]/funnel-view';
import type { SalespersonOption } from '@/types/domain';

interface FunnelTimelineProps {
  timeline: TimelineEntry[];
  salespeople?: SalespersonOption[];
}

function getSalespersonName(
  id: string | null | undefined,
  salespeople?: SalespersonOption[],
): string {
  if (!id || !salespeople) return id ?? '—';
  return salespeople.find((s) => s.id === id)?.full_name ?? id;
}

/**
 * Incoming or outgoing chat message bubble.
 */
function MessageEntry({ entry }: { entry: TimelineEntry }) {
  const { locale } = useTranslation();
  const isOutgoing = entry.data.message_type === 'outgoing';
  const content = entry.data.content as string | null;
  const senderName = entry.data.sender_name as string | null;

  return (
    <div className={cn('flex gap-2', isOutgoing ? 'flex-row-reverse' : 'flex-row')}>
      <div
        className={cn(
          'max-w-[80%] rounded-2xl px-3 py-2 text-xs',
          isOutgoing
            ? 'rounded-tr-sm bg-brand-blue text-white'
            : 'rounded-tl-sm bg-surface-hover text-text-primary',
        )}
      >
        {senderName && (
          <p
            className={cn(
              'mb-0.5 text-[10px] font-semibold',
              isOutgoing ? 'text-blue-100' : 'text-text-secondary',
            )}
          >
            {senderName}
          </p>
        )}
        <p className="line-clamp-2 break-words">{content ?? '—'}</p>
        <p className={cn('mt-1 text-[10px]', isOutgoing ? 'text-blue-200' : 'text-text-tertiary')}>
          {formatDateTime(entry.created_at, locale)}
        </p>
      </div>
    </div>
  );
}

/**
 * CDR phone call pill.
 */
function CallEntry({ entry }: { entry: TimelineEntry }) {
  const { locale } = useTranslation();
  const notes = entry.data.notes as string | null;
  return (
    <div className="flex items-center gap-2 rounded-full border border-border-default bg-surface-card px-3 py-1.5 text-xs text-text-secondary">
      <IconPhone className="size-3.5 shrink-0 text-text-tertiary" />
      <span className="flex-1 truncate">{notes ?? 'Çağrı kaydı'}</span>
      <span className="shrink-0 text-[10px] text-text-tertiary">
        {formatDateTime(entry.created_at, locale)}
      </span>
    </div>
  );
}

/**
 * Conversation start divider.
 */
function MessageStartEntry({ entry }: { entry: TimelineEntry }) {
  const { locale } = useTranslation();
  return (
    <div className="flex items-center gap-2">
      <div className="h-px flex-1 bg-border-default" />
      <span className="text-[10px] text-text-tertiary">
        Yeni konuşma başladı · {formatDateTime(entry.created_at, locale)}
      </span>
      <div className="h-px flex-1 bg-border-default" />
    </div>
  );
}

/**
 * Task created row.
 */
function TaskCreatedEntry({
  entry,
  salespeople,
}: {
  entry: TimelineEntry;
  salespeople?: SalespersonOption[];
}) {
  const { locale } = useTranslation();
  const taskType = entry.data.task_type as string;
  const dueWhen = entry.data.due_when as string | null;
  const assignedTo = entry.data.assigned_to as string | null;
  const notes = entry.data.notes as string | null;
  const label = formatEnumLabel(locale, 'task', taskType);

  return (
    <div className="flex items-start gap-2 text-xs text-text-secondary">
      <IconClipboardList className="mt-0.5 size-3.5 shrink-0 text-text-tertiary" />
      <div className="min-w-0 flex-1">
        <span className="font-medium text-text-primary">{label}</span>
        {dueWhen && (
          <span className="ml-1">
            ·{' '}
            {new Date(dueWhen).toLocaleDateString('tr-TR', {
              day: '2-digit',
              month: '2-digit',
              year: '2-digit',
            })}
          </span>
        )}
        {assignedTo && (
          <span className="ml-1">· {getSalespersonName(assignedTo, salespeople)}</span>
        )}
        {notes && <p className="mt-0.5 truncate text-text-tertiary">{notes}</p>}
      </div>
      <span className="shrink-0 text-[10px] text-text-tertiary">
        {formatDateTime(entry.created_at, locale)}
      </span>
    </div>
  );
}

/**
 * Task completed row — muted.
 */
function TaskCompletedEntry({ entry }: { entry: TimelineEntry }) {
  const { locale } = useTranslation();
  const taskType = entry.data.task_type as string;
  const label = formatEnumLabel(locale, 'task', taskType);

  return (
    <div className="flex items-center gap-2 text-xs text-text-tertiary">
      <IconCheck className="size-3.5 shrink-0 text-emerald-500" />
      <span className="flex-1">
        {label} · <span className="text-emerald-600">Tamamlandı</span>
      </span>
      <span className="shrink-0 text-[10px]">{formatDateTime(entry.created_at, locale)}</span>
    </div>
  );
}

/**
 * Funnel status change row.
 */
function StatusChangeEntry({
  entry,
  salespeople,
}: {
  entry: TimelineEntry;
  salespeople?: SalespersonOption[];
}) {
  const { locale } = useTranslation();
  const prev = entry.data.previous_status as string | null;
  const next = entry.data.funnel_status_at_time as string | null;
  const salespersonId = entry.data.salesperson_id as string | null;
  const prevLabel = prev ? formatEnumLabel(locale, 'funnel', prev) : '—';
  const nextLabel = next ? formatEnumLabel(locale, 'funnel', next) : '—';

  return (
    <div className="flex items-center gap-2 text-xs text-text-secondary">
      <IconArrowRight className="size-3.5 shrink-0 text-text-tertiary" />
      <span className="flex-1">
        <span className="text-text-tertiary">{prevLabel}</span>
        {' → '}
        <span className="font-medium text-text-primary">{nextLabel}</span>
        {salespersonId && (
          <span className="ml-1 text-text-tertiary">
            · {getSalespersonName(salespersonId, salespeople)}
          </span>
        )}
      </span>
      <span className="shrink-0 text-[10px] text-text-tertiary">
        {formatDateTime(entry.created_at, locale)}
      </span>
    </div>
  );
}

/**
 * Generic contact history row.
 */
function HistoryEntry({ entry }: { entry: TimelineEntry }) {
  const { locale } = useTranslation();
  const interactionType = entry.data.interaction_type as string;
  const notes = entry.data.notes as string | null;
  const label = formatEnumLabel(locale, 'interaction', interactionType);

  return (
    <div className="flex items-start gap-2 text-xs text-text-secondary">
      <IconInfoCircle className="mt-0.5 size-3.5 shrink-0 text-text-tertiary" />
      <div className="min-w-0 flex-1">
        <span className="font-medium">{label}</span>
        {notes && <p className="mt-0.5 truncate text-text-tertiary">{notes}</p>}
      </div>
      <span className="shrink-0 text-[10px] text-text-tertiary">
        {formatDateTime(entry.created_at, locale)}
      </span>
    </div>
  );
}

/**
 * Renders the merged chronological activity feed for a lead.
 * @param props - Timeline entries and optional salespeople list for name resolution.
 * @returns Timeline element.
 */
export function FunnelTimeline({ timeline, salespeople }: FunnelTimelineProps) {
  if (timeline.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-10 text-text-tertiary">
        <IconMessage className="size-8 opacity-30" />
        <p className="text-sm">Henüz aktivite yok</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 px-4 py-3">
      {timeline.map((entry) => {
        switch (entry.type) {
          case 'message':
            return <MessageEntry key={entry.id} entry={entry} />;
          case 'call':
            return <CallEntry key={entry.id} entry={entry} />;
          case 'message_start':
            return <MessageStartEntry key={entry.id} entry={entry} />;
          case 'task_created':
            return <TaskCreatedEntry key={entry.id} entry={entry} salespeople={salespeople} />;
          case 'task_completed':
            return <TaskCompletedEntry key={entry.id} entry={entry} />;
          case 'status_change':
            return <StatusChangeEntry key={entry.id} entry={entry} salespeople={salespeople} />;
          case 'history':
            return <HistoryEntry key={entry.id} entry={entry} />;
          default:
            return null;
        }
      })}
    </div>
  );
}
