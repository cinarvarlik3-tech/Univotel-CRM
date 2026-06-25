/**
 * Section wrapper — title + card strip + optional chart grid.
 */
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface SectionBlockProps {
  title: string;
  cards: ReactNode;
  children?: ReactNode;
  /** Override the card-grid column classes (e.g. to make cards span the full width). */
  cardsClassName?: string;
}

const DEFAULT_CARDS_GRID = 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5';

export function SectionBlock({ title, cards, children, cardsClassName }: SectionBlockProps) {
  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-sm font-semibold uppercase tracking-widest text-text-tertiary">
        {title}
      </h2>
      <div className={cn('grid gap-3', cardsClassName ?? DEFAULT_CARDS_GRID)}>{cards}</div>
      {children && <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">{children}</div>}
    </div>
  );
}
