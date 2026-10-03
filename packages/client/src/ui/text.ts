import Phaser from 'phaser';
import { P } from '../art/palette';

export type FontKey = 'pixelify' | 'fredoka' | 'silkscreen' | 'pressstart';

export interface FontOption {
  key: FontKey;
  label: string;
  family: string;
  defaultSize: number;
}

export const FONT_OPTIONS: Record<FontKey, FontOption> = {
  pixelify: { key: 'pixelify', label: 'Pixel Clean', family: '"Pixelify Sans", sans-serif', defaultSize: 10 },
  fredoka: { key: 'fredoka', label: 'Cozy Rounded', family: '"Fredoka", sans-serif', defaultSize: 10 },
  silkscreen: { key: 'silkscreen', label: 'Compact Pixel', family: '"Silkscreen", monospace', defaultSize: 8 },
  pressstart: { key: 'pressstart', label: 'Retro Classic', family: '"Press Start 2P", monospace', defaultSize: 8 },
};

export function getSavedFontKey(): FontKey {
  try {
    const k = localStorage.getItem('oj-font-key') as FontKey;
    if (k && FONT_OPTIONS[k]) return k;
  } catch {
    /* ignore */
  }
  return 'pixelify';
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
  const strokeThick = extra.strokeThickness !== undefined ? extra.strokeThickness : size > 10 ? 3 : 2;

  return {
    fontFamily: opt.family,
    fontSize: `${size}px`,
    color: '#ffffff',
    stroke: P.outline,
    strokeThickness: strokeThick,
    resolution: 2,
    padding: { x: 4, y: 3 },
    ...extra,
  };
}

/** Slot counts sit on top of an icon, so they stay small and tight. */
export function tiny(extra: Partial<Phaser.Types.GameObjects.Text.TextStyle> = {}): Phaser.Types.GameObjects.Text.TextStyle {
  return style({ fontSize: '8px', strokeThickness: 2, padding: { x: 1, y: 1 }, ...extra });
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
  const zone = scene.add.zone(w / 2, h / 2, w, h).setInteractive({ useHandCursor: true });
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
