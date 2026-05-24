/**
 * Read-only slide-over panel for imported old lead details.
 */
import { IconX } from '@tabler/icons-react';
import { SourceDetailsPanel } from '@/components/leads/SourceDetailsPanel';
import { Button } from '@/components/ui/button';
import { KvList } from '@/components/ui/kv-list';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusBadge } from '@/components/ui/status-badge';
import { useOldLeadDetail } from '@/hooks/useOldLeadDetail';
import { displayLeadContactIdentifier } from '@/lib/ui/display-phone';
import type { OldLeadDetailRow } from '@/types/domain';

interface OldLeadDetailPanelProps {
  leadId: string | null;
  open: boolean;
  onClose: () => void;
}

interface ImportMeta {
  merged_conversation_ids?: number[];
  merged_count?: number;
  identifier_kind?: string;
}

/**
 * Builds import metadata items from source_details.import_meta.
 * @param sourceDetails - Lead source_details JSONB.
 */
function importMetaItems(sourceDetails: Record<string, unknown> | null | undefined) {
  const meta = sourceDetails?.import_meta as ImportMeta | undefined;
  if (!meta || typeof meta !== 'object') return [];

  const items: { term: string; value: string }[] = [];

  if (meta.identifier_kind) {
    items.push({ term: 'Identifier type', value: meta.identifier_kind });
  }
  if (typeof meta.merged_count === 'number' && meta.merged_count > 0) {
    items.push({ term: 'Merged conversations', value: String(meta.merged_count) });
  }
  if (Array.isArray(meta.merged_conversation_ids) && meta.merged_conversation_ids.length > 0) {
    items.push({
      term: 'Merged conversation IDs',
      value: meta.merged_conversation_ids.join(', '),
    });
  }

  return items;
}

/**
 * Builds system/Chatwoot record items for the detail panel.
 * @param lead - Old lead row.
 */
function recordItems(lead: OldLeadDetailRow) {
  return [
    { term: 'Lead UUID', value: lead.uuid },
    {
      term: 'Chatwoot conversation ID',
      value: lead.chatwoot_conversation_id != null ? String(lead.chatwoot_conversation_id) : '—',
    },
    {
      term: 'Chatwoot contact ID',
      value: lead.chatwoot_contact_id != null ? String(lead.chatwoot_contact_id) : '—',
    },
    { term: 'Student stage', value: lead.student_stage },
    { term: 'Language', value: lead.language ?? 'tr' },
    { term: 'Lead score', value: String(lead.lead_score ?? 0) },
    {
      term: 'Created',
      value: new Date(lead.created_at).toLocaleString('tr-TR'),
    },
    {
      term: 'Updated',
      value: new Date(lead.updated_at).toLocaleString('tr-TR'),
    },
    {
      term: 'Last contact',
      value: lead.last_contact_at ? new Date(lead.last_contact_at).toLocaleString('tr-TR') : '—',
    },
    { term: 'Assignee', value: lead.salespeople?.full_name ?? '—' },
  ];
}

/**
 * Renders read-only old lead detail sidebar.
 * @param props - Lead ID, open state, close handler.
 */
export function OldLeadDetailPanel({ leadId, open, onClose }: OldLeadDetailPanelProps) {
  const { lead, details, loading, error } = useOldLeadDetail(
    open ? (leadId ?? undefined) : undefined,
  );

  const sourceDetails =
    lead?.source_details && typeof lead.source_details === 'object'
      ? (lead.source_details as Record<string, unknown>)
      : null;

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="right" className="flex h-full flex-col gap-0 p-0" hideClose>
        {loading && (
          <div className="flex flex-col gap-3 p-5">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-32 w-full" />
          </div>
        )}

        {error && !loading && (
          <div className="p-5">
            <p className="text-sm text-brand-red">{error}</p>
          </div>
        )}

        {lead && !loading && (
          <>
            <div className="relative space-y-2 border-b border-border-default px-5 pb-3 pt-4">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-3 top-3 size-8"
                onClick={onClose}
                aria-label="Close panel"
              >
                <IconX className="size-4" />
              </Button>
              <h2 className="font-heading pr-8 text-base font-bold text-text-primary">
                {lead.lead_name ?? 'Unnamed lead'}
              </h2>
              <p className="font-mono text-sm text-text-primary">
                {displayLeadContactIdentifier(lead)}
              </p>
              <div className="flex flex-wrap items-center gap-1.5">
                <StatusBadge status={lead.funnel_status} type="funnel" />
                <span className="text-xs text-text-tertiary">·</span>
                <span className="text-xs text-text-secondary">{lead.lead_source}</span>
                {lead.message_from && (
                  <>
                    <span className="text-xs text-text-tertiary">·</span>
                    <span className="text-xs text-text-secondary">{lead.message_from}</span>
                  </>
                )}
              </div>
              <p className="text-xs text-text-tertiary">Historical import — read only</p>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
              <section className="mb-6">
                <h3 className="mb-2 text-[11px] font-medium uppercase tracking-wide text-text-tertiary">
                  Profile
                </h3>
                <KvList
                  layout="stacked"
                  items={[{ term: 'University', value: details?.university ?? '—' }]}
                />
              </section>

              <section className="mb-6">
                <h3 className="mb-2 text-[11px] font-medium uppercase tracking-wide text-text-tertiary">
                  Record
                </h3>
                <KvList layout="stacked" items={recordItems(lead)} />
              </section>

              {importMetaItems(sourceDetails).length > 0 && (
                <section className="mb-6">
                  <h3 className="mb-2 text-[11px] font-medium uppercase tracking-wide text-text-tertiary">
                    Import metadata
                  </h3>
                  <KvList layout="stacked" items={importMetaItems(sourceDetails)} />
                </section>
              )}

              <SourceDetailsPanel sourceDetails={sourceDetails} embedded />
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
