import { beforeEach, describe, expect, it, vi } from 'vitest';
import { count, fitWidth, FONT_OPTIONS, type FontKey, getFontFamily, getSavedFontKey, note, plain, refreshFontConfig, saveFontKey, style } from './text';

beforeEach(() => {
  const store = new Map<string, string>();
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => store.set(k, v),
    removeItem: (k: string) => store.delete(k),
  });
});

describe('font configuration and text helpers', () => {
  it('defaults to the retro pixel face and cycles through every font back to it', () => {
    // A pixel face is drawn from whole pixels, so it stays sharp at any zoom;
    // the smooth faces are outlines the browser anti-aliases, which is what
    // read as fuzzy on screen.
    expect(getSavedFontKey()).toBe('pressstart');
    expect(getFontFamily()).toContain('Press Start 2P');

    const keys = Object.keys(FONT_OPTIONS) as FontKey[];
    expect(keys).toEqual(['fredoka', 'pixelify', 'gothic', 'silkscreen', 'pressstart']);

    let cur = getSavedFontKey();
    for (let i = 0; i < keys.length; i++) {
      const next = keys[(keys.indexOf(cur) + 1) % keys.length];
      saveFontKey(next);
      refreshFontConfig();
      cur = getSavedFontKey();
    }
    expect(cur).toBe('pressstart');
  });

  it('falls back to the default when localStorage holds an unknown font key', () => {
    localStorage.setItem('oj-font-key-v4', 'nonexistent');
    expect(getSavedFontKey()).toBe('pressstart');
  });

  it('knows how much wider each face runs, so panels can be sized for it', () => {
    // The panels were measured against Bitmap Gothic. A line set in the arcade
    // face needs about 60% more room, which is the difference between a card
    // that holds its sentence and one that spills out of both ends.
    expect(FONT_OPTIONS.gothic.width).toBe(1);
    expect(FONT_OPTIONS.pressstart.width).toBeGreaterThan(1.5);
    for (const o of Object.values(FONT_OPTIONS)) expect(o.width).toBeGreaterThan(0.5);
  });

  it('widens a panel for the chosen face but never past the screen', () => {
    saveFontKey('pressstart');
    refreshFontConfig();
    // room to grow: 286 design px becomes ~458
    expect(fitWidth(286, 800)).toBe(458);
    // no room: clamped to the screen rather than running off it
    expect(fitWidth(286, 300)).toBe(284);
    saveFontKey('gothic');
    refreshFontConfig();
    expect(fitWidth(286, 800)).toBe(286);
  });

  it('uses 2x pixel resolution and each font option defaultSize and noteSize appropriately', () => {
    saveFontKey('fredoka');
    expect(style().fontSize).toBe('10px');
    expect(style().resolution).toBe(2);
    expect(plain().fontSize).toBe('10px');
    expect(plain().resolution).toBe(2);
    expect(note().fontSize).toBe('8px');
    expect(note().fontStyle).toBe('600');

    saveFontKey('gothic');
    expect(style().fontSize).toBe('10px');
    expect(note().fontSize).toBe('9px');
  });

  it('formats singular and plural counts cleanly', () => {
    expect(count(1, 'crop')).toBe('1 crop');
    expect(count(3, 'crop')).toBe('3 crops');
    expect(count(1, 'dish', 'dishes')).toBe('1 dish');
    expect(count(2, 'dish', 'dishes')).toBe('2 dishes');
  });
});
