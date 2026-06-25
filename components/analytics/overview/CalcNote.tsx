/**
 * Muted calculation-note subtext beneath chart/card titles.
 */
import { cn } from '@/lib/utils';

interface CalcNoteProps {
  text?: string;
  show: boolean;
  className?: string;
  alwaysVisible?: boolean;
}

export function CalcNote({ text, show, className, alwaysVisible }: CalcNoteProps) {
  if (!text) return null;
  if (!show && !alwaysVisible) return null;
  return (
    <p
      className={cn(
        'text-[11px] leading-snug text-text-tertiary',
        alwaysVisible && 'text-amber-700 dark:text-amber-400',
        className,
      )}
    >
      {text}
    </p>
  );
}
