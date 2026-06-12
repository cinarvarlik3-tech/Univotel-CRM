/**
 * Audit: performance.ts must exclude campaign messages from the personal message count.
 *
 * Campaign messages have sender_agent_id = null (no Chatwoot human agent behind them).
 * Human salesperson sends have sender_agent_id IS NOT NULL.
 *
 * The query in getPerformancePayload must apply .not('sender_agent_id', 'is', null)
 * so that campaign-sent messages do not inflate the personal activity count.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';
import * as path from 'path';

const performanceSrc = readFileSync(
  path.resolve(__dirname, '../../lib/my-day/performance.ts'),
  'utf8',
);

describe('campaign exclusion in getPerformancePayload', () => {
  it('queries lead_messages with sender_agent_id IS NOT NULL to exclude campaigns', () => {
    expect(performanceSrc).toContain("from('lead_messages')");
    expect(performanceSrc).toContain(".not('sender_agent_id', 'is', null)");
  });

  it('scopes lead_messages query to outgoing direction only', () => {
    expect(performanceSrc).toContain(".eq('direction', 'outgoing')");
  });

  it('uses Math.max to take the higher of contact_history messages and lead_messages count', () => {
    expect(performanceSrc).toContain('Math.max(messages, sentMessages');
  });
});
