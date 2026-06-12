/**
 * Floating save-failure toast anchored to the bottom of the lead slide-over.
 */
import { useEffect } from 'react';
import { cn } from '@/lib/utils';

interface PanelSaveToastProps {
  message: string | null;
  onDismiss: () => void;
}

export function PanelSaveToast({ message, onDismiss }: PanelSaveToastProps) {
  useEffect(() => {
    if (!message) return;
    const id = window.setTimeout(onDismiss, 3000);
    return () => window.clearTimeout(id);
  }, [message, onDismiss]);

  if (!message) return null;

  return (
    <div
      role="alert"
      className={cn(
        'pointer-events-none absolute bottom-[140px] left-4 right-4 z-50',
        'rounded-lg border border-brand-red/30 bg-brand-red px-4 py-2.5 text-center text-sm font-medium text-white shadow-lg',
      )}
    >
      {message}
    </div>
  );
}
