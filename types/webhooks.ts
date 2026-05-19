/**
 * Zod schemas for webhook payload validation.
 * All inbound webhook bodies are validated at runtime before processing.
 */
import { z } from 'zod';

const ChatwootMetaSchema = z
  .object({
    sender: z
      .object({
        phone_number: z.string().nullable().optional(),
        name: z.string().optional(),
      })
      .optional(),
  })
  .optional();

const ChatwootConversationSchema = z.object({ id: z.number().optional() }).optional();

/** Shared fields on conversation_created and message_created payloads. */
const ChatwootInboundMessageSchema = z.object({
  id: z.number(),
  channel: z.string().optional(),
  meta: ChatwootMetaSchema,
  message: z.object({ id: z.number().optional() }).optional(),
  conversation: ChatwootConversationSchema,
  additional_attributes: z.record(z.unknown()).optional(),
  inbox_id: z.number().optional(),
});

export const ChatwootConversationCreatedSchema = ChatwootInboundMessageSchema.extend({
  event: z.literal('conversation_created'),
});

export const ChatwootMessageCreatedSchema = ChatwootInboundMessageSchema.extend({
  event: z.literal('message_created'),
});

const ChangedAttributeValueSchema = z.object({
  current_value: z.unknown(),
  previous_value: z.unknown(),
});

export const ChatwootConversationUpdatedSchema = z.object({
  event: z.literal('conversation_updated'),
  id: z.number(),
  meta: ChatwootMetaSchema,
  conversation: ChatwootConversationSchema,
  changed_attributes: z.array(z.record(ChangedAttributeValueSchema)),
  channel: z.string().optional(),
  inbox_id: z.number().optional(),
});

export const ChatwootPayloadSchema = z.discriminatedUnion('event', [
  ChatwootConversationCreatedSchema,
  ChatwootMessageCreatedSchema,
  ChatwootConversationUpdatedSchema,
]);

export type ChatwootPayload = z.infer<typeof ChatwootPayloadSchema>;
export type ChatwootConversationCreated = z.infer<typeof ChatwootConversationCreatedSchema>;
export type ChatwootMessageCreated = z.infer<typeof ChatwootMessageCreatedSchema>;
export type ChatwootConversationUpdated = z.infer<typeof ChatwootConversationUpdatedSchema>;

export const WhatsAppCallPayloadSchema = z.object({
  object: z.string().optional(),
  entry: z
    .array(
      z.object({
        changes: z
          .array(
            z.object({
              value: z.object({
                calls: z
                  .array(
                    z.object({
                      id: z.string().optional(),
                      from: z.string(),
                      timestamp: z.union([z.string(), z.number()]).optional(),
                      duration: z.number().optional(),
                      status: z.string().optional(),
                    }),
                  )
                  .optional(),
              }),
            }),
          )
          .optional(),
      }),
    )
    .optional(),
});

export type WhatsAppCallPayload = z.infer<typeof WhatsAppCallPayloadSchema>;

export const NetGsmPayloadSchema = z.object({
  token: z.string(),
  arayan_no: z.string().optional(),
  aranan_no: z.string().optional(),
  arama_id: z.string().optional(),
  sure: z.union([z.string(), z.number()]).optional(),
});

export type NetGsmPayload = z.infer<typeof NetGsmPayloadSchema>;
