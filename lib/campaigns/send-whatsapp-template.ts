/**
 * WhatsApp Cloud API template message sender for outbound campaigns.
 */
import { env } from '@/lib/env';

/** Successful Meta template send response. */
export interface WhatsAppSendSuccess {
  ok: true;
  waMessageId: string;
}

/** Failed Meta template send response. */
export type WhatsAppSendFailure = {
  ok: false;
  code: number;
  message: string;
};

/** Union result from sendWhatsAppTemplate. */
export type WhatsAppSendResult = WhatsAppSendSuccess | WhatsAppSendFailure;

/**
 * Sends an approved template message via Meta Graph API.
 * @param params - Recipient and template configuration.
 * @returns Message id or error details.
 */
export async function sendWhatsAppTemplate(params: {
  toE164: string;
  templateId: string;
  templateLanguage: string;
  bodyParameters: string[];
}): Promise<WhatsAppSendResult> {
  const url = `https://graph.facebook.com/v19.0/${env.WHATSAPP_PHONE_NUMBER_ID}/messages`;

  const body = {
    messaging_product: 'whatsapp',
    to: params.toE164,
    type: 'template',
    template: {
      name: params.templateId,
      language: { code: params.templateLanguage },
      components: [
        {
          type: 'body',
          parameters: params.bodyParameters.map((text) => ({ type: 'text', text })),
        },
      ],
    },
  };

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.WHATSAPP_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const json = (await res.json()) as {
      messages?: { id: string }[];
      error?: { code: number; message: string };
    };

    if (!res.ok || json.error) {
      return {
        ok: false,
        code: json.error?.code ?? res.status,
        message: json.error?.message ?? res.statusText,
      };
    }

    const waMessageId = json.messages?.[0]?.id;
    if (!waMessageId) {
      return { ok: false, code: 0, message: 'Missing message id in Meta response' };
    }

    return { ok: true, waMessageId };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, code: 0, message };
  }
}
