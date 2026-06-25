/**
 * Zod schemas for webhook payload validation.
 * All inbound webhook bodies are validated at runtime before processing.
 */
import { z } from 'zod';

const ChatwootPhoneHolderSchema = z.object({
  id: z.number().optional(),
  phone_number: z.string().nullable().optional(),
  /** Chatwoot often sends null for agent (User) senders — must allow null, not only undefined. */
  name: z.string().nullable().optional(),
  identifier: z.string().nullable().optional(),
  type: z.string().nullable().optional(),
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
    sender: ChatwootPhoneHolderSchema.nullable().optional(),
    assignee: ChatwootAssigneeSchema,
    assignee_type: z.string().nullable().optional(),
  })
  .optional();

/**
 * A single Chatwoot message object. Chatwoot delivers this in several places:
 * message_created flattens it onto the top level AND repeats it under
 * conversation.messages[]; conversation_created carries it in a top-level
 * `messages` array. (There is no nested `message` object on real payloads.)
 */
const ChatwootMessageDetailSchema = z.object({
  id: z.number().optional(),
  content: z.string().nullable().optional(),
  /** Unix timestamp (seconds). */
  created_at: z.number().optional(),
  /** 0 = incoming, 1 = outgoing. */
  message_type: z.number().optional(),
  private: z.boolean().optional(),
  sender: z
    .object({
      id: z.number().optional(),
      name: z.string().nullable().optional(),
      type: z.string().nullable().optional(),
    })
    .optional(),
});

const ChatwootConversationSchema = z
  .object({
    id: z.number().optional(),
    meta: z
      .object({
        assignee: ChatwootAssigneeSchema,
      })
      .optional(),
    /** message_created repeats the full message detail here. */
    messages: z.array(ChatwootMessageDetailSchema).optional(),
  })
  .optional();

/** Shared fields on conversation_created and message_created payloads. */
const ChatwootInboundMessageSchema = z.object({
  id: z.number(),
  channel: z.string().nullable().optional(),
  meta: ChatwootMetaSchema,
  contact: ChatwootPhoneHolderSchema.nullable().optional(),
  sender: ChatwootPhoneHolderSchema.nullable().optional(),
  /** message_created flattens the message onto the top level as an "incoming"/"outgoing" string. */
  message_type: z.string().nullable().optional(),
  /** Flattened (top-level) message fields present on message_created payloads. */
  content: z.string().nullable().optional(),
  /** Top-level created_at is an ISO string; nested/detail created_at is unix seconds. */
  created_at: z.union([z.number(), z.string()]).nullable().optional(),
  private: z.boolean().optional(),
  /** Legacy/assumed nested shape — Chatwoot does not actually send this, kept for safety. */
  message: ChatwootMessageDetailSchema.optional(),
  /** conversation_created carries the message(s) in a top-level array. */
  messages: z.array(ChatwootMessageDetailSchema).optional(),
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

export const ChatwootConversationUpdatedSchema = z.object({
  event: z.literal('conversation_updated'),
  id: z.number(),
  meta: ChatwootMetaSchema,
  contact: ChatwootPhoneHolderSchema.nullable().optional(),
  sender: ChatwootPhoneHolderSchema.nullable().optional(),
  conversation: ChatwootConversationSchema,
  changed_attributes: z.array(z.record(z.unknown())).default([]),
  channel: z.string().nullable().optional(),
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
