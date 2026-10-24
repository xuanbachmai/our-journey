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
}

export const FONT_OPTIONS: Record<FontKey, FontOption> = {
  gothic: { key: 'gothic', label: 'Bitmap Gothic', family: '"DotGothic16", sans-serif', defaultSize: 10, noteSize: 10 },
  pixelify: { key: 'pixelify', label: 'Pixel Clean', family: '"Pixelify Sans", sans-serif', defaultSize: 12, noteSize: 10 },
  fredoka: { key: 'fredoka', label: 'Cozy Rounded', family: '"Fredoka", sans-serif', defaultSize: 10, noteSize: 8 },
  silkscreen: { key: 'silkscreen', label: 'Compact Pixel', family: '"Silkscreen", monospace', defaultSize: 8, noteSize: 8 },
  pressstart: { key: 'pressstart', label: 'Retro Classic', family: '"Press Start 2P", monospace', defaultSize: 8, noteSize: 8 },
};

export function getSavedFontKey(): FontKey {
  try {
    const k = localStorage.getItem('oj-font-key') as FontKey;
    if (k && FONT_OPTIONS[k]) return k;
  } catch {
    /* ignore */
  }
  // A bitmap gothic by default. Measured at the size the game actually draws,
  // it is the one face that is both pixel-crisp and has real lowercase, which
  // the rounded sans before it bought legibility by giving up.
  return 'gothic';
}

export function saveFontKey(key: FontKey) {
  try {
    if (FONT_OPTIONS[key]) localStorage.setItem('oj-font-key', key);
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

export let FONT = getFontFamily();

export function refreshFontConfig() {
  FONT = getFontFamily();
}

export function style(extra: Partial<Phaser.Types.GameObjects.Text.TextStyle> = {}): Phaser.Types.GameObjects.Text.TextStyle {
  const curKey = getSavedFontKey();
  const opt = FONT_OPTIONS[curKey];
  const size = extra.fontSize ? parseInt(String(extra.fontSize), 10) : opt.defaultSize;
  // One pixel of outline and a hard shadow under it. A thick stroke is how
  // you make text readable over a world when the face is chunky; on a thin
  // bitmap one it closes the counters of the letters and the whole line turns
  // to mud, which is what three pixels of it was doing here.
  const strokeThick = extra.strokeThickness !== undefined ? extra.strokeThickness : 1;

  return {
    fontFamily: opt.family,
    fontSize: `${size}px`,
    color: '#ffffff',
    stroke: P.outline,
    strokeThickness: strokeThick,
    shadow: { offsetX: 1, offsetY: 1, color: P.outline, blur: 0, stroke: true, fill: true },
    resolution: 2,
    padding: { x: 4, y: 3 },
    ...extra,
  };
}

/** Slot counts sit on top of an icon, so they stay small and tight. */
export function tiny(extra: Partial<Phaser.Types.GameObjects.Text.TextStyle> = {}): Phaser.Types.GameObjects.Text.TextStyle {
  // A count sits on an icon, so it keeps its single pixel of outline and the
  // shadow that comes with it, and nothing more.
  return style({ fontSize: '8px', strokeThickness: 1, padding: { x: 1, y: 1 }, ...extra });
}

export function plain(extra: Partial<Phaser.Types.GameObjects.Text.TextStyle> = {}): Phaser.Types.GameObjects.Text.TextStyle {
  const curKey = getSavedFontKey();
  const opt = FONT_OPTIONS[curKey];
  const size = extra.fontSize ? parseInt(String(extra.fontSize), 10) : opt.defaultSize;

  return {
    fontFamily: opt.family,
    fontSize: `${size}px`,
    color: P.outline,
    resolution: 2,
    padding: { x: 4, y: 3 },
    ...extra,
  };
}

/**
 * The second line of a row inside a panel: a size down from plain, same dark
 * ink, no outline. (tiny() is for counts that sit on top of a sprite and needs
 * its stroke; inside a panel that stroke turns small text into a smudge.)
 */
export function note(extra: Partial<Phaser.Types.GameObjects.Text.TextStyle> = {}): Phaser.Types.GameObjects.Text.TextStyle {
  const opt = FONT_OPTIONS[getSavedFontKey()];
  // Each face names the size its quiet line survives at; a bitmap one stays
  // put, a smooth one goes down and gains weight to hold against the cream.
  const smooth = opt.noteSize < opt.defaultSize;
  return plain({ fontSize: `${opt.noteSize}px`, ...(smooth ? { fontStyle: '600' } : {}), padding: { x: 2, y: 2 }, ...extra });
}

/**
 * "1 crop", "3 crops". Every count the player reads goes through this; writing
 * "1 crops" on the welcome screen is the sort of thing that makes a game feel
 * unfinished even when everything behind it works.
 */
export function count(n: number, one: string, many = one + 's'): string {
  return `${n} ${n === 1 ? one : many}`;
}

/** A rounded pill, for tabs and for the coin chip beside a price. */
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

/** A filled bar: how much of a wait is done, how much of an order is shipped. */
export function meter(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number, frac: number, fill: number) {
  g.fillStyle(0x4a2a3f, 1).fillRect(x, y, w, h);
  g.fillStyle(0xe8dcc8, 1).fillRect(x + 1, y + 1, w - 2, h - 2);
  const inner = Math.max(0, Math.min(1, frac)) * (w - 2);
  if (inner > 0) {
    g.fillStyle(fill, 1).fillRect(x + 1, y + 1, inner, h - 2);
    g.fillStyle(0xffffff, 0.35).fillRect(x + 1, y + 1, inner, 1);
  }
}

/** Rounded pixel panel: outline + fill + light top edge. */
export function panel(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number, fill = 0xfff4dc, outline = 0x4a2a3f) {
  g.fillStyle(outline, 1);
  g.fillRect(x + 1, y, w - 2, h);
  g.fillRect(x, y + 1, w, h - 2);
  g.fillStyle(fill, 1);
  g.fillRect(x + 2, y + 1, w - 4, h - 2);
  g.fillRect(x + 1, y + 2, w - 2, h - 4);
  g.fillStyle(0xffffff, 0.6);
  g.fillRect(x + 2, y + 1, w - 4, 1);
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
  const draw = (c: number) => {
    g.clear();
    panel(g, 0, 0, w, h, c);
  };
  draw(color);
  const t = scene.add.text(w / 2, h / 2, label, plain()).setOrigin(0.5);
  // A thumb is wider than the button looks. The tap area is grown to at least
  // 22x20 game pixels (44pt on a phone) without changing what is drawn.
  const zw = Math.max(w, 22);
  const zh = Math.max(h, 20);
  const zone = scene.add.zone(w / 2, h / 2, zw, zh).setInteractive({ useHandCursor: true });
  const c = scene.add.container(x, y, [g, t, zone]);
  let enabled = true;
  zone.on('pointerdown', () => {
    if (!enabled) return;
    draw(0xffffff);
    scene.time.delayedCall(80, () => draw(color));
    onClick();
  });
  return {
    container: c,
    setLabel: (s) => t.setText(s),
    setEnabled: (v) => {
      enabled = v;
      c.setAlpha(v ? 1 : 0.5);
    },
  };
}
