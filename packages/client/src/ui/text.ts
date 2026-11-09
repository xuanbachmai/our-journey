import Phaser from 'phaser';
import { P } from '../art/palette';

export type FontKey = 'gothic' | 'pixelify' | 'fredoka' | 'silkscreen' | 'pressstart';

export interface FontOption {
  key: FontKey;
  label: string;
  family: string;
  defaultSize: number;
  /**
   * The size the quiet second line is drawn at. A bitmap face holds together
   * at its own size and falls apart below it, so it says so rather than
   * everything assuming two pixels smaller is safe.
   */
  noteSize: number;
  /**
   * How wide this face runs compared with the one the panels were drawn for
   * (Bitmap Gothic at 10px = 1). Measured from the same sentence in each face:
   * a true arcade font is 60% wider per line than a smooth one, so a panel
   * with a fixed width holds nowhere near the same text. Layouts multiply
   * their width by this instead of hard-coding one font's measurements.
   */
  width: number;
  weight?: string;
}

export const FONT_OPTIONS: Record<FontKey, FontOption> = {
  fredoka: { key: 'fredoka', label: 'Cozy Rounded', family: '"Fredoka", sans-serif', defaultSize: 10, noteSize: 8, width: 0.89, weight: '600' },
  pixelify: { key: 'pixelify', label: 'Pixel Clean', family: '"Pixelify Sans", sans-serif', defaultSize: 11, noteSize: 9, width: 1.08, weight: '600' },
  gothic: { key: 'gothic', label: 'Bitmap Gothic', family: '"DotGothic16", sans-serif', defaultSize: 10, noteSize: 9, width: 1 },
  silkscreen: { key: 'silkscreen', label: 'Compact Pixel', family: '"Silkscreen", monospace', defaultSize: 8, noteSize: 8, width: 1.06 },
  pressstart: { key: 'pressstart', label: 'Retro Classic', family: '"Press Start 2P", monospace', defaultSize: 8, noteSize: 8, width: 1.6 },
};

const FONT_STORAGE_KEY = 'oj-font-key-v4';
/**
 * Retro Classic. A true pixel face is drawn from whole pixels, so it stays
 * crisp at any zoom; the smooth faces are outlines the browser has to
 * anti-alias, which is what read as fuzzy at small sizes. The storage key is
 * bumped with this so a device that already chose a font gets the new default
 * rather than keeping the old one for ever.
 */
const DEFAULT_FONT: FontKey = 'pressstart';
/**
 * How many real device pixels one game pixel covers. Text is rasterised at
 * this multiple, so a glyph lands on the display's own pixels instead of being
 * drawn small and then stretched — a fixed 2 here was why text stayed blurry
 * on any screen big enough to zoom past 2.
 */
let TEXT_RES = 2;
export function setTextScale(zoom: number) {
  const dpr = typeof window === 'undefined' ? 1 : window.devicePixelRatio || 1;
  TEXT_RES = Math.max(1, Math.min(8, Math.round(zoom * dpr)));
}

export function getSavedFontKey(): FontKey {
  try {
    const k = localStorage.getItem(FONT_STORAGE_KEY) as FontKey;
    if (k && FONT_OPTIONS[k]) return k;
  } catch {
    /* ignore */
  }
  return DEFAULT_FONT;
}

export function saveFontKey(key: FontKey) {
  try {
    if (FONT_OPTIONS[key]) localStorage.setItem(FONT_STORAGE_KEY, key);
  } catch {
    /* ignore */
  }
}

export function getFontFamily(): string {
  return FONT_OPTIONS[getSavedFontKey()].family;
}

export function getFontDefaultSize(): number {
  return FONT_OPTIONS[getSavedFontKey()].defaultSize;
}

/** Below this a label stops being worth reading, so the button must grow instead. */
const MIN_LABEL_PX = 7;

/** How much wider the chosen face runs than the one the panels were drawn for. */
export function fontWidth(): number {
  return FONT_OPTIONS[getSavedFontKey()].width;
}

/**
 * Widen a panel that was measured against Bitmap Gothic so the chosen face
 * still fits inside it, without letting it run off a narrow screen.
 */
export function fitWidth(designWidth: number, available: number, margin = 16): number {
  const want = Math.round(designWidth * FONT_OPTIONS[getSavedFontKey()].width);
  return Math.max(Math.min(designWidth, available - margin), Math.min(want, available - margin));
}

export let FONT = getFontFamily();

export function refreshFontConfig() {
  FONT = getFontFamily();
}

export function style(extra: Partial<Phaser.Types.GameObjects.Text.TextStyle> = {}): Phaser.Types.GameObjects.Text.TextStyle {
  const curKey = getSavedFontKey();
  const opt = FONT_OPTIONS[curKey];
  const size = extra.fontSize ? parseInt(String(extra.fontSize), 10) : opt.defaultSize;
  const strokeThick = extra.strokeThickness !== undefined ? extra.strokeThickness : 1;

  return {
    fontFamily: opt.family,
    fontSize: `${size}px`,
    ...(opt.weight ? { fontStyle: opt.weight } : {}),
    color: '#ffffff',
    stroke: P.outline,
    strokeThickness: strokeThick,
    shadow: { offsetX: 1, offsetY: 1, color: P.outline, blur: 0, stroke: true, fill: true },
    resolution: TEXT_RES,
    padding: { x: 3, y: 2 },
    ...extra,
  };
}

/** Slot counts sit on top of an icon, so they stay small and tight. */
export function tiny(extra: Partial<Phaser.Types.GameObjects.Text.TextStyle> = {}): Phaser.Types.GameObjects.Text.TextStyle {
  return style({
    fontSize: '8px',
    strokeThickness: 1,
    shadow: { offsetX: 1, offsetY: 1, color: P.outline, blur: 0, stroke: true, fill: true },
    padding: { x: 1, y: 1 },
    ...extra,
  });
}

export function plain(extra: Partial<Phaser.Types.GameObjects.Text.TextStyle> = {}): Phaser.Types.GameObjects.Text.TextStyle {
  const curKey = getSavedFontKey();
  const opt = FONT_OPTIONS[curKey];
  const size = extra.fontSize ? parseInt(String(extra.fontSize), 10) : opt.defaultSize;

  return {
    fontFamily: opt.family,
    fontSize: `${size}px`,
    ...(opt.weight ? { fontStyle: opt.weight } : {}),
    color: P.outline,
    resolution: TEXT_RES,
    padding: { x: 2, y: 1 },
    ...extra,
  };
}

/**
 * The second line of a row inside a panel: a size down from plain, same dark
 * ink, no outline.
 */
export function note(extra: Partial<Phaser.Types.GameObjects.Text.TextStyle> = {}): Phaser.Types.GameObjects.Text.TextStyle {
  const opt = FONT_OPTIONS[getSavedFontKey()];
  const smooth = opt.noteSize < opt.defaultSize && !!opt.weight;
  return plain({ fontSize: `${opt.noteSize}px`, ...(smooth ? { fontStyle: '600' } : {}), padding: { x: 2, y: 1 }, ...extra });
}

/**
 * "1 crop", "3 crops". Every count the player reads goes through this; writing
 * "1 crops" on the welcome screen is the sort of thing that makes a game feel
 * unfinished even when everything behind it works.
 */
export function count(n: number, one: string, many = one + 's'): string {
  return `${n} ${n === 1 ? one : many}`;
}

/** A rounded pixel pill, for tabs and for the coin chip beside a price. */
export function pill(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number, fill: number, outline = 0x4a2a3f) {
  const r = Math.min(4, Math.floor(h / 2));
  g.fillStyle(outline, 1);
  g.fillRect(x + r, y, w - r * 2, h);
  g.fillRect(x, y + r, w, h - r * 2);
  g.fillRect(x + 1, y + 1, w - 2, h - 2);
  g.fillStyle(fill, 1);
  g.fillRect(x + r, y + 1, w - r * 2, h - 2);
  g.fillRect(x + 1, y + r, w - 2, h - r * 2);
  g.fillRect(x + 2, y + 2, w - 4, h - 4);
  g.fillStyle(0xffffff, 0.5);
  g.fillRect(x + r, y + 1, w - r * 2, 1);
}

/** Pixel filled bar: how much of a wait is done, how much of an order is shipped. */
export function meter(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number, frac: number, fill: number) {
  g.fillStyle(0x4a2a3f, 1).fillRect(x, y, w, h);
  g.fillStyle(0xe8dcc8, 1).fillRect(x + 1, y + 1, w - 2, h - 2);
  const inner = Math.max(0, Math.min(1, frac)) * (w - 2);
  if (inner > 0) {
    g.fillStyle(fill, 1).fillRect(x + 1, y + 1, inner, h - 2);
    g.fillStyle(0xffffff, 0.35).fillRect(x + 1, y + 1, inner, 1);
  }
}

/**
 * Raised pixel panel with outline, directional light top-left, and shade bottom-right.
 */
export function panel(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number, fill = 0xfff4dc, outline = 0x4a2a3f) {
  g.fillStyle(outline, 1);
  g.fillRect(x + 1, y, w - 2, h);
  g.fillRect(x, y + 1, w, h - 2);
  g.fillStyle(fill, 1);
  g.fillRect(x + 2, y + 1, w - 4, h - 2);
  g.fillRect(x + 1, y + 2, w - 2, h - 4);
  // lit from top-left
  g.fillStyle(0xffffff, 0.55);
  g.fillRect(x + 2, y + 1, w - 4, 1);
  g.fillRect(x + 1, y + 2, 1, h - 4);
  // shaded at bottom-right
  g.fillStyle(0x000000, 0.14);
  g.fillRect(x + 2, y + h - 2, w - 4, 1);
  g.fillRect(x + w - 2, y + 2, 1, h - 4);
}

/** Recessed pixel slot (shade at top-left, light at bottom-right). */
export function inset(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number, fill = 0xe8dcc8, outline = 0x4a2a3f) {
  g.fillStyle(outline, 1);
  g.fillRect(x + 1, y, w - 2, h);
  g.fillRect(x, y + 1, w, h - 2);
  g.fillStyle(fill, 1);
  g.fillRect(x + 2, y + 1, w - 4, h - 2);
  g.fillRect(x + 1, y + 2, w - 2, h - 4);
  g.fillStyle(0x000000, 0.2);
  g.fillRect(x + 2, y + 1, w - 4, 1);
  g.fillRect(x + 1, y + 2, 1, h - 4);
  g.fillStyle(0xffffff, 0.45);
  g.fillRect(x + 2, y + h - 2, w - 4, 1);
  g.fillRect(x + w - 2, y + 2, 1, h - 4);
}

/** Title bar with pixel bevel. */
export function titleBar(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number, fill = 0xffd23f, outline = 0x4a2a3f) {
  g.fillStyle(fill, 1);
  g.fillRect(x, y, w, h);
  g.fillStyle(0xffffff, 0.35);
  g.fillRect(x, y, w, Math.max(1, Math.floor(h / 3)));
  g.fillStyle(0xffffff, 0.5);
  g.fillRect(x, y, w, 1);
  g.fillStyle(0x000000, 0.18);
  g.fillRect(x, y + h - 2, w, 1);
  g.fillStyle(outline, 1);
  g.fillRect(x, y + h - 1, w, 1);
}

export interface Button {
  container: Phaser.GameObjects.Container;
  setLabel(t: string): void;
  setEnabled(v: boolean): void;
}

export function button(
  scene: Phaser.Scene,
  x: number,
  y: number,
  w: number,
  h: number,
  label: string,
  onClick: () => void,
  color = 0xffd23f,
): Button {
  const g = scene.add.graphics();
  // pressing it turns the bevel inside out and drops the label a pixel, which
  // is the whole of what makes a button feel like it went down
  const draw = (down: boolean) => {
    if (!g.scene || !t.active) return;
    g.clear();
    (down ? inset : panel)(g, 0, 0, w, h, color);
    t.setPosition(w / 2, h / 2 + (down ? 1 : 0));
  };
  const t = scene.add.text(w / 2, h / 2, label, plain()).setOrigin(0.5);
  // A label too wide for its button steps down a whole pixel at a time. It
  // must never be scaled by a fraction: a pixel face squeezed to 0.6 lands its
  // stems between pixels and comes out as mush - "Story" rendered as "Slury".
  // Whole sizes keep every glyph on the pixel grid and legible.
  const baseSize = getFontDefaultSize();
  const fitLabel = () => {
    t.setScale(1);
    const room = w - 6;
    let size = baseSize;
    t.setFontSize(size);
    while (t.width > room && size > MIN_LABEL_PX) {
      size -= 1;
      t.setFontSize(size);
    }
  };
  fitLabel();
  draw(false);
  // A thumb is wider than the button looks. The tap area is grown to at least
  // 22x20 game pixels (44pt on a phone) without changing what is drawn.
  const zw = Math.max(w, 22);
  const zh = Math.max(h, 20);
  const zone = scene.add.zone(w / 2, h / 2, zw, zh).setInteractive({ useHandCursor: true });
  const c = scene.add.container(x, y, [g, t, zone]);
  let enabled = true;
  zone.on('pointerdown', () => {
    if (!enabled) return;
    draw(true);
    scene.time.delayedCall(90, () => draw(false));
    onClick();
  });
  return {
    container: c,
    setLabel: (s) => {
      t.setText(s);
      fitLabel();
    },
    setEnabled: (v) => {
      enabled = v;
      c.setAlpha(v ? 1 : 0.5);
    },
  };
}
