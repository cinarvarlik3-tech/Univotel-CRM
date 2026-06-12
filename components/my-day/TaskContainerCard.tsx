/**
 * Shared card shell for My Day task containers.
 * Elevated rounded card with tinted icon chip, count badge, and scrollable body.
 */
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { CONTAINERS, type ContainerKey } from './config';

interface TaskContainerCardProps {
  containerKey: ContainerKey;
  count?: number;
  headerAction?: React.ReactNode;
  children: React.ReactNode;
  isLoading?: boolean;
  isEmpty?: boolean;
  className?: string;
}

export function TaskContainerCard({
  containerKey,
  count,
  headerAction,
  children,
  isLoading,
  isEmpty,
  className,
}: TaskContainerCardProps) {
  const c = CONTAINERS[containerKey];
  const Icon = c.icon;

  return (
    <div
      className={cn(
        'flex flex-col rounded-2xl border border-border-default bg-surface-card shadow-sm',
        className,
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-5 pt-5 pb-3">
        <span className={cn('grid h-10 w-10 shrink-0 place-items-center rounded-xl', c.chip)}>
          <Icon className="h-5 w-5" />
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-base font-semibold text-text-primary">{c.title}</h3>
            {typeof count === 'number' && count > 0 && (
              <span className="shrink-0 rounded-full bg-surface-page px-2 py-0.5 text-xs font-medium text-text-secondary">
                {count}
              </span>
            )}
          </div>
          {c.subtitle && <p className="text-xs text-text-tertiary">{c.subtitle}</p>}
        </div>

        {headerAction}

        {c.viewAllHref && !headerAction && (
          <Link
            href={c.viewAllHref}
            className="shrink-0 text-xs text-text-tertiary hover:text-text-secondary"
          >
            Tümünü gör →
          </Link>
        )}
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-2 pb-2" style={{ maxHeight: 420 }}>
        {isLoading ? (
          <SkeletonRows />
        ) : isEmpty ? (
          <EmptyState containerKey={containerKey} />
        ) : (
          <div className="divide-y divide-border-default/60">{children}</div>
        )}
      </div>
    </div>
  );
}

function SkeletonRows() {
  return (
    <div className="space-y-3 p-3">
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex animate-pulse items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-surface-page" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3 w-1/2 rounded bg-surface-page" />
            <div className="h-2.5 w-1/3 rounded bg-surface-page" />
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState({ containerKey }: { containerKey: ContainerKey }) {
  const c = CONTAINERS[containerKey];
  const Icon = c.icon;
  return (
    <div className="grid place-items-center gap-2 py-10 text-center">
      <span className={cn('grid h-10 w-10 place-items-center rounded-xl opacity-40', c.chip)}>
        <Icon className="h-5 w-5" />
      </span>
      <p className="text-sm text-text-tertiary">{c.emptyText}</p>
    </div>
  );
}
