/**
 * Unit tests for Supabase cookie parsing on API requests.
 */
import { describe, expect, it } from 'vitest';
import type { NextApiRequest } from 'next';
import { readApiRequestCookies } from '@/lib/supabase/cookies';

describe('readApiRequestCookies', () => {
  it('reads cookies from req.cookies when present', () => {
    const req = {
      cookies: {
        'sb-test-auth-token': 'token-value',
        'sb-test-auth-token.0': 'chunk-0',
      },
      headers: {},
    } as unknown as NextApiRequest;

    expect(readApiRequestCookies(req)).toEqual([
      { name: 'sb-test-auth-token', value: 'token-value' },
      { name: 'sb-test-auth-token.0', value: 'chunk-0' },
    ]);
  });

  it('falls back to the raw Cookie header when req.cookies is empty', () => {
    const req = {
      cookies: {},
      headers: {
        cookie: 'sb-test-auth-token=header-token; sb-test-auth-token.1=chunk-1',
      },
    } as unknown as NextApiRequest;

    expect(readApiRequestCookies(req)).toEqual([
      { name: 'sb-test-auth-token', value: 'header-token' },
      { name: 'sb-test-auth-token.1', value: 'chunk-1' },
    ]);
  });
});
