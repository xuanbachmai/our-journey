import Phaser from 'phaser';

export type Palette = Record<string, string>;

/** Tiny seeded RNG so generated art and the map are stable between runs. */
export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function assertRows(rows: string[], w: number, h: number, name: string) {
  if (rows.length !== h) throw new Error(`${name}: expected ${h} rows, got ${rows.length}`);
  rows.forEach((r, i) => {
    if (r.length !== w) throw new Error(`${name}: row ${i} has ${r.length} chars, expected ${w}: "${r}"`);
  });
}

/** A canvas-backed texture we paint pixel by pixel, then slice into frames. */
export class PixelCanvas {
  readonly tex: Phaser.Textures.CanvasTexture;
  readonly ctx: CanvasRenderingContext2D;

  constructor(scene: Phaser.Scene, readonly key: string, readonly w: number, readonly h: number) {
    if (scene.textures.exists(key)) scene.textures.remove(key);
    const tex = scene.textures.createCanvas(key, w, h);
    if (!tex) throw new Error(`could not create canvas texture ${key}`);
    this.tex = tex;
    this.ctx = tex.context;
    this.ctx.imageSmoothingEnabled = false;
  }

  px(x: number, y: number, color: string) {
    this.ctx.fillStyle = color;
    this.ctx.fillRect(x | 0, y | 0, 1, 1);
  }

  rect(x: number, y: number, w: number, h: number, color: string) {
    this.ctx.fillStyle = color;
    this.ctx.fillRect(x | 0, y | 0, w | 0, h | 0);
  }

  /** Outline-only rectangle. */
  frameRect(x: number, y: number, w: number, h: number, color: string) {
    this.rect(x, y, w, 1, color);
    this.rect(x, y + h - 1, w, 1, color);
    this.rect(x, y, 1, h, color);
    this.rect(x + w - 1, y, 1, h, color);
  }

  disc(cx: number, cy: number, r: number, color: string) {
    for (let y = -r; y <= r; y++) {
      for (let x = -r; x <= r; x++) {
        if (x * x + y * y <= r * r + r * 0.5) this.px(cx + x, cy + y, color);
      }
    }
  }

  /** Pixel-map drawing. '.' is transparent. */
  rows(x0: number, y0: number, rows: string[], palette: Palette) {
    for (let y = 0; y < rows.length; y++) {
      const row = rows[y];
      for (let x = 0; x < row.length; x++) {
        const c = row[x];
        if (c === '.') continue;
        const color = palette[c];
        if (!color) throw new Error(`no palette entry for '${c}' in ${this.key}`);
        this.px(x0 + x, y0 + y, color);
      }
    }
  }

  frame(name: string | number, x: number, y: number, w: number, h: number) {
    this.tex.add(name, 0, x, y, w, h);
  }

  done() {
    this.tex.refresh();
    return this.tex;
  }
}

export function mirrorRows(rows: string[]): string[] {
  return rows.map((r) => r.split('').reverse().join(''));
}

export function replaceRows(base: string[], from: number, patch: string[]): string[] {
  const out = base.slice();
  patch.forEach((r, i) => (out[from + i] = r));
  return out;
}
