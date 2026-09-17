import Phaser from 'phaser';
import { P } from '../art/palette';

export const FONT = '"Press Start 2P"';

export function style(extra: Partial<Phaser.Types.GameObjects.Text.TextStyle> = {}): Phaser.Types.GameObjects.Text.TextStyle {
  return {
    fontFamily: FONT,
    fontSize: '8px',
    color: '#ffffff',
    stroke: P.outline,
    strokeThickness: 3,
    resolution: 1,
    ...extra,
  };
}

export function plain(extra: Partial<Phaser.Types.GameObjects.Text.TextStyle> = {}): Phaser.Types.GameObjects.Text.TextStyle {
  return {
    fontFamily: FONT,
    fontSize: '8px',
    color: P.outline,
    resolution: 1,
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
  const t = scene.add.text(w / 2, h / 2 + 1, label, plain()).setOrigin(0.5);
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
