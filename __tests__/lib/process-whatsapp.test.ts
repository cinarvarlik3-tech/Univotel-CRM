/**
 * WhatsApp webhook router tests — calls vs statuses dispatch.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const processWhatsAppCalls = vi.fn();
const processWhatsAppStatuses = vi.fn();

vi.mock('@/lib/webhooks/process-whatsapp-calls', () => ({
  processWhatsAppCalls: (...args: unknown[]) => processWhatsAppCalls(...args),
}));

vi.mock('@/lib/webhooks/process-whatsapp-statuses', () => ({
  processWhatsAppStatuses: (...args: unknown[]) => processWhatsAppStatuses(...args),
}));

import { processWhatsApp } from '@/lib/webhooks/process-whatsapp';

describe('processWhatsApp', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    processWhatsAppCalls.mockResolvedValue(undefined);
    processWhatsAppStatuses.mockResolvedValue(undefined);
  });

  it('routes call payloads to processWhatsAppCalls', async () => {
    const body = {
      entry: [{ changes: [{ value: { calls: [{ from: '905551234567', timestamp: 1 }] } }] }],
    };

    await processWhatsApp(body);

    expect(processWhatsAppCalls).toHaveBeenCalledOnce();
    expect(processWhatsAppCalls).toHaveBeenCalledWith(body);
    expect(processWhatsAppStatuses).not.toHaveBeenCalled();
  });

  it('routes status payloads to processWhatsAppStatuses', async () => {
    const body = {
      entry: [{ changes: [{ value: { statuses: [{ id: 'wamid.abc', status: 'delivered' }] } }] }],
    };

    await processWhatsApp(body);

    expect(processWhatsAppStatuses).toHaveBeenCalledOnce();
    expect(processWhatsAppStatuses).toHaveBeenCalledWith(body);
    expect(processWhatsAppCalls).not.toHaveBeenCalled();
  });

  it('routes payloads with both calls and statuses to both processors', async () => {
    const body = {
      entry: [
        {
          changes: [
            {
              value: {
                calls: [{ from: '905551234567', timestamp: 1 }],
                statuses: [{ id: 'wamid.abc', status: 'read' }],
              },
            },
          ],
        },
      ],
    };

    await processWhatsApp(body);

    expect(processWhatsAppCalls).toHaveBeenCalledOnce();
    expect(processWhatsAppStatuses).toHaveBeenCalledOnce();
  });

  it('ignores invalid payloads without throwing', async () => {
    await processWhatsApp({ invalid: true });

    expect(processWhatsAppCalls).not.toHaveBeenCalled();
    expect(processWhatsAppStatuses).not.toHaveBeenCalled();
  });
});
