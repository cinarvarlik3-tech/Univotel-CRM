/**
 * Chatwoot assignee extraction tests.
 */
import { describe, expect, it } from 'vitest';
import {
  coerceChatwootAgentRef,
  extractAssigneeChange,
  extractAssigneeFromMeta,
} from '@/lib/webhooks/extract-assignee';

describe('extract-assignee', () => {
  it('coerces assignee object', () => {
    const ref = coerceChatwootAgentRef({
      id: 12,
      name: 'Emre Sefa Kadirhan',
      email: 'emre@example.com',
    });
    expect(ref).toEqual({
      id: 12,
      name: 'Emre Sefa Kadirhan',
      email: 'emre@example.com',
    });
  });

  it('reads meta.assignee', () => {
    const ref = extractAssigneeFromMeta({
      meta: { assignee: { id: 3, name: 'Test Agent' } },
    });
    expect(ref?.id).toBe(3);
  });

  it('extracts assignee_id change', () => {
    const change = extractAssigneeChange([
      {
        assignee_id: {
          current_value: 12,
          previous_value: null,
        },
      },
    ]);
    expect(change?.current?.id).toBe(12);
    expect(change?.previous).toBeNull();
  });
});
