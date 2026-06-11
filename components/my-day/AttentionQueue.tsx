/**
 * My Day attention queue — computed needs-action items with no task row.
 */
import { useState } from 'react';
import { useTranslation } from '@/hooks/useTranslation';
import { Button } from '@/components/ui/button';
import type { AttentionItem } from '@/lib/my-day/aggregations';

interface AttentionQueueProps {
  items: AttentionItem[];
  onMutate: () => void;
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

export function AttentionQueue({ items, onMutate }: AttentionQueueProps) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState<string | null>(null);

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
      body: JSON.stringify({ interaction_type: 'contact' }),
    });
    setLoading(null);
    onMutate();
  }

  return (
    <div>
      <p className="mb-3 text-sm font-semibold text-text-primary">{t('myDay.attentionQueue')}</p>
      <div className="flex flex-col gap-1.5">
        {items.map((item) => (
          <div
            key={`${item.kind}-${item.leadUuid}-${item.visitId ?? ''}`}
            className="flex items-center justify-between gap-3 rounded-lg border border-border-default bg-surface-card px-3 py-2.5"
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span
                  className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold ${kindVariant(item.kind)}`}
                >
                  {kindLabel(item.kind, t)}
                </span>
                <p className="truncate text-xs font-medium text-text-primary">
                  {item.leadName ?? '—'}
                </p>
              </div>
              {item.leadFunnelStatus && (
                <p className="mt-0.5 text-[11px] text-text-tertiary">{item.leadFunnelStatus}</p>
              )}
            </div>
            {(item.kind === 'not_contacted' || item.kind === 'expecting_call') && (
              <Button
                variant="secondary"
                size="sm"
                disabled={loading === item.leadUuid}
                onClick={() => markContacted(item.leadUuid)}
                className="shrink-0"
              >
                {loading === item.leadUuid ? '…' : t('myDay.markContacted')}
              </Button>
            )}
            {item.kind === 'unresolved_visit' && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  void window.open(`/visits`, '_self');
                }}
                className="shrink-0"
              >
                {t('myDay.updateVisit')}
              </Button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
