/**
 * Hook for paginated old lead chat message history.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import type { OldLeadMessageRow } from '@/types/domain';

interface MessagesResponse {
  messages: OldLeadMessageRow[];
  hasMore: boolean;
  oldestCursor: string | null;
}

interface UseOldLeadMessagesResult {
  messages: OldLeadMessageRow[];
  loading: boolean;
  loadingMore: boolean;
  error: string | null;
  hasMore: boolean;
  loadMore: () => Promise<void>;
}

/**
 * Loads chat messages for an old lead when enabled (e.g. Conversation tab open).
 * @param leadId - Old lead UUID.
 * @param enabled - Whether to fetch messages.
 */
export function useOldLeadMessages(
  leadId: string | undefined,
  enabled: boolean,
): UseOldLeadMessagesResult {
  const [messages, setMessages] = useState<OldLeadMessageRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const oldestCursorRef = useRef<string | null>(null);

  const fetchPage = useCallback(
    async (before: string | null, append: boolean) => {
      if (!leadId) return;

      const params = new URLSearchParams({ limit: '50' });
      if (before) params.set('before', before);

      const res = await fetch(`/api/old-leads/${leadId}/messages?${params.toString()}`);
      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error ?? 'Failed to load messages');
      }

      const data = json.data as MessagesResponse;

      oldestCursorRef.current = data.oldestCursor;
      setHasMore(data.hasMore);
      setMessages((prev) => {
        if (!append) return data.messages;
        const seen = new Set(prev.map((m) => m.id));
        const older = data.messages.filter((m) => !seen.has(m.id));
        return [...older, ...prev];
      });
    },
    [leadId],
  );

  const loadInitial = useCallback(async () => {
    if (!leadId || !enabled) {
      setMessages([]);
      setError(null);
      setHasMore(false);
      oldestCursorRef.current = null;
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await fetchPage(null, false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load messages');
      setMessages([]);
      setHasMore(false);
      oldestCursorRef.current = null;
    } finally {
      setLoading(false);
    }
  }, [leadId, enabled, fetchPage]);

  useEffect(() => {
    loadInitial();
  }, [loadInitial]);

  const loadMore = useCallback(async () => {
    if (!leadId || !hasMore || loadingMore || !oldestCursorRef.current) return;

    setLoadingMore(true);
    setError(null);

    try {
      await fetchPage(oldestCursorRef.current, true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load older messages');
    } finally {
      setLoadingMore(false);
    }
  }, [leadId, hasMore, loadingMore, fetchPage]);

  return { messages, loading, loadingMore, error, hasMore, loadMore };
}
