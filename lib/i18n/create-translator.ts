/**
 * Creates a dot-path translator from nested message objects.
 */
import type { Messages } from '@/lib/i18n/messages/en';

type MessageParams = Record<string, string | number>;

/**
 * Resolves a dot-separated key against a nested message object.
 * @param messages - Locale message tree.
 * @param key - Dot path (e.g. nav.leads).
 */
function resolveMessage(messages: Messages, key: string): string | undefined {
  const parts = key.split('.');
  let current: unknown = messages;

  for (const part of parts) {
    if (current == null || typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[part];
  }

  return typeof current === 'string' ? current : undefined;
}

/**
 * Interpolates `{name}` placeholders in a template string.
 * @param template - Message with optional placeholders.
 * @param params - Replacement values.
 */
function interpolate(template: string, params?: MessageParams): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (_, name: string) =>
    params[name] !== undefined ? String(params[name]) : `{${name}}`,
  );
}

/**
 * Builds a translator function for a message catalog.
 * @param messages - Locale-specific messages.
 */
export function createTranslator(messages: Messages) {
  /**
   * Translates a message key with optional interpolation.
   * @param key - Dot-separated message path.
   * @param params - Placeholder values.
   */
  return function t(key: string, params?: MessageParams): string {
    const resolved = resolveMessage(messages, key);
    if (resolved === undefined) return key;
    return interpolate(resolved, params);
  };
}

export type TranslateFn = ReturnType<typeof createTranslator>;
