import { describe, expect, it } from 'vitest';
import { mkdtempSync, writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import {
  parseCopyLine,
  unescapeCopyField,
  loadChatwootDump,
} from '@/lib/import/chatwoot-dump-parser';
import {
  buildUniversityLookup,
  extractUniversityFromMessages,
  normalizeMatchText,
} from '@/lib/import/extract-university';
import {
  mapInboxChannel,
  redactContactIdentifier,
  buildOldLeadRows,
} from '@/lib/import/build-old-lead-rows';

describe('unescapeCopyField', () => {
  it('returns null for PostgreSQL NULL sentinel', () => {
    expect(unescapeCopyField('\\N')).toBeNull();
  });

  it('unescapes tab and newline sequences', () => {
    expect(unescapeCopyField('hello\\tworld')).toBe('hello\tworld');
  });
});

describe('parseCopyLine', () => {
  it('maps columns to unescaped values', () => {
    const row = parseCopyLine(`1\thello\t\\N`, ['id', 'name', 'phone']);
    expect(row).toEqual({ id: '1', name: 'hello', phone: null });
  });
});

describe('normalizeMatchText', () => {
  it('folds Turkish characters', () => {
    expect(normalizeMatchText('Boğaziçi Üniversitesi')).toBe('bogazici universitesi');
  });
});

describe('extractUniversityFromMessages', () => {
  const lookup = buildUniversityLookup([
    { canonical: 'Boğaziçi Üniversitesi', aliases: ['bogazici', 'boun'] },
    { canonical: 'İstanbul Teknik Üniversitesi', aliases: ['itu', 'istanbul teknik'] },
  ]);

  it('returns canonical name for alias in message', () => {
    const result = extractUniversityFromMessages(['Merhaba, ITU da okuyorum'], lookup);
    expect(result).toBe('İstanbul Teknik Üniversitesi');
  });

  it('uses first matching message chronologically', () => {
    const result = extractUniversityFromMessages(
      ['Fiyat alabilir miyim?', 'Boğaziçi öğrencisiyim'],
      lookup,
    );
    expect(result).toBe('Boğaziçi Üniversitesi');
  });

  it('returns null when no confident match', () => {
    expect(extractUniversityFromMessages(['Merhaba fiyat nedir?'], lookup)).toBeNull();
  });
});

describe('mapInboxChannel', () => {
  it('maps whatsapp and instagram channels', () => {
    expect(mapInboxChannel('Channel::Whatsapp')).toEqual({
      leadSource: 'whatsapp',
      messageFrom: 'whatsapp',
    });
    expect(mapInboxChannel('Channel::Instagram')).toEqual({
      leadSource: 'instagram',
      messageFrom: 'instagram',
    });
  });
});

describe('redactContactIdentifier', () => {
  it('redacts phone numbers', () => {
    expect(redactContactIdentifier('05321234567')).toMatch(/\*\*\*/);
  });
});

describe('loadChatwootDump', () => {
  it('parses minimal embedded COPY blocks', () => {
    const dir = mkdtempSync(join(tmpdir(), 'chatwoot-dump-'));
    const dumpPath = join(dir, 'mini.sql');
    writeFileSync(
      dumpPath,
      `
COPY public.accounts (id, name) FROM stdin;
1\tUnivotel
\\.
COPY public.inboxes (id, channel_type, name) FROM stdin;
1\tChannel::Whatsapp\tWA
\\.
COPY public.contacts (id, name, phone_number, identifier, additional_attributes, created_at, updated_at) FROM stdin;
10\tAli\t05321234567\t\\N\t\\N\t2024-01-01 00:00:00+00\t2024-01-02 00:00:00+00
\\.
COPY public.conversations (id, inbox_id, contact_id, assignee_id, created_at, updated_at, contact_last_seen_at) FROM stdin;
100\t1\t10\t\\N\t2024-01-01 00:00:00+00\t2024-01-02 00:00:00+00\t\\N
\\.
COPY public.messages (id, content, conversation_id, message_type, created_at) FROM stdin;
1000\tITU ogrencisiyim\t100\t0\t2024-01-01 01:00:00+00
\\.
`,
      'utf8',
    );

    const dump = loadChatwootDump(dumpPath);
    expect(dump.accountId).toBe(1);
    expect(dump.contacts.size).toBe(1);
    expect(dump.conversations).toHaveLength(1);
    expect(dump.messagesByConversation.get(100)).toHaveLength(1);

    const built = buildOldLeadRows(dump, 'https://marketinguni.app');
    expect(built.rows).toHaveLength(1);
    expect(built.rows[0].lead.lead_phone).toBe('05321234567');
    expect(built.rows[0].details.university).toBe('İstanbul Teknik Üniversitesi');
  });
});
