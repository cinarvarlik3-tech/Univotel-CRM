/**
 * My Day attention queue — computed needs-action items with phone, Chatwoot, panel, and task buttons.
 */
import { useState } from 'react';
import { IconExternalLink, IconPhone } from '@tabler/icons-react';
import { useTranslation } from '@/hooks/useTranslation';
import { Button } from '@/components/ui/button';
import { CreateTaskDialog } from '@/components/actions/CreateTaskDialog';
import type { AttentionItem } from '@/lib/my-day/aggregations';

interface AttentionQueueProps {
  items: AttentionItem[];
  onMutate: () => void;
  onOpenLead: (leadUuid: string) => void;
}

function kindLabel(kind: AttentionItem['kind'], t: (k: string) => string): string {
  switch (kind) {
    case 'not_contacted':
      return t('myDay.notContactedAttention');
    case 'unresolved_visit':
      return t('myDay.unresolvedVisit');
    case 'expecting_call':
      return t('myDay.expectingCallAttention');
  }
}

function kindVariant(kind: AttentionItem['kind']): string {
  switch (kind) {
    case 'not_contacted':
      return 'bg-[var(--badge-warning-bg)] text-[var(--badge-warning-text)]';
    case 'unresolved_visit':
      return 'bg-blue-50 text-brand-blue dark:bg-blue-950/30 dark:text-blue-300';
    case 'expecting_call':
      return 'bg-surface-card text-text-secondary border border-border-default';
  }
}

export function AttentionQueue({ items, onMutate, onOpenLead }: AttentionQueueProps) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState<string | null>(null);
  const [taskDialogLeadUuid, setTaskDialogLeadUuid] = useState<string | null>(null);

  if (items.length === 0) {
    return (
      <div className="rounded-lg border border-border-default bg-surface-card px-4 py-5 text-center">
        <p className="text-sm text-text-tertiary">{t('myDay.noAttentionItems')}</p>
      </div>
    );
  }

  async function markContacted(leadUuid: string) {
    setLoading(leadUuid);
    await fetch(`/api/leads/${leadUuid}/log-contact`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ interaction_type: 'call_success' }),
    });
    setLoading(null);
    onMutate();
  }

  return (
    <>
      <div>
        <p className="mb-3 text-sm font-semibold text-text-primary">{t('myDay.attentionQueue')}</p>
        <div className="flex flex-col gap-1.5">
          {items.map((item) => (
            <div
              key={`${item.kind}-${item.leadUuid}-${item.visitId ?? ''}`}
              className="rounded-lg border border-border-default bg-surface-card px-3 py-2.5"
            >
              {/* Kind badge + clickable name */}
              <div className="flex items-center gap-2">
                <span
                  className={`inline-block shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold ${kindVariant(item.kind)}`}
                >
                  {kindLabel(item.kind, t)}
                </span>
                <button
                  type="button"
                  className="min-w-0 flex-1 truncate text-left text-xs font-medium text-text-primary hover:underline"
                  onClick={() => onOpenLead(item.leadUuid)}
                >
                  {item.leadName ?? '—'}
                </button>
              </div>

              {/* Stage + phone */}
              <div className="mt-0.5 flex flex-wrap items-center gap-2">
                {item.leadFunnelStatus && (
                  <span className="text-[11px] text-text-tertiary">{item.leadFunnelStatus}</span>
                )}
                {item.leadPhone && (
                  <a
                    href={`tel:${item.leadPhone}`}
                    className="flex items-center gap-0.5 text-[11px] text-brand-blue hover:underline"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <IconPhone size={11} />
                    {item.leadPhone}
                  </a>
                )}
              </div>

              {/* Actions */}
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                {(item.kind === 'not_contacted' || item.kind === 'expecting_call') && (
                  <Button
                    variant="default"
                    size="sm"
                    disabled={loading === item.leadUuid}
                    onClick={() => markContacted(item.leadUuid)}
                  >
                    {loading === item.leadUuid ? '…' : t('myDay.markContacted')}
                  </Button>
                )}
                {item.kind === 'unresolved_visit' && (
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => {
                      window.location.href = '/visits';
                    }}
                  >
                    {t('myDay.updateVisit')}
                  </Button>
                )}
                {item.chatwootUrl && (
                  <Button variant="secondary" size="sm" asChild>
                    <a href={item.chatwootUrl} target="_blank" rel="noopener noreferrer">
                      <IconExternalLink size={13} className="mr-1" />
                      Chatwoot
                    </a>
                  </Button>
                )}
                <Button variant="secondary" size="sm" onClick={() => onOpenLead(item.leadUuid)}>
                  {t('common.view')}
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setTaskDialogLeadUuid(item.leadUuid)}
                >
                  {t('actions.createTask')}
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {taskDialogLeadUuid && (
        <CreateTaskDialog
          open
          leadUuid={taskDialogLeadUuid}
          onClose={() => setTaskDialogLeadUuid(null)}
          onSuccess={() => {
            setTaskDialogLeadUuid(null);
            onMutate();
          }}
        />
      )}
    </>
  );
}
