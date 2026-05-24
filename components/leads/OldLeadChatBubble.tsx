/**
 * Single chat bubble for old lead message thread.
 */
import { cn } from '@/lib/utils';
import { formatChatMessageTime } from '@/lib/ui/format-chat-timestamp';
import type { OldLeadMessageRow } from '@/types/domain';

interface OldLeadChatBubbleProps {
  message: OldLeadMessageRow;
  fallbackLeadName: string | null;
}

/**
 * Renders one message bubble (incoming, outgoing, or activity).
 * @param props - Message row and fallback lead name.
 */
export function OldLeadChatBubble({ message, fallbackLeadName }: OldLeadChatBubbleProps) {
  if (message.messageType === 'activity') {
    return (
      <div className="flex justify-center px-2 py-1">
        <p className="max-w-[90%] text-center text-[11px] text-text-tertiary">
          {message.content ?? 'Activity'}
        </p>
      </div>
    );
  }

  const isIncoming = message.messageType === 'incoming';
  const label =
    message.senderName ??
    (isIncoming ? fallbackLeadName : null) ??
    (isIncoming ? 'Contact' : 'Agent');

  const body = message.content?.trim() ? message.content : '(Attachment or empty message)';

  return (
    <div
      className={cn('flex flex-col gap-0.5 px-2 py-1', isIncoming ? 'items-start' : 'items-end')}
    >
      <span className="px-1 text-[10px] font-medium text-text-tertiary">{label}</span>
      <div
        className={cn(
          'max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap break-words',
          isIncoming
            ? 'rounded-tl-sm bg-muted text-text-primary'
            : 'rounded-tr-sm bg-brand-blue text-white',
        )}
      >
        {body}
      </div>
      <span className="px-1 text-[10px] text-text-tertiary">
        {formatChatMessageTime(message.createdAt)}
      </span>
    </div>
  );
}
