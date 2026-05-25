/**
 * Live Chatwoot chat for active leads — sync on open, poll while tab is open.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { LEAD_CHAT_SYNC_POLL_MS } from '@/lib/constants';
import type { ChatMessageRow } from '@/types/domain';

interface SyncResponse {
  messages: ChatMessageRow[];
  hasMore: boolean;
  oldestCursor: string | null;
  syncedCount?: number;
  syncedAt?: string;
}

interface MessagesPageResponse {
  messages: ChatMessageRow[];
  hasMore: boolean;
  oldestCursor: string | null;
}

function mergeMessages(prev: ChatMessageRow[], incoming: ChatMessageRow[]): ChatMessageRow[] {
  const byId = new Map<string, ChatMessageRow>();
  for (const message of prev) byId.set(message.id, message);
  for (const message of incoming) byId.set(message.id, message);
  return [...byId.values()].sort(
    (a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id),
  );
}

interface UseLeadMessagesResult {
  messages: ChatMessageRow[];
  loading: boolean;
  loadingMore: boolean;
  syncing: boolean;
  error: string | null;
  hasMore: boolean;
  loadMore: () => Promise<void>;
}

/**
 * Syncs from Chatwoot when enabled, polls while Conversation tab stays open.
 * @param leadId - Active lead UUID.
 * @param enabled - True when Conversation tab is mounted.
 */
export function useLeadMessages(
  leadId: string | undefined,
  enabled: boolean,
): UseLeadMessagesResult {
  const [messages, setMessages] = useState<ChatMessageRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const oldestCursorRef = useRef<string | null>(null);

  const syncFromChatwoot = useCallback(
    async (quiet: boolean) => {
      if (!leadId) return;

      if (!quiet) setLoading(true);
      else setSyncing(true);
      setError(null);

      try {
        const res = await fetch(`/api/leads/${leadId}/messages/sync`, { method: 'POST' });
        const json = await res.json();

        if (!res.ok) {
          throw new Error(json.error ?? 'Failed to sync messages');
        }

        const data = json.data as SyncResponse;
        oldestCursorRef.current = data.oldestCursor;
        setHasMore(data.hasMore);
        setMessages((prev) => (quiet ? mergeMessages(prev, data.messages) : data.messages));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to sync messages');
        if (!quiet) {
          setMessages([]);
          setHasMore(false);
          oldestCursorRef.current = null;
        }
      } finally {
        if (!quiet) setLoading(false);
        else setSyncing(false);
      }
    },
    [leadId],
  );

  const fetchOlderPage = useCallback(
    async (before: string) => {
      if (!leadId) return;

      const params = new URLSearchParams({ limit: '50', before });
      const res = await fetch(`/api/leads/${leadId}/messages?${params.toString()}`);
      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error ?? 'Failed to load messages');
      }

      const data = json.data as MessagesPageResponse;
      oldestCursorRef.current = data.oldestCursor;
      setHasMore(data.hasMore);
      setMessages((prev) => mergeMessages(data.messages, prev));
    },
    [leadId],
  );

  useEffect(() => {
    if (!leadId || !enabled) {
      setMessages([]);
      setError(null);
      setHasMore(false);
      oldestCursorRef.current = null;
      return;
    }

    syncFromChatwoot(false);

    const intervalId = window.setInterval(() => {
      syncFromChatwoot(true);
    }, LEAD_CHAT_SYNC_POLL_MS);

    return () => window.clearInterval(intervalId);
  }, [leadId, enabled, syncFromChatwoot]);

  const loadMore = useCallback(async () => {
    if (!leadId || !hasMore || loadingMore || !oldestCursorRef.current) return;

    setLoadingMore(true);
    setError(null);

    try {
      await fetchOlderPage(oldestCursorRef.current);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load older messages');
    } finally {
      setLoadingMore(false);
    }
  }, [leadId, hasMore, loadingMore, fetchOlderPage]);

  return { messages, loading, loadingMore, syncing, error, hasMore, loadMore };
}
