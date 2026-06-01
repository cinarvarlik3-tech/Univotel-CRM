/**
 * Read-only slide-over panel for imported old lead details.
 */
import { useEffect, useState } from 'react';
import { IconX } from '@tabler/icons-react';
import { OldLeadChatView } from '@/components/leads/OldLeadChatView';
import { SourceDetailsPanel } from '@/components/leads/SourceDetailsPanel';
import { Button } from '@/components/ui/button';
import { KvList } from '@/components/ui/kv-list';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusBadge } from '@/components/ui/status-badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useOldLeadDetail } from '@/hooks/useOldLeadDetail';
import { useTranslation } from '@/hooks/useTranslation';
import { formatEnumLabel } from '@/lib/i18n/enum-labels';
import { formatDateTime } from '@/lib/i18n/format-date';
import type { TranslateFn } from '@/lib/i18n/create-translator';
import type { Locale } from '@/lib/i18n/types';
import { displayLeadContactIdentifier } from '@/lib/ui/display-phone';
import { formatStudentGender } from '@/lib/ui/format-student-gender';
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
 * @param t - Translator function.
 */
function importMetaItems(
  sourceDetails: Record<string, unknown> | null | undefined,
  t: TranslateFn,
) {
  const meta = sourceDetails?.import_meta as ImportMeta | undefined;
  if (!meta || typeof meta !== 'object') return [];

  const items: { term: string; value: string }[] = [];

  if (meta.identifier_kind) {
    items.push({ term: t('oldLeads.identifierType'), value: meta.identifier_kind });
  }
  if (typeof meta.merged_count === 'number' && meta.merged_count > 0) {
    items.push({ term: t('oldLeads.mergedConversations'), value: String(meta.merged_count) });
  }
  if (Array.isArray(meta.merged_conversation_ids) && meta.merged_conversation_ids.length > 0) {
    items.push({
      term: t('oldLeads.mergedConversationIds'),
      value: meta.merged_conversation_ids.join(', '),
    });
  }

  return items;
}

/**
 * Builds system/Chatwoot record items for the detail panel.
 * @param lead - Old lead row.
 * @param t - Translator function.
 * @param locale - Active UI locale.
 */
function recordItems(lead: OldLeadDetailRow, t: TranslateFn, locale: Locale) {
  return [
    { term: t('oldLeads.leadUuid'), value: lead.uuid },
    {
      term: t('oldLeads.chatwootConversationId'),
      value: lead.chatwoot_conversation_id != null ? String(lead.chatwoot_conversation_id) : '—',
    },
    {
      term: t('oldLeads.chatwootContactId'),
      value: lead.chatwoot_contact_id != null ? String(lead.chatwoot_contact_id) : '—',
    },
    {
      term: t('leads.studentStage'),
      value: formatEnumLabel(locale, 'stage', lead.student_stage),
    },
    {
      term: t('filters.language'),
      value: formatEnumLabel(locale, 'language', lead.language ?? 'tr'),
    },
    { term: t('leads.leadScore'), value: String(lead.lead_score ?? 0) },
    {
      term: t('leads.created'),
      value: formatDateTime(lead.created_at, locale),
    },
    {
      term: t('leads.updated'),
      value: formatDateTime(lead.updated_at, locale),
    },
    {
      term: t('leads.lastContact'),
      value: formatDateTime(lead.last_contact_at, locale),
    },
    { term: t('leads.assignee'), value: lead.salespeople?.full_name ?? '—' },
  ];
}

/**
 * Renders read-only old lead detail sidebar.
 * @param props - Lead ID, open state, close handler.
 */
export function OldLeadDetailPanel({ leadId, open, onClose }: OldLeadDetailPanelProps) {
  const { locale, t } = useTranslation();
  const [tab, setTab] = useState('details');
  const { lead, details, loading, error } = useOldLeadDetail(
    open ? (leadId ?? undefined) : undefined,
  );

  useEffect(() => {
    if (!open) setTab('details');
  }, [open]);

  useEffect(() => {
    setTab('details');
  }, [leadId]);

  const sourceDetails =
    lead?.source_details && typeof lead.source_details === 'object'
      ? (lead.source_details as Record<string, unknown>)
      : null;

  const chatwootUrl =
    sourceDetails && typeof sourceDetails.chatwoot_url === 'string'
      ? sourceDetails.chatwoot_url
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
                aria-label={t('leads.closePanel')}
              >
                <IconX className="size-4" />
              </Button>
              <h2 className="font-heading pr-8 text-base font-bold text-text-primary">
                {lead.lead_name ?? t('common.unnamedLead')}
              </h2>
              <p className="font-mono text-sm text-text-primary">
                {displayLeadContactIdentifier(lead)}
              </p>
              <div className="flex flex-wrap items-center gap-1.5">
                <StatusBadge status={lead.funnel_status} type="funnel" />
                <span className="text-xs text-text-tertiary">·</span>
                <span className="text-xs text-text-secondary">
                  {formatEnumLabel(locale, 'source', lead.lead_source)}
                </span>
                {lead.message_from && (
                  <>
                    <span className="text-xs text-text-tertiary">·</span>
                    <span className="text-xs text-text-secondary">
                      {formatEnumLabel(locale, 'channel', lead.message_from)}
                    </span>
                  </>
                )}
              </div>
              <p className="text-xs text-text-tertiary">{t('oldLeads.historicalBanner')}</p>
            </div>

            <Tabs value={tab} onValueChange={setTab} className="flex min-h-0 flex-1 flex-col">
              <TabsList className="h-auto w-full shrink-0 justify-start gap-6 px-5 pt-2">
                <TabsTrigger value="details">{t('oldLeads.detailsTab')}</TabsTrigger>
                <TabsTrigger value="conversation">{t('leads.conversation')}</TabsTrigger>
              </TabsList>

              <TabsContent
                value="details"
                className="mt-0 min-h-0 flex-1 overflow-y-auto px-5 py-4 data-[state=inactive]:hidden"
              >
                <section className="mb-6">
                  <h3 className="mb-2 text-[11px] font-medium uppercase tracking-wide text-text-tertiary">
                    {t('leads.profile')}
                  </h3>
                  <KvList
                    layout="stacked"
                    items={[
                      { term: t('filters.university'), value: details?.university ?? '—' },
                      {
                        term: t('filters.gender'),
                        value: formatStudentGender(details?.student_gender, locale),
                      },
                    ]}
                  />
                </section>

                <section className="mb-6">
                  <h3 className="mb-2 text-[11px] font-medium uppercase tracking-wide text-text-tertiary">
                    {t('oldLeads.record')}
                  </h3>
                  <KvList layout="stacked" items={recordItems(lead, t, locale)} />
                </section>

                {importMetaItems(sourceDetails, t).length > 0 && (
                  <section className="mb-6">
                    <h3 className="mb-2 text-[11px] font-medium uppercase tracking-wide text-text-tertiary">
                      {t('oldLeads.importMetadata')}
                    </h3>
                    <KvList layout="stacked" items={importMetaItems(sourceDetails, t)} />
                  </section>
                )}

                <SourceDetailsPanel sourceDetails={sourceDetails} embedded />
              </TabsContent>

              <TabsContent
                value="conversation"
                className="mt-0 flex min-h-0 flex-1 flex-col overflow-hidden data-[state=inactive]:hidden"
              >
                {tab === 'conversation' && (
                  <OldLeadChatView
                    leadId={lead.uuid}
                    leadName={lead.lead_name}
                    chatwootUrl={chatwootUrl}
                  />
                )}
              </TabsContent>
            </Tabs>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
