/**
 * Single chat bubble for old lead message thread.
 */
import { useTranslation } from '@/hooks/useTranslation';
import { formatChatMessageTime } from '@/lib/i18n/format-date';
import { cn } from '@/lib/utils';
import type { ChatMessageRow } from '@/types/domain';

interface OldLeadChatBubbleProps {
  message: ChatMessageRow;
  fallbackLeadName: string | null;
}

/**
 * Renders one message bubble (incoming, outgoing, or activity).
 * @param props - Message row and fallback lead name.
 */
export function OldLeadChatBubble({ message, fallbackLeadName }: OldLeadChatBubbleProps) {
  const { locale, t } = useTranslation();

  if (message.messageType === 'activity') {
    return (
      <div className="flex justify-center px-2 py-1">
        <p className="max-w-[90%] text-center text-[11px] text-text-tertiary">
          {message.content ?? t('leads.chatActivity')}
        </p>
      </div>
    );
  }

  const isIncoming = message.messageType === 'incoming';
  const label =
    message.senderName ??
    (isIncoming ? fallbackLeadName : null) ??
    (isIncoming ? t('leads.chatContact') : t('leads.chatAgent'));

  const body = message.content?.trim() ? message.content : t('leads.chatAttachmentEmpty');

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
        {formatChatMessageTime(message.createdAt, locale)}
      </span>
    </div>
  );
}
