/**
 * Read-only chat thread view for imported old leads.
 */
import { useEffect, useRef } from 'react';
import { OldLeadChatBubble } from '@/components/leads/OldLeadChatBubble';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useOldLeadMessages } from '@/hooks/useOldLeadMessages';
import { formatChatDateSeparator, isDifferentChatDay } from '@/lib/ui/format-chat-timestamp';

interface OldLeadChatViewProps {
  leadId: string;
  leadName: string | null;
  chatwootUrl?: string | null;
}

/**
 * Renders lazy-loaded message history with scroll-up pagination.
 * @param props - Lead ID, display name, optional Chatwoot link.
 */
export function OldLeadChatView({ leadId, leadName, chatwootUrl }: OldLeadChatViewProps) {
  const { messages, loading, loadingMore, error, hasMore, loadMore } = useOldLeadMessages(
    leadId,
    true,
  );
  const scrollRef = useRef<HTMLDivElement>(null);
  const initialScrollDone = useRef(false);
  const prevScrollHeight = useRef(0);

  useEffect(() => {
    initialScrollDone.current = false;
  }, [leadId]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el || loading) return;

    if (!initialScrollDone.current && messages.length > 0) {
      el.scrollTop = el.scrollHeight;
      initialScrollDone.current = true;
      return;
    }

    if (loadingMore && prevScrollHeight.current > 0) {
      const delta = el.scrollHeight - prevScrollHeight.current;
      el.scrollTop = delta;
      prevScrollHeight.current = 0;
    }
  }, [messages, loading, loadingMore]);

  const handleLoadMore = async () => {
    const el = scrollRef.current;
    if (el) prevScrollHeight.current = el.scrollHeight;
    await loadMore();
  };

  if (loading) {
    return (
      <div className="flex flex-1 flex-col gap-2 p-4">
        <Skeleton className="h-10 w-3/4" />
        <Skeleton className="ml-auto h-10 w-2/3" />
        <Skeleton className="h-10 w-3/5" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-1 items-center justify-center p-4">
        <p className="text-sm text-brand-red">{error}</p>
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 p-4 text-center">
        <p className="text-sm text-text-secondary">No messages imported for this lead.</p>
        {chatwootUrl && (
          <a
            href={chatwootUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-brand-blue hover:underline"
          >
            Open in Chatwoot
          </a>
        )}
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto py-3">
        {hasMore && (
          <div className="mb-2 flex justify-center px-4">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={handleLoadMore}
              disabled={loadingMore}
            >
              {loadingMore ? 'Loading…' : 'Load older messages'}
            </Button>
          </div>
        )}

        {messages.map((message, index) => {
          const prev = index > 0 ? messages[index - 1] : null;
          const showDate = !prev || isDifferentChatDay(prev.createdAt, message.createdAt);

          return (
            <div key={message.id}>
              {showDate && (
                <div className="my-3 flex justify-center">
                  <span className="rounded-full bg-muted px-2.5 py-0.5 text-[10px] font-medium text-text-tertiary">
                    {formatChatDateSeparator(message.createdAt)}
                  </span>
                </div>
              )}
              <OldLeadChatBubble message={message} fallbackLeadName={leadName} />
            </div>
          );
        })}
      </div>

      {chatwootUrl && (
        <div className="border-t border-border-default px-4 py-2">
          <a
            href={chatwootUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-brand-blue hover:underline"
          >
            Open in Chatwoot
          </a>
        </div>
      )}
    </div>
  );
}
