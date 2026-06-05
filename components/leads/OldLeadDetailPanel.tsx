/**
 * Read-only slide-over panel for imported old lead details.
 * Displays fields as box cards (same style as active lead panel, but no editing).
 */
import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { IconX } from '@tabler/icons-react';
import { OldLeadChatView } from '@/components/leads/OldLeadChatView';
import { ReadOnlyField } from '@/components/leads/InlineEditField';
import { SourceDetailsPanel } from '@/components/leads/SourceDetailsPanel';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useOldLeadDetail } from '@/hooks/useOldLeadDetail';
import { useTranslation } from '@/hooks/useTranslation';
import { formatEnumLabel } from '@/lib/i18n/enum-labels';
import { formatDateTime } from '@/lib/i18n/format-date';
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

function SectionHeading({ children }: { children: ReactNode }) {
  return (
    <h3 className="pb-1 pt-4 text-[11px] font-semibold uppercase tracking-wider text-text-secondary first:pt-0">
      {children}
    </h3>
  );
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

  const importMeta = sourceDetails?.import_meta as ImportMeta | undefined;

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
            {/* Header — no funnel badge, no actions */}
            <div className="relative space-y-1.5 border-b border-border-default px-5 pb-3 pt-4">
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
              <div className="flex flex-wrap items-center gap-2 text-xs text-text-secondary">
                <span>{formatEnumLabel(locale, 'source', lead.lead_source)}</span>
                {lead.message_from && (
                  <span>· {formatEnumLabel(locale, 'channel', lead.message_from)}</span>
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
                {/* Profile */}
                <SectionHeading>{t('leads.profile')}</SectionHeading>
                <div className="space-y-2">
                  <ReadOnlyField
                    label={t('filters.university')}
                    value={details?.university ?? null}
                  />
                  <ReadOnlyField
                    label={t('filters.gender')}
                    value={
                      details?.student_gender
                        ? formatStudentGender(details.student_gender, locale)
                        : null
                    }
                  />
                </div>

                {/* Record */}
                <SectionHeading>{t('oldLeads.record')}</SectionHeading>
                <div className="space-y-2">
                  <ReadOnlyField label={t('oldLeads.leadUuid')} value={lead.uuid} />
                  <ReadOnlyField
                    label={t('oldLeads.chatwootConversationId')}
                    value={
                      lead.chatwoot_conversation_id != null
                        ? String(lead.chatwoot_conversation_id)
                        : null
                    }
                  />
                  <ReadOnlyField
                    label={t('oldLeads.chatwootContactId')}
                    value={
                      lead.chatwoot_contact_id != null ? String(lead.chatwoot_contact_id) : null
                    }
                  />
                  <ReadOnlyField
                    label={t('leads.studentStage')}
                    value={formatEnumLabel(locale, 'stage', lead.student_stage)}
                  />
                  <ReadOnlyField
                    label={t('filters.language')}
                    value={formatEnumLabel(locale, 'language', lead.language ?? 'tr')}
                  />
                  <ReadOnlyField
                    label={t('leads.leadScore')}
                    value={lead.lead_score != null ? String(lead.lead_score) : null}
                  />
                  <ReadOnlyField
                    label={t('leads.created')}
                    value={formatDateTime(lead.created_at, locale)}
                  />
                  <ReadOnlyField
                    label={t('leads.updated')}
                    value={formatDateTime(lead.updated_at, locale)}
                  />
                  <ReadOnlyField
                    label={t('leads.lastContact')}
                    value={formatDateTime(lead.last_contact_at, locale)}
                  />
                  <ReadOnlyField
                    label={t('leads.assignee')}
                    value={lead.salespeople?.full_name ?? null}
                  />
                </div>

                {/* Import metadata — only if present */}
                {importMeta && typeof importMeta === 'object' && (
                  <>
                    <SectionHeading>{t('oldLeads.importMetadata')}</SectionHeading>
                    <div className="space-y-2">
                      {importMeta.identifier_kind && (
                        <ReadOnlyField
                          label={t('oldLeads.identifierType')}
                          value={importMeta.identifier_kind}
                        />
                      )}
                      {typeof importMeta.merged_count === 'number' &&
                        importMeta.merged_count > 0 && (
                          <ReadOnlyField
                            label={t('oldLeads.mergedConversations')}
                            value={String(importMeta.merged_count)}
                          />
                        )}
                      {Array.isArray(importMeta.merged_conversation_ids) &&
                        importMeta.merged_conversation_ids.length > 0 && (
                          <ReadOnlyField
                            label={t('oldLeads.mergedConversationIds')}
                            value={importMeta.merged_conversation_ids.join(', ')}
                          />
                        )}
                    </div>
                  </>
                )}

                {/* Source details */}
                <div className="mt-4">
                  <SourceDetailsPanel sourceDetails={sourceDetails} embedded />
                </div>
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
