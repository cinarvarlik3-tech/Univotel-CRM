/**
 * Contact history timeline list component.
 */
import { useTranslation } from '@/hooks/useTranslation';
import { formatEnumLabel } from '@/lib/i18n/enum-labels';
import { formatDateTime } from '@/lib/i18n/format-date';
import type { ContactHistoryEntry } from '@/types/domain';

interface ContactHistoryListProps {
  entries: ContactHistoryEntry[];
}

/**
 * Renders metadata JSON as readable key-value lines.
 * @param metadata - Contact history metadata object.
 * @returns Formatted metadata block or null.
 */
function MetadataBlock({ metadata }: { metadata: Record<string, unknown> | null | undefined }) {
  if (!metadata || Object.keys(metadata).length === 0) return null;

  return (
    <pre className="mt-1.5 overflow-auto rounded-lg bg-muted p-2 text-[11px] text-text-primary">
      {JSON.stringify(metadata, null, 2)}
    </pre>
  );
}

/**
 * Renders contact history as a vertical timeline.
 * @param props - Array of contact history entries.
 * @returns Timeline list element.
 */
export function ContactHistoryList({ entries }: ContactHistoryListProps) {
  const { locale, t } = useTranslation();

  if (entries.length === 0) {
    return <p className="text-sm text-text-secondary">{t('leads.noContactHistory')}</p>;
  }

  return (
    <ol className="relative space-y-0 border-l border-border-default pl-4">
      {entries.map((entry) => (
        <li key={entry.id} className="relative pb-5 last:pb-0">
          <span className="absolute -left-[5px] top-1.5 size-2 rounded-full bg-brand-blue-mid" />
          <time className="block text-[11px] text-text-tertiary">
            {formatDateTime(entry.created_at, locale)}
          </time>
          <p className="mt-0.5 text-sm font-medium text-text-primary">
            {formatEnumLabel(locale, 'interaction', entry.interaction_type)}
          </p>
          {entry.interaction_source && (
            <p className="text-xs text-text-secondary">{entry.interaction_source}</p>
          )}
          {entry.notes && (
            <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-text-primary">
              {entry.notes}
            </p>
          )}
          {entry.status_changed && entry.previous_status && (
            <p className="mt-1 text-xs text-text-secondary">
              {formatEnumLabel(locale, 'funnel', entry.previous_status)} →{' '}
              {formatEnumLabel(locale, 'funnel', entry.funnel_status_at_time ?? '')}
            </p>
          )}
          <MetadataBlock metadata={entry.metadata} />
        </li>
      ))}
    </ol>
  );
}
