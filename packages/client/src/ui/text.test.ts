import { beforeEach, describe, expect, it, vi } from 'vitest';
import { count, FONT_OPTIONS, type FontKey, getFontFamily, getSavedFontKey, note, plain, refreshFontConfig, saveFontKey, style } from './text';

beforeEach(() => {
  const store = new Map<string, string>();
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => store.set(k, v),
    removeItem: (k: string) => store.delete(k),
  });
});

describe('font configuration and text helpers', () => {
  it('defaults to gothic (DotGothic16) and cycles through every font back to gothic', () => {
    expect(getSavedFontKey()).toBe('gothic');
    expect(getFontFamily()).toContain('DotGothic16');

    const keys = Object.keys(FONT_OPTIONS) as FontKey[];
    expect(keys).toEqual(['gothic', 'pixelify', 'fredoka', 'silkscreen', 'pressstart']);

    let cur = getSavedFontKey();
    for (let i = 0; i < keys.length; i++) {
      const next = keys[(keys.indexOf(cur) + 1) % keys.length];
      saveFontKey(next);
      refreshFontConfig();
      cur = getSavedFontKey();
    }
    expect(cur).toBe('gothic');
  });

  it('falls back to gothic when localStorage holds an unknown font key', () => {
    localStorage.setItem('oj-font-key', 'nonexistent');
    expect(getSavedFontKey()).toBe('gothic');
  });

  it('uses each font option defaultSize and noteSize appropriately', () => {
    saveFontKey('gothic');
    expect(style().fontSize).toBe('10px');
    expect(plain().fontSize).toBe('10px');
    expect(note().fontSize).toBe('10px');

    saveFontKey('fredoka');
    expect(plain().fontSize).toBe('10px');
    expect(note().fontSize).toBe('8px');
    expect(note().fontStyle).toBe('600');
  });

  it('formats singular and plural counts cleanly', () => {
    expect(count(1, 'crop')).toBe('1 crop');
    expect(count(3, 'crop')).toBe('3 crops');
    expect(count(1, 'dish', 'dishes')).toBe('1 dish');
    expect(count(2, 'dish', 'dishes')).toBe('2 dishes');
  });
});
