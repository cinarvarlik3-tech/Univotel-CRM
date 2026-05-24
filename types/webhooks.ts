/**
 * Zod schemas for webhook payload validation.
 * All inbound webhook bodies are validated at runtime before processing.
 */
import { z } from 'zod';

const ChatwootPhoneHolderSchema = z.object({
  id: z.number().optional(),
  phone_number: z.string().nullable().optional(),
  name: z.string().optional(),
  identifier: z.string().optional(),
  additional_attributes: z.record(z.unknown()).optional(),
});

const ChatwootAssigneeSchema = z
  .object({
    id: z.number(),
    name: z.string().optional(),
    email: z.string().nullable().optional(),
  })
  .nullable()
  .optional();

const ChatwootMetaSchema = z
  .object({
    sender: ChatwootPhoneHolderSchema.optional(),
    assignee: ChatwootAssigneeSchema,
    assignee_type: z.string().optional(),
  })
  .optional();

const ChatwootConversationSchema = z
  .object({
    id: z.number().optional(),
    meta: z
      .object({
        assignee: ChatwootAssigneeSchema,
      })
      .optional(),
  })
  .optional();

/** Shared fields on conversation_created and message_created payloads. */
const ChatwootInboundMessageSchema = z.object({
  id: z.number(),
  channel: z.string().optional(),
  meta: ChatwootMetaSchema,
  contact: ChatwootPhoneHolderSchema.optional(),
  sender: ChatwootPhoneHolderSchema.optional(),
  message_type: z.string().optional(),
  message: z.object({ id: z.number().optional() }).optional(),
  messages: z.array(z.object({ id: z.number().optional() })).optional(),
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
  contact: ChatwootPhoneHolderSchema.optional(),
  sender: ChatwootPhoneHolderSchema.optional(),
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

const WhatsAppCallSchema = z.object({
  id: z.string().optional(),
  from: z.string(),
  timestamp: z.union([z.string(), z.number()]).optional(),
  duration: z.number().optional(),
  status: z.string().optional(),
});

const WhatsAppStatusSchema = z.object({
  id: z.string(),
  status: z.string(),
  timestamp: z.union([z.string(), z.number()]).optional(),
  recipient_id: z.string().optional(),
});

const WhatsAppChangeValueSchema = z.object({
  calls: z.array(WhatsAppCallSchema).optional(),
  statuses: z.array(WhatsAppStatusSchema).optional(),
});

export const WhatsAppWebhookPayloadSchema = z.object({
  object: z.string().optional(),
  entry: z
    .array(
      z.object({
        changes: z
          .array(
            z.object({
              value: WhatsAppChangeValueSchema,
            }),
          )
          .optional(),
      }),
    )
    .optional(),
});

export type WhatsAppWebhookPayload = z.infer<typeof WhatsAppWebhookPayloadSchema>;

/** @deprecated Use WhatsAppWebhookPayloadSchema — kept for call-only tests. */
export const WhatsAppCallPayloadSchema = WhatsAppWebhookPayloadSchema;

export type WhatsAppCallPayload = WhatsAppWebhookPayload;

/** NetGSM accepts many field aliases; validate loosely then normalize. */
export const NetGsmPayloadSchema = z.record(z.unknown());

export type NetGsmPayload = z.infer<typeof NetGsmPayloadSchema>;
