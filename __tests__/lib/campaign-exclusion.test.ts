/**
 * Audit: performance.ts must exclude campaign messages from the personal message count.
 *
 * Campaign messages have sender_agent_id = null (no Chatwoot human agent behind them).
 * Human salesperson sends are scoped via salespeople.chatwoot_user_id →
 * lead_messages.sender_agent_id (Chatwoot user ID as string).
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';
import * as path from 'path';

const performanceSrc = readFileSync(
  path.resolve(__dirname, '../../lib/my-day/performance.ts'),
  'utf8',
);

describe('campaign exclusion in getPerformancePayload', () => {
  it('scopes lead_messages to the rep via chatwoot_user_id (excludes campaign sends)', () => {
    expect(performanceSrc).toContain("from('lead_messages')");
    expect(performanceSrc).toContain('chatwoot_user_id');
    expect(performanceSrc).toContain(".eq('sender_agent_id', String(chatwootUserId))");
  });

  it('scopes lead_messages query to outgoing direction only', () => {
    expect(performanceSrc).toContain(".eq('direction', 'outgoing')");
  });

  it('uses Math.max to take the higher of contact_history messages and lead_messages count', () => {
    expect(performanceSrc).toContain('Math.max(messages, sentMessages');
  });

  it('counts message_sent from contact_history (not the invalid message type)', () => {
    expect(performanceSrc).toContain("interaction_type === 'message_sent'");
    expect(performanceSrc).not.toContain("interaction_type === 'message'");
  });
});
