/**
 * Unit tests for Telegram bot command handling.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const sendTelegramApiMessage = vi.fn();
const linkTelegramSalesperson = vi.fn();

vi.mock('@/lib/telegram/api', () => ({
  sendTelegramApiMessage: (...args: unknown[]) => sendTelegramApiMessage(...args),
}));

vi.mock('@/lib/jobs/link-telegram-salesperson', () => ({
  linkTelegramSalesperson: (...args: unknown[]) => linkTelegramSalesperson(...args),
}));

import { handleTelegramUpdate } from '@/lib/telegram/handle-update';

describe('handleTelegramUpdate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sendTelegramApiMessage.mockResolvedValue({
      ok: true,
      messageId: 1,
      telegramChatId: 8915830541,
    });
  });

  it('replies to /start with chat id instructions', async () => {
    await handleTelegramUpdate({
      update_id: 1,
      message: {
        message_id: 1,
        text: '/start',
        chat: { id: 8915830541, type: 'private' },
      },
    });

    expect(sendTelegramApiMessage).toHaveBeenCalledWith(
      '8915830541',
      expect.stringContaining('Chat ID: 8915830541'),
    );
  });

  it('replies to /chatid with chat id only', async () => {
    await handleTelegramUpdate({
      update_id: 2,
      message: {
        message_id: 2,
        text: '/chatid',
        chat: { id: 123, type: 'private' },
      },
    });

    expect(sendTelegramApiMessage).toHaveBeenCalledWith('123', 'Chat ID: 123');
  });

  it('links salesperson by email on /link', async () => {
    linkTelegramSalesperson.mockResolvedValue({
      ok: true,
      fullName: 'Zeynep Sales',
      email: 'zeynep@univotel.com',
    });

    await handleTelegramUpdate({
      update_id: 3,
      message: {
        message_id: 3,
        text: '/link zeynep@univotel.com',
        chat: { id: 555, type: 'private' },
      },
    });

    expect(linkTelegramSalesperson).toHaveBeenCalledWith('555', 'zeynep@univotel.com');
    expect(sendTelegramApiMessage).toHaveBeenCalledWith('555', expect.stringContaining('Başarılı'));
  });
});
