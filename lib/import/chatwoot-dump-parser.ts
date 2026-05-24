/**
 * Parses Chatwoot tables from a PostgreSQL pg_dump SQL file (COPY blocks).
 */
import { readFileSync } from 'fs';
import type {
  ChatwootContactRow,
  ChatwootConversationRow,
  ChatwootDumpData,
  ChatwootInboxRow,
  ChatwootMessageRow,
  ChatwootUserRow,
} from '@/lib/import/types';

const PARSED_TABLES = new Set([
  'accounts',
  'contacts',
  'conversations',
  'inboxes',
  'messages',
  'users',
]);

/**
 * Unescapes a PostgreSQL COPY field value.
 * @param value - Raw tab-separated field from dump.
 */
export function unescapeCopyField(value: string): string | null {
  if (value === '\\N') return null;

  let out = '';
  for (let i = 0; i < value.length; i++) {
    if (value[i] === '\\' && i + 1 < value.length) {
      const next = value[i + 1];
      if (next === 'n') {
        out += '\n';
        i++;
      } else if (next === 'r') {
        out += '\r';
        i++;
      } else if (next === 't') {
        out += '\t';
        i++;
      } else if (next === '\\') {
        out += '\\';
        i++;
      } else {
        out += value[i];
      }
    } else {
      out += value[i];
    }
  }

  return out;
}

/**
 * Parses a COPY data line into field values aligned with column names.
 * @param line - Single line from COPY block.
 * @param columns - Column names from COPY header.
 */
export function parseCopyLine(line: string, columns: string[]): Record<string, string | null> {
  const fields = line.split('\t');
  const row: Record<string, string | null> = {};

  for (let i = 0; i < columns.length; i++) {
    row[columns[i]] = unescapeCopyField(fields[i] ?? '\\N');
  }

  return row;
}

interface TableRows {
  columns: string[];
  rows: Record<string, string | null>[];
}

/**
 * Extracts COPY blocks for selected tables from a pg_dump SQL file.
 * @param dumpPath - Path to readable_database.sql.
 */
export function parseChatwootDumpTables(dumpPath: string): Map<string, TableRows> {
  const content = readFileSync(dumpPath, 'utf8');
  const lines = content.split('\n');
  const tables = new Map<string, TableRows>();

  let currentTable: string | null = null;
  let currentColumns: string[] = [];

  for (const line of lines) {
    const copyMatch = line.match(/^COPY public\.(\w+) \((.+)\) FROM stdin;/);
    if (copyMatch) {
      const table = copyMatch[1];
      if (PARSED_TABLES.has(table)) {
        currentTable = table;
        currentColumns = copyMatch[2].split(',').map((c) => c.trim().replace(/^"|"$/g, ''));
        tables.set(table, { columns: currentColumns, rows: [] });
      } else {
        currentTable = null;
      }
      continue;
    }

    if (currentTable && line.trim() === '\\.') {
      currentTable = null;
      currentColumns = [];
      continue;
    }

    if (currentTable && line.length > 0) {
      tables.get(currentTable)?.rows.push(parseCopyLine(line, currentColumns));
    }
  }

  return tables;
}

function parseJsonField(raw: string | null): Record<string, unknown> | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    return typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

function toInt(value: string | null): number | null {
  if (value == null) return null;
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) ? n : null;
}

function toBool(value: string | null): boolean {
  return value === 't' || value === 'true' || value === '1';
}

/**
 * Parses users and messages from a Chatwoot dump (lighter path for message ETL).
 * @param dumpPath - Path to readable_database.sql.
 */
export function loadChatwootMessagesDump(dumpPath: string): {
  users: Map<number, ChatwootUserRow>;
  messages: ChatwootMessageRow[];
} {
  const tables = parseChatwootDumpTables(dumpPath);

  const users = new Map<number, ChatwootUserRow>();
  for (const row of tables.get('users')?.rows ?? []) {
    const id = toInt(row.id);
    if (id == null) continue;
    users.set(id, {
      id,
      name: row.name,
      display_name: row.display_name,
    });
  }

  const messages: ChatwootMessageRow[] = [];
  for (const row of tables.get('messages')?.rows ?? []) {
    const parsed = parseMessageRow(row);
    if (parsed) messages.push(parsed);
  }

  return { users, messages };
}

function parseMessageRow(row: Record<string, string | null>): ChatwootMessageRow | null {
  const id = toInt(row.id);
  const conversationId = toInt(row.conversation_id);
  const messageType = toInt(row.message_type);
  if (id == null || conversationId == null || messageType == null) return null;

  return {
    id,
    content: row.content,
    conversation_id: conversationId,
    message_type: messageType,
    created_at: row.created_at ?? new Date(0).toISOString(),
    sender_type: row.sender_type,
    sender_id: toInt(row.sender_id),
    private: toBool(row.private),
  };
}

/**
 * Builds typed indexes from parsed COPY table rows.
 * @param dumpPath - Path to Chatwoot SQL dump.
 */
export function loadChatwootDump(dumpPath: string): ChatwootDumpData {
  const tables = parseChatwootDumpTables(dumpPath);

  const accountRows = tables.get('accounts')?.rows ?? [];
  const accountId = toInt(accountRows[0]?.id ?? null) ?? 1;

  const contacts = new Map<number, ChatwootContactRow>();
  for (const row of tables.get('contacts')?.rows ?? []) {
    const id = toInt(row.id);
    if (id == null) continue;

    contacts.set(id, {
      id,
      name: row.name,
      phone_number: row.phone_number,
      identifier: row.identifier,
      additional_attributes: parseJsonField(row.additional_attributes),
      created_at: row.created_at ?? new Date(0).toISOString(),
      updated_at: row.updated_at ?? new Date(0).toISOString(),
    });
  }

  const inboxes = new Map<number, ChatwootInboxRow>();
  for (const row of tables.get('inboxes')?.rows ?? []) {
    const id = toInt(row.id);
    if (id == null) continue;

    inboxes.set(id, {
      id,
      channel_type: row.channel_type ?? '',
      name: row.name,
    });
  }

  const conversations: ChatwootConversationRow[] = [];
  for (const row of tables.get('conversations')?.rows ?? []) {
    const id = toInt(row.id);
    const inboxId = toInt(row.inbox_id);
    const contactId = toInt(row.contact_id);
    if (id == null || inboxId == null || contactId == null) continue;

    conversations.push({
      id,
      inbox_id: inboxId,
      contact_id: contactId,
      assignee_id: toInt(row.assignee_id),
      created_at: row.created_at ?? new Date(0).toISOString(),
      updated_at: row.updated_at ?? new Date(0).toISOString(),
      contact_last_seen_at: row.contact_last_seen_at,
    });
  }

  const users = new Map<number, ChatwootUserRow>();
  for (const row of tables.get('users')?.rows ?? []) {
    const id = toInt(row.id);
    if (id == null) continue;
    users.set(id, {
      id,
      name: row.name,
      display_name: row.display_name,
    });
  }

  const messages: ChatwootMessageRow[] = [];
  const messagesByConversation = new Map<number, ChatwootMessageRow[]>();
  for (const row of tables.get('messages')?.rows ?? []) {
    const message = parseMessageRow(row);
    if (!message) continue;

    messages.push(message);
    const list = messagesByConversation.get(message.conversation_id) ?? [];
    list.push(message);
    messagesByConversation.set(message.conversation_id, list);
  }

  for (const list of messagesByConversation.values()) {
    list.sort((a, b) => a.created_at.localeCompare(b.created_at) || a.id - b.id);
  }

  return {
    accountId,
    contacts,
    conversations,
    inboxes,
    users,
    messages,
    messagesByConversation,
  };
}
