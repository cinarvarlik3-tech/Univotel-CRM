/**
 * Unit tests for Instagram handle normalization.
 */
import { describe, expect, it } from 'vitest';
import { normalizeInstagramHandle } from '@/lib/leads/normalize-instagram-handle';

describe('normalizeInstagramHandle', () => {
  it('lowercases and strips leading @', () => {
    expect(normalizeInstagramHandle('@Student.User')).toEqual({
      handle: 'student.user',
      failed: false,
    });
  });

  it('accepts valid handles without @', () => {
    expect(normalizeInstagramHandle('univotel_official')).toEqual({
      handle: 'univotel_official',
      failed: false,
    });
  });

  it('flags empty input', () => {
    expect(normalizeInstagramHandle('   ')).toEqual({
      handle: '   ',
      failed: true,
    });
  });

  it('flags invalid characters', () => {
    expect(normalizeInstagramHandle('bad handle!')).toEqual({
      handle: 'bad handle!',
      failed: true,
    });
  });
});
