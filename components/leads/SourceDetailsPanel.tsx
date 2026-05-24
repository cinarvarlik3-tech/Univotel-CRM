/**
 * Read-only panel for lead source_details JSONB attribution data.
 */
import type { ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { KvList } from '@/components/ui/kv-list';
import type { SourceDetails } from '@/lib/leads/source-details';
import { SOURCE_DETAILS_KEYS, SOURCE_DETAILS_LABELS } from '@/lib/leads/source-details';

interface SourceDetailsPanelProps {
  sourceDetails: SourceDetails | Record<string, unknown> | null | undefined;
  /** When true, renders without Card wrapper for use inside detail panel. */
  embedded?: boolean;
}

/**
 * Renders source_details key-value pairs for lead attribution.
 * @param props - source_details object from lead row.
 * @returns Panel element or null if empty.
 */
export function SourceDetailsPanel({ sourceDetails, embedded = false }: SourceDetailsPanelProps) {
  if (!sourceDetails || typeof sourceDetails !== 'object') {
    return null;
  }

  const details = sourceDetails as Record<string, unknown>;

  const items: { term: string; value: ReactNode }[] = [];

  for (const key of SOURCE_DETAILS_KEYS) {
    if (key === 'normalization_failed' || key === 'raw_phone') continue;

    const value = details[key];
    if (value === null || value === undefined || value === '') continue;

    const label = SOURCE_DETAILS_LABELS[key] ?? key;

    if (key === 'chatwoot_url' && typeof value === 'string') {
      items.push({
        term: label,
        value: (
          <a
            href={value}
            target="_blank"
            rel="noreferrer"
            className="text-brand-blue hover:underline"
          >
            Open conversation
          </a>
        ),
      });
      continue;
    }

    if (key === 'is_organic' && typeof value === 'boolean') {
      items.push({ term: label, value: value ? 'Yes' : 'No' });
      continue;
    }

    items.push({ term: label, value: String(value) });
  }

  if (items.length === 0 && details.normalization_failed !== true) {
    return null;
  }

  const content = (
    <>
      {details.normalization_failed === true && (
        <p className="mb-3 text-sm text-brand-red">
          Phone normalization failed — verify number manually.
          {typeof details.raw_phone === 'string' && details.raw_phone.length > 0 && (
            <span className="mt-1 block font-mono text-text-primary">{details.raw_phone}</span>
          )}
        </p>
      )}
      {items.length > 0 && <KvList items={items} layout={embedded ? 'stacked' : 'inline'} />}
    </>
  );

  if (embedded) {
    if (items.length === 0 && details.normalization_failed !== true) return null;

    return (
      <div>
        <h3 className="mb-2 text-[11px] font-medium uppercase tracking-wide text-text-tertiary">
          Source attribution
        </h3>
        {content}
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Source details</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">{content}</CardContent>
    </Card>
  );
}
