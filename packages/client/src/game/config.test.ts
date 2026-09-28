import { describe, expect, it } from 'vitest';
import { isRealConfig } from './net';

const KEY = 'a'.repeat(40);

describe('backend configuration', () => {
  it('accepts a real Supabase project', () => {
    expect(isRealConfig('https://abcdefgh.supabase.co', KEY)).toBe(true);
  });

  it('ignores the placeholders a host may prefill from .env.example', () => {
    expect(isRealConfig('https://your-project.supabase.co', KEY)).toBe(false);
    expect(isRealConfig('https://abcdefgh.supabase.co', 'your-anon-public-key')).toBe(false);
  });

  it('ignores empty, half-filled and malformed values', () => {
    expect(isRealConfig('', '')).toBe(false);
    expect(isRealConfig('https://abcdefgh.supabase.co', '')).toBe(false);
    expect(isRealConfig('', KEY)).toBe(false);
    expect(isRealConfig('not a url', KEY)).toBe(false);
    expect(isRealConfig('http://abcdefgh.supabase.co', KEY)).toBe(false);
    expect(isRealConfig('https://abcdefgh.supabase.co', 'short')).toBe(false);
  });
});
