import { useCallback, useState } from 'react';
import { cn } from '@/lib/utils';

/** Brief fixed toast for row/calendar action feedback. */
export function useActionToast() {
  const [message, setMessage] = useState<string | null>(null);

  const show = useCallback((text: string) => {
    setMessage(text);
    window.setTimeout(() => setMessage(null), 3200);
  }, []);

  const node = message ? (
    <div
      role="status"
      className={cn(
        'fixed bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-lg border border-border-default',
        'bg-surface-card px-4 py-2 text-sm font-medium text-text-primary shadow-lg',
      )}
    >
      {message}
    </div>
  ) : null;

  return { show, node };
}
