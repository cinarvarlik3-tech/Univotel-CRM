/**
 * Animated expand/collapse panel — height + fade/slide without unmounting.
 */
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface CollapsiblePanelProps {
  open: boolean;
  children: ReactNode;
  className?: string;
  innerClassName?: string;
  id?: string;
}

/**
 * Smoothly animates content open and closed using CSS grid + opacity.
 * @param props - Open state and panel content.
 */
export function CollapsiblePanel({
  open,
  children,
  className,
  innerClassName,
  id,
}: CollapsiblePanelProps) {
  return (
    <div
      id={id}
      aria-hidden={!open}
      className={cn(
        'grid transition-[grid-template-rows] duration-300 ease-in-out motion-reduce:transition-none motion-reduce:duration-0',
        open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
      )}
    >
      <div className="overflow-hidden">
        <div
          className={cn(
            'transition-[opacity,transform] duration-300 ease-in-out motion-reduce:transition-none motion-reduce:duration-0 motion-reduce:transform-none',
            open ? 'translate-y-0 opacity-100' : '-translate-y-1 opacity-0',
            innerClassName,
            className,
          )}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
