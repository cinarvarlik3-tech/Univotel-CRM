/**
 * Contact history timeline list component.
 */
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
    <pre
      style={{
        fontSize: 11,
        background: '#f8fafc',
        padding: 8,
        marginTop: 4,
        overflow: 'auto',
      }}
    >
      {JSON.stringify(metadata, null, 2)}
    </pre>
  );
}

/**
 * Renders contact history entries in reverse chronological order.
 * @param props - Array of contact history entries.
 * @returns List of history items.
 */
export function ContactHistoryList({ entries }: ContactHistoryListProps) {
  if (entries.length === 0) {
    return <p>No contact history.</p>;
  }

  return (
    <ul>
      {entries.map((entry) => (
        <li key={entry.id} style={{ marginBottom: 8 }}>
          <strong>{entry.interaction_type}</strong>
          {entry.interaction_source && (
            <span style={{ color: '#64748b' }}> ({entry.interaction_source})</span>
          )}
          {' — '}
          {new Date(entry.created_at).toLocaleString('tr-TR')}
          {entry.notes && <div>{entry.notes}</div>}
          {entry.status_changed && entry.previous_status && (
            <div>
              {entry.previous_status} → {entry.funnel_status_at_time}
            </div>
          )}
          <MetadataBlock metadata={entry.metadata} />
        </li>
      ))}
    </ul>
  );
}
