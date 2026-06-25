/**
 * Integration test: claim → stage advances → lead_stage_history → activity timeline.
 *
 * Creates a real lead in Supabase, drives it through four stage transitions using
 * updateLeadRecord (the chokepoint), then verifies:
 *   1. lead_stage_history has exactly the expected rows in order
 *   2. buildActivityTimeline returns stage_change events matching those rows
 *
 * Cleans up after itself regardless of outcome.
 *
 * Requires: real Supabase credentials in .env.local (loaded by vitest.integration.setup.ts).
 * Chatwoot syncs are disabled in the setup file.
 */
import { randomUUID } from 'crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
// eslint-disable-next-line no-restricted-imports -- integration tests need direct DB access
import { createServiceClient } from '@/lib/supabase/service';
import { updateLeadRecord } from '@/lib/leads/update-lead';
import { buildActivityTimeline } from '@/lib/leads/build-activity-timeline';

// ── Test fixture ─────────────────────────────────────────────────────────────

const TEST_LEAD_UUID = randomUUID();
// Resolved in beforeAll to a real salespeople.id to satisfy the FK on changed_by.
let TEST_USER_ID: string;

const STAGE_SEQUENCE = [
  'yeni',
  'bilgi-verildi',
  'ziyaret-etti',
  'kapora-alindi',
  'sozlesme-imzalandi',
] as const;

// ── Lifecycle ─────────────────────────────────────────────────────────────────

beforeAll(async () => {
  const client = createServiceClient();

  // Resolve a real salesperson id to satisfy the FK on lead_stage_history.changed_by.
  const { data: sp } = await client.from('salespeople').select('id').limit(1).single();
  if (!sp) throw new Error('No salespeople found in DB — cannot run integration tests');
  TEST_USER_ID = sp.id;

  // Insert a minimal test lead. No chatwoot_conversation_id so syncs are no-ops.
  const { error } = await client.from('leads').insert({
    uuid: TEST_LEAD_UUID,
    lead_name: `Integration Test Lead ${TEST_LEAD_UUID.slice(0, 8)}`,
    lead_phone: '+905550000000',
    lead_source: 'manual',
    funnel_status: 'yeni',
    is_deleted: false,
    is_archived: false,
    assigned_to: null,
  });

  if (error) throw new Error(`Failed to create test lead: ${error.message}`);
});

afterAll(async () => {
  const client = createServiceClient();
  // lead_stage_history and contact_history rows cascade-delete with the lead.
  await client.from('leads').delete().eq('uuid', TEST_LEAD_UUID);
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('stage history chokepoint — claim to signed', () => {
  it('advances through all stages and writes a history row for each transition', async () => {
    const client = createServiceClient();

    // Drive through the stage sequence.
    let currentStatus: string = 'yeni';
    for (const nextStatus of STAGE_SEQUENCE.slice(1)) {
      await updateLeadRecord(
        TEST_LEAD_UUID,
        { funnel_status: nextStatus },
        { funnel_status: currentStatus, assigned_to: null },
        TEST_USER_ID,
        'manual',
      );
      currentStatus = nextStatus;
    }

    // Verify lead_stage_history contains exactly the 4 application-written transitions.
    // The DB safety-net trigger may also insert source='system' rows for the same moves.
    const { data: historyRows, error } = await client
      .from('lead_stage_history')
      .select('from_status, to_status, changed_by, source')
      .eq('lead_uuid', TEST_LEAD_UUID)
      .eq('source', 'manual')
      .order('changed_at', { ascending: true });

    expect(error).toBeNull();

    const expectedTransitions = [
      { from: 'yeni', to: 'bilgi-verildi' },
      { from: 'bilgi-verildi', to: 'ziyaret-etti' },
      { from: 'ziyaret-etti', to: 'kapora-alindi' },
      { from: 'kapora-alindi', to: 'sozlesme-imzalandi' },
    ];

    expect(historyRows).toHaveLength(expectedTransitions.length);

    for (let i = 0; i < expectedTransitions.length; i++) {
      expect(historyRows![i].from_status).toBe(expectedTransitions[i].from);
      expect(historyRows![i].to_status).toBe(expectedTransitions[i].to);
      expect(historyRows![i].changed_by).toBe(TEST_USER_ID);
      expect(historyRows![i].source).toBe('manual');
    }
  });

  it('lead funnel_status matches the final stage after all advances', async () => {
    const client = createServiceClient();
    const { data: lead } = await client
      .from('leads')
      .select('funnel_status')
      .eq('uuid', TEST_LEAD_UUID)
      .single();

    expect(lead?.funnel_status).toBe('sozlesme-imzalandi');
  });
});

describe('buildActivityTimeline — stage changes appear as events', () => {
  it('returns stage_change events matching all four transitions, newest first', async () => {
    const timeline = await buildActivityTimeline(TEST_LEAD_UUID);

    const stageEvents = timeline.filter(
      (e) => e.kind === 'stage_change' && e.meta.source === 'manual',
    );

    expect(stageEvents).toHaveLength(4);

    // Newest first — sozlesme-imzalandi is at index 0.
    expect(stageEvents[0].meta.toStatus).toBe('sozlesme-imzalandi');
    expect(stageEvents[0].meta.fromStatus).toBe('kapora-alindi');

    expect(stageEvents[1].meta.toStatus).toBe('kapora-alindi');
    expect(stageEvents[1].meta.fromStatus).toBe('ziyaret-etti');

    expect(stageEvents[2].meta.toStatus).toBe('ziyaret-etti');
    expect(stageEvents[2].meta.fromStatus).toBe('bilgi-verildi');

    expect(stageEvents[3].meta.toStatus).toBe('bilgi-verildi');
    expect(stageEvents[3].meta.fromStatus).toBe('yeni');
  });

  it('all stage_change events reference the correct changedBy user', async () => {
    const timeline = await buildActivityTimeline(TEST_LEAD_UUID);
    const stageEvents = timeline.filter(
      (e) => e.kind === 'stage_change' && e.meta.source === 'manual',
    );

    for (const event of stageEvents) {
      expect(event.meta.changedBy).toBe(TEST_USER_ID);
    }
  });

  it('events are sorted newest first across all kinds', async () => {
    const timeline = await buildActivityTimeline(TEST_LEAD_UUID);

    for (let i = 0; i < timeline.length - 1; i++) {
      expect(new Date(timeline[i].happenedAt).getTime()).toBeGreaterThanOrEqual(
        new Date(timeline[i + 1].happenedAt).getTime(),
      );
    }
  });

  it('event ids are unique', async () => {
    const timeline = await buildActivityTimeline(TEST_LEAD_UUID);
    const ids = timeline.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
