/**
 * Collapsible read/edit section for lead detail panel.
 */
import { useEffect, useState, type ReactNode } from 'react';
import { IconChevronDown, IconPencil } from '@tabler/icons-react';
import { Button } from '@/components/ui/button';
import { CollapsiblePanel } from '@/components/ui/collapsible-panel';
import { cn } from '@/lib/utils';

interface LeadSectionProps {
  title: string;
  view: ReactNode;
  children: ReactNode;
  defaultExpanded?: boolean;
  /** When this value changes, edit mode closes (e.g. lead.updated_at after save). */
  resetKey?: string | number;
}

/**
 * Renders a collapsible section with read view and optional edit form.
 * @param props - Section title, read content, edit form children.
 * @returns Collapsible lead section element.
 */
export function LeadSection({
  title,
  view,
  children,
  defaultExpanded = false,
  resetKey,
}: LeadSectionProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    setEditing(false);
  }, [resetKey]);

  return (
    <section className="border-b border-border-default py-3 last:border-b-0">
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          className="flex flex-1 items-center gap-1.5 text-left"
          onClick={() => setExpanded((v) => !v)}
        >
          <IconChevronDown
            className={cn(
              'size-4 shrink-0 text-text-tertiary transition-transform',
              expanded && 'rotate-180',
            )}
          />
          <span className="text-[11px] font-medium uppercase tracking-wide text-text-secondary">
            {title}
          </span>
        </button>
        {expanded && !editing && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={() => setEditing(true)}
          >
            <IconPencil className="size-3.5" />
            Edit
          </Button>
        )}
        {editing && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={() => setEditing(false)}
          >
            Cancel
          </Button>
        )}
      </div>

      <CollapsiblePanel open={expanded} innerClassName="mt-3 pl-5">
        {editing ? <div className="space-y-4">{children}</div> : view}
      </CollapsiblePanel>
    </section>
  );
}
