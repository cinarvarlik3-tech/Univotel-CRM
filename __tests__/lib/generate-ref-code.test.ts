/**
 * Unit tests for REF code generation.
 */
import { describe, expect, it } from 'vitest';
import { generateRefCode, isValidRefCodeFormat } from '@/lib/ref/generate-ref-code';

describe('generateRefCode', () => {
  it('generates UV- prefix with 4 characters', () => {
    const ref = generateRefCode();
    expect(ref).toMatch(/^UV-[A-Z0-9]{4}$/);
  });

  it('validates correct REF format', () => {
    expect(isValidRefCodeFormat('UV-9K2M')).toBe(true);
    expect(isValidRefCodeFormat('UV-9k2m')).toBe(false);
    expect(isValidRefCodeFormat('XX-9K2M')).toBe(false);
  });
});
