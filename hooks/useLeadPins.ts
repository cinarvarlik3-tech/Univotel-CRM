/**
 * Hook for reading and toggling the current agent's pinned leads (D7, §1.2, §2.2).
 * Pins are personal and private — backed by `lead_pins` with per-agent RLS.
 */
import { useCallback } from 'react';
import useSWR, { mutate as globalMutate } from 'swr';
import { useAuth } from '@/hooks/useAuth';

const PINS_KEY = '/api/leads/pins';

async function fetcher(url: string): Promise<string[]> {
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch pins');
  const json = await res.json();
  return (json.data as Array<{ lead_uuid: string }>).map((r) => r.lead_uuid);
}

/**
 * Returns the current agent's pinned lead UUIDs and a toggle function.
 */
export function useLeadPins() {
  const { user } = useAuth();

  const { data: pinnedIds = [], error } = useSWR<string[]>(user ? PINS_KEY : null, fetcher);

  const togglePin = useCallback(
    async (leadUuid: string) => {
      const isPinned = pinnedIds.includes(leadUuid);
      const method = isPinned ? 'DELETE' : 'POST';

      // Optimistic update
      const optimistic = isPinned
        ? pinnedIds.filter((id) => id !== leadUuid)
        : [...pinnedIds, leadUuid];
      await globalMutate(PINS_KEY, optimistic, false);

      const res = await fetch(`/api/leads/${leadUuid}/pin`, { method });
      if (!res.ok) {
        // Revert on error
        await globalMutate(PINS_KEY);
      } else {
        await globalMutate(PINS_KEY);
      }
    },
    [pinnedIds],
  );

  return { pinnedIds, togglePin, error };
}
