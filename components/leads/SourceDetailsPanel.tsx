/**
 * Read-only panel for lead source_details JSONB attribution data.
 */
import type { SourceDetails } from '@/lib/leads/source-details';
import { SOURCE_DETAILS_KEYS } from '@/lib/leads/source-details';

interface SourceDetailsPanelProps {
  sourceDetails: SourceDetails | Record<string, unknown> | null | undefined;
}

/**
 * Renders source_details key-value pairs for lead attribution.
 * @param props - source_details object from lead row.
 * @returns Panel element or null if empty.
 */
export function SourceDetailsPanel({ sourceDetails }: SourceDetailsPanelProps) {
  if (!sourceDetails || typeof sourceDetails !== 'object') {
    return null;
  }

  const details = sourceDetails as Record<string, unknown>;

  return (
    <div className="card">
      <h3>Source details</h3>
      {details.normalization_failed === true && (
        <p className="error">Phone normalization failed — verify number manually.</p>
      )}
      <dl className="kv">
        {SOURCE_DETAILS_KEYS.map((key) => {
          const value = details[key];
          if (value === null || value === undefined || value === '') return null;

          if (key === 'chatwoot_url' && typeof value === 'string') {
            return (
              <div key={key}>
                <dt>{key}</dt>
                <dd>
                  <a href={value} target="_blank" rel="noreferrer">
                    Open conversation
                  </a>
                </dd>
              </div>
            );
          }

          return (
            <div key={key}>
              <dt>{key}</dt>
              <dd>{String(value)}</dd>
            </div>
          );
        })}
      </dl>
    </div>
  );
}
