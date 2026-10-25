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
  weight?: string;
}

export const FONT_OPTIONS: Record<FontKey, FontOption> = {
  fredoka: { key: 'fredoka', label: 'Cozy Rounded', family: '"Fredoka", sans-serif', defaultSize: 10, noteSize: 8, weight: '600' },
  pixelify: { key: 'pixelify', label: 'Pixel Clean', family: '"Pixelify Sans", sans-serif', defaultSize: 11, noteSize: 9, weight: '600' },
  gothic: { key: 'gothic', label: 'Bitmap Gothic', family: '"DotGothic16", sans-serif', defaultSize: 10, noteSize: 9 },
  silkscreen: { key: 'silkscreen', label: 'Compact Pixel', family: '"Silkscreen", monospace', defaultSize: 8, noteSize: 8 },
  pressstart: { key: 'pressstart', label: 'Retro Classic', family: '"Press Start 2P", monospace', defaultSize: 8, noteSize: 8 },
};

const FONT_STORAGE_KEY = 'oj-font-key-v2';
const TEXT_RES = 4;

/**
 * Ensure every Phaser Text texture uses LINEAR filtering in WebGL so 4x
 * supersampled glyphs map smoothly onto the high-DPI framebuffer while pixel-art
 * sprites keep NEAREST filtering.
 */
function ensureCrispTextFilter() {
  const Proto = (Phaser as unknown as {
    GameObjects?: {
      Text?: {
        prototype?: {
          updateText?: () => unknown;
          __crispPatched?: boolean;
        };
      };
    };
  })?.GameObjects?.Text?.prototype;
  if (!Proto?.updateText || Proto.__crispPatched) return;
  Proto.__crispPatched = true;
  const origUpdate = Proto.updateText;
  Proto.updateText = function (this: Phaser.GameObjects.Text) {
    const res = origUpdate.call(this);
    if (this.frame?.source) {
      this.frame.source.scaleMode = 0;
      const gl = (this.renderer as Phaser.Renderer.WebGL.WebGLRenderer | undefined)?.gl;
      const glTex = this.frame.source.glTexture?.webGLTexture;
      if (gl && glTex) {
        gl.bindTexture(gl.TEXTURE_2D, glTex);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      }
    }
    return res;
  };
}
ensureCrispTextFilter();

export function getSavedFontKey(): FontKey {
  try {
    const k = localStorage.getItem(FONT_STORAGE_KEY) as FontKey;
    if (k && FONT_OPTIONS[k]) return k;
  } catch {
    /* ignore */
  }
  return 'fredoka';
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

export let FONT = getFontFamily();

export function refreshFontConfig() {
  FONT = getFontFamily();
}

export function style(extra: Partial<Phaser.Types.GameObjects.Text.TextStyle> = {}): Phaser.Types.GameObjects.Text.TextStyle {
  const curKey = getSavedFontKey();
  const opt = FONT_OPTIONS[curKey];
  const size = extra.fontSize ? parseInt(String(extra.fontSize), 10) : opt.defaultSize;
  const strokeThick = extra.strokeThickness !== undefined ? extra.strokeThickness : 2.5;

  return {
    fontFamily: opt.family,
    fontSize: `${size}px`,
    ...(opt.weight ? { fontStyle: opt.weight } : {}),
    color: '#ffffff',
    stroke: P.outline,
    strokeThickness: strokeThick,
    shadow: { offsetX: 0, offsetY: 1, color: P.outline, blur: 0, stroke: true, fill: false },
    resolution: TEXT_RES,
    padding: { x: 2, y: 1 },
    ...extra,
  };
}

/** Slot counts sit on top of an icon, so they stay small and tight. */
export function tiny(extra: Partial<Phaser.Types.GameObjects.Text.TextStyle> = {}): Phaser.Types.GameObjects.Text.TextStyle {
  return style({
    fontSize: '7px',
    strokeThickness: 2,
    shadow: { offsetX: 0, offsetY: 1, color: P.outline, blur: 0, stroke: true, fill: false },
    padding: { x: 1, y: 0 },
    ...extra,
  });
}

export function plain(extra: Partial<Phaser.Types.GameObjects.Text.TextStyle> = {}): Phaser.Types.GameObjects.Text.TextStyle {
  const curKey = getSavedFontKey();
  const opt = FONT_OPTIONS[curKey];
  const size = extra.fontSize ? parseInt(String(extra.fontSize), 10) : opt.defaultSize;
  const hasStroke = (extra.strokeThickness ?? 0) > 0;

  return {
    fontFamily: opt.family,
    fontSize: `${size}px`,
    ...(opt.weight ? { fontStyle: opt.weight } : {}),
    color: P.outline,
    resolution: TEXT_RES,
    padding: hasStroke ? { x: 2, y: 1 } : { x: 1, y: 0 },
    ...extra,
  };
}

/**
 * The second line of a row inside a panel: a size down from plain, same dark
 * ink, no outline.
 */
export function note(extra: Partial<Phaser.Types.GameObjects.Text.TextStyle> = {}): Phaser.Types.GameObjects.Text.TextStyle {
  const opt = FONT_OPTIONS[getSavedFontKey()];
  const smooth = opt.noteSize < opt.defaultSize;
  return plain({ fontSize: `${opt.noteSize}px`, ...(smooth ? { fontStyle: '600' } : {}), padding: { x: 1, y: 0 }, ...extra });
}

/**
 * "1 crop", "3 crops". Every count the player reads goes through this; writing
 * "1 crops" on the welcome screen is the sort of thing that makes a game feel
 * unfinished even when everything behind it works.
 */
export function count(n: number, one: string, many = one + 's'): string {
  return `${n} ${n === 1 ? one : many}`;
}

/** Smooth high-DPI rounded pill, for tabs and for the coin/heart chips. */
export function pill(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number, fill: number, outline = 0x4a2a3f) {
  const r = Math.max(2, Math.min(6, h / 2));
  g.fillStyle(outline, 1).fillRoundedRect(x, y, w, h, r);
  g.fillStyle(fill, 1).fillRoundedRect(x + 1, y + 1, Math.max(2, w - 2), Math.max(2, h - 2), Math.max(1, r - 1));
  if (w > 6 && h > 4) {
    g.fillStyle(0xffffff, 0.5).fillRoundedRect(x + 2, y + 1.2, Math.max(2, w - 4), 1.2, 0.6);
  }
}

/** Smooth high-DPI filled progress bar. */
export function meter(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number, frac: number, fill: number) {
  const r = Math.max(1.5, Math.min(3, h / 2));
  g.fillStyle(0x4a2a3f, 1).fillRoundedRect(x, y, w, h, r);
  g.fillStyle(0xe8dcc8, 1).fillRoundedRect(x + 1, y + 1, Math.max(2, w - 2), Math.max(2, h - 2), Math.max(1, r - 0.8));
  const inner = Math.max(0, Math.min(1, frac)) * (w - 2);
  if (inner > 0.5) {
    const ir = Math.max(0.8, Math.min(r - 0.8, inner / 2));
    g.fillStyle(fill, 1).fillRoundedRect(x + 1, y + 1, inner, Math.max(2, h - 2), ir);
    if (inner > 2) g.fillStyle(0xffffff, 0.35).fillRect(x + 1.5, y + 1, inner - 1, 1);
  }
}

/** Smooth high-DPI raised panel with outline, bottom shade bevel, and top specular rim. */
export function panel(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number, fill = 0xfff4dc, outline = 0x4a2a3f) {
  const r = Math.max(2, Math.min(5, Math.min(w, h) * 0.2));
  const ir = Math.max(1, r - 1);
  g.fillStyle(outline, 1).fillRoundedRect(x, y, w, h, r);
  g.fillStyle(0x000000, 0.14).fillRoundedRect(x + 1, y + 1, Math.max(2, w - 2), Math.max(2, h - 2), ir);
  g.fillStyle(fill, 1).fillRoundedRect(x + 1, y + 1, Math.max(2, w - 2), Math.max(2, h - 2.6), ir);
  if (w > 6 && h > 6) {
    g.fillStyle(0xffffff, 0.55).fillRoundedRect(x + 2, y + 1.2, Math.max(2, w - 4), 1.2, 0.6);
  }
}

/** Smooth high-DPI recessed slot (shade at top, light at bottom). */
export function inset(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number, fill = 0xe8dcc8, outline = 0x4a2a3f) {
  const r = Math.max(2, Math.min(4.5, Math.min(w, h) * 0.2));
  const ir = Math.max(1, r - 1);
  g.fillStyle(outline, 1).fillRoundedRect(x, y, w, h, r);
  g.fillStyle(0x000000, 0.18).fillRoundedRect(x + 1, y + 1, Math.max(2, w - 2), Math.max(2, h - 2), ir);
  g.fillStyle(fill, 1).fillRoundedRect(x + 1, y + 1.8, Math.max(2, w - 2), Math.max(2, h - 2.6), ir);
}

/** A title bar: the panel's fill, lighter at the top, with a line under it. */
export function titleBar(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number, fill = 0xffd23f, outline = 0x4a2a3f) {
  g.fillStyle(fill, 1).fillRoundedRect(x, y, w, h, { tl: 4, tr: 4, bl: 0, br: 0 });
  g.fillStyle(0xffffff, 0.35).fillRoundedRect(x, y, w, Math.max(1, Math.floor(h / 3)), { tl: 4, tr: 4, bl: 0, br: 0 });
  g.fillStyle(0x000000, 0.16).fillRect(x, y + h - 2, w, 1);
  g.fillStyle(outline, 1).fillRect(x, y + h - 1, w, 1);
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
    g.clear();
    (down ? inset : panel)(g, 0, 0, w, h, color);
    t?.setPosition(w / 2, h / 2 + (down ? 1 : 0));
  };
  const t = scene.add.text(w / 2, h / 2, label, plain()).setOrigin(0.5);
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
    setLabel: (s) => t.setText(s),
    setEnabled: (v) => {
      enabled = v;
      c.setAlpha(v ? 1 : 0.5);
    },
  };
}
