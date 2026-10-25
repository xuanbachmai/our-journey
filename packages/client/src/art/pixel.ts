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

export interface FrameRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

const BAYER2 = [
  [-3, 2],
  [3, -2],
];

function clampByte(v: number): number {
  return v < 0 ? 0 : v > 255 ? 255 : v | 0;
}

function isOutline(r: number, g: number, b: number, a: number): boolean {
  return a > 220 && Math.abs(r - 74) <= 6 && Math.abs(g - 42) <= 6 && Math.abs(b - 63) <= 6;
}

function isProtectedFeature(r: number, g: number, b: number): boolean {
  // Eye (#2b1d28 -> 43,29,40), pure white shine (#ffffff), or cheek blush (#ff9bb3 -> 255,155,179)
  if (Math.abs(r - 43) <= 4 && Math.abs(g - 29) <= 4 && Math.abs(b - 40) <= 4) return true;
  if (r >= 248 && g >= 248 && b >= 248) return true;
  if (Math.abs(r - 255) <= 4 && Math.abs(g - 155) <= 6 && Math.abs(b - 179) <= 6) return true;
  return false;
}

function sameBaseColor(a: Uint8ClampedArray, i: number, j: number): boolean {
  return (
    a[i + 3] === a[j + 3] &&
    Math.abs(a[i] - a[j]) <= 4 &&
    Math.abs(a[i + 1] - a[j + 1]) <= 4 &&
    Math.abs(a[i + 2] - a[j + 2]) <= 4
  );
}

/**
 * Pass 1: Pro Pixel Art Shading
 * - Selective Outlining (Sel-Out) tinted by adjacent material color + directional sun edge lighting
 * - Top-left specular rim highlight & bottom-right ambient occlusion relief
 * - Smooth vertical lustre gradient & subtle 2x2 ordered Bayer micro-texture on flat fills
 */
export function shadePixelArt(data: Uint8ClampedArray, w: number, h: number, frames: FrameRect[]) {
  const src = new Uint8ClampedArray(data);
  const idx = (x: number, y: number) => (y * w + x) * 4;

  for (const f of frames) {
    const x0 = Math.max(0, f.x);
    const y0 = Math.max(0, f.y);
    const x1 = Math.min(w, f.x + f.w);
    const y1 = Math.min(h, f.y + f.h);

    for (let y = y0; y < y1; y++) {
      for (let x = x0; x < x1; x++) {
        const i = idx(x, y);
        const r = src[i];
        const g = src[i + 1];
        const b = src[i + 2];
        const a = src[i + 3];
        if (a < 200) continue;

        // 1. Selective Outlining (Sel-Out)
        if (isOutline(r, g, b, a)) {
          let sumR = 0;
          let sumG = 0;
          let sumB = 0;
          let count = 0;
          const dirs = [
            [-1, 0],
            [1, 0],
            [0, -1],
            [0, 1],
          ];
          for (const [dx, dy] of dirs) {
            const nx = x + dx;
            const ny = y + dy;
            if (nx < x0 || nx >= x1 || ny < y0 || ny >= y1) continue;
            const ni = idx(nx, ny);
            const na = src[ni + 3];
            if (na > 200 && !isOutline(src[ni], src[ni + 1], src[ni + 2], na)) {
              sumR += src[ni];
              sumG += src[ni + 1];
              sumB += src[ni + 2];
              count++;
            }
          }
          let nr = r;
          let ng = g;
          let nb = b;
          if (count > 0) {
            const avgR = sumR / count;
            const avgG = sumG / count;
            const avgB = sumB / count;
            nr = r * 0.56 + avgR * 0.52 * 0.44;
            ng = g * 0.56 + avgG * 0.5 * 0.44;
            nb = b * 0.56 + avgB * 0.56 * 0.44;
          }
          const topTrans = y === y0 || src[idx(x, y - 1) + 3] < 50;
          const leftTrans = x === x0 || src[idx(x - 1, y) + 3] < 50;
          const botTrans = y === y1 - 1 || src[idx(x, y + 1) + 3] < 50;
          const rightTrans = x === x1 - 1 || src[idx(x + 1, y) + 3] < 50;
          const sunShift = (topTrans ? 10 : 0) + (leftTrans ? 6 : 0) - (botTrans ? 9 : 0) - (rightTrans ? 5 : 0);
          data[i] = clampByte(nr + sunShift);
          data[i + 1] = clampByte(ng + sunShift);
          data[i + 2] = clampByte(nb + sunShift);
          continue;
        }

        if (isProtectedFeature(r, g, b)) continue;

        // 2. Interior Material Region Span Analysis
        let yTop = y;
        while (yTop > y0 && sameBaseColor(src, i, idx(x, yTop - 1))) yTop--;
        let yBot = y;
        while (yBot < y1 - 1 && sameBaseColor(src, i, idx(x, yBot + 1))) yBot++;

        let xLeft = x;
        while (xLeft > x0 && sameBaseColor(src, i, idx(xLeft - 1, y))) xLeft--;
        let xRight = x;
        while (xRight < x1 - 1 && sameBaseColor(src, i, idx(xRight + 1, y))) xRight++;

        const vSpan = yBot - yTop + 1;
        const hSpan = xRight - xLeft + 1;
        if (vSpan + hSpan < 4) continue;

        let dr = 0;
        let dg = 0;
        let db = 0;

        // Smooth vertical lustre gradient across the material span
        if (vSpan >= 3) {
          const t = (y - yTop) / (vSpan - 1);
          const grad = (0.45 - t) * 18;
          dr += grad * 1.05;
          dg += grad;
          db += grad * 0.85;
        }

        // Top-left directional sun rim highlight & bottom-right ambient occlusion
        if (y === yTop && vSpan >= 2) {
          dr += 13;
          dg += 12;
          db += 8;
        } else if (y === yBot && vSpan >= 2) {
          dr -= 12;
          dg -= 13;
          db -= 10;
        }

        if (x === xLeft && hSpan >= 2) {
          dr += 8;
          dg += 7;
          db += 4;
        } else if (x === xRight && hSpan >= 2) {
          dr -= 7;
          dg -= 8;
          db -= 6;
        }

        // Delicate 2x2 ordered Bayer micro-texture on larger flat surfaces
        if (vSpan >= 3 && hSpan >= 3) {
          const dither = BAYER2[y & 1][x & 1];
          dr += dither;
          dg += dither;
          db += dither;
        }

        data[i] = clampByte(r + dr);
        data[i + 1] = clampByte(g + dg);
        data[i + 2] = clampByte(b + db);
      }
    }
  }
}

function similarPixel(a: Uint8ClampedArray, i: number, j: number): boolean {
  const a1 = a[i + 3];
  const a2 = a[j + 3];
  if (a1 < 32 && a2 < 32) return true;
  if ((a1 < 32) !== (a2 < 32)) return false;
  const dr = a[i] - a[j];
  const dg = a[i + 1] - a[j + 1];
  const db = a[i + 2] - a[j + 2];
  return dr * dr + dg * dg + db * db <= 1600;
}

function writeBlend(
  dst: Uint8ClampedArray,
  di: number,
  src: Uint8ClampedArray,
  i1: number,
  i2: number,
  pIdx: number,
  wContour: number,
) {
  const a1 = src[i1 + 3];
  const a2 = src[i2 + 3];
  if (a1 < 32 && a2 < 32) {
    dst[di] = 0;
    dst[di + 1] = 0;
    dst[di + 2] = 0;
    dst[di + 3] = 0;
    return;
  }
  const mr = (src[i1] + src[i2]) * 0.5;
  const mg = (src[i1 + 1] + src[i2 + 1]) * 0.5;
  const mb = (src[i1 + 2] + src[i2 + 2]) * 0.5;
  const ma = (a1 + a2) * 0.5;
  const pa = src[pIdx + 3];
  if (pa < 32) {
    dst[di] = clampByte(mr);
    dst[di + 1] = clampByte(mg);
    dst[di + 2] = clampByte(mb);
    dst[di + 3] = clampByte(ma);
    return;
  }
  const wP = 1 - wContour;
  dst[di] = clampByte(mr * wContour + src[pIdx] * wP);
  dst[di + 1] = clampByte(mg * wContour + src[pIdx + 1] * wP);
  dst[di + 2] = clampByte(mb * wContour + src[pIdx + 2] * wP);
  dst[di + 3] = clampByte(ma * wContour + pa * wP);
}

/**
 * Pass 2: Frame-Clamped Color-Aware EPX / Scale2x + Sub-Pixel Corner Anti-Aliasing
 * Executed twice (1x -> 2x -> 4x) for smooth 4x HD contours and diagonal edges.
 */
export function upscaleEPX2x(
  src: Uint8ClampedArray,
  w: number,
  h: number,
  frames: FrameRect[],
  wrapSeamless: boolean,
): Uint8ClampedArray {
  const outW = w * 2;
  const outH = h * 2;
  const dst = new Uint8ClampedArray(outW * outH * 4);

  for (const f of frames) {
    const fx = f.x;
    const fy = f.y;
    const fw = f.w;
    const fh = f.h;

    const getIdx = (x: number, y: number): number => {
      let cx = x;
      let cy = y;
      if (wrapSeamless) {
        cx = fx + (((x - fx) % fw) + fw) % fw;
        cy = fy + (((y - fy) % fh) + fh) % fh;
      } else {
        if (cx < fx) cx = fx;
        else if (cx >= fx + fw) cx = fx + fw - 1;
        if (cy < fy) cy = fy;
        else if (cy >= fy + fh) cy = fy + fh - 1;
      }
      return (cy * w + cx) * 4;
    };

    for (let y = fy; y < fy + fh; y++) {
      for (let x = fx; x < fx + fw; x++) {
        const P = getIdx(x, y);
        const T = getIdx(x, y - 1);
        const B = getIdx(x, y + 1);
        const L = getIdx(x - 1, y);
        const R = getIdx(x + 1, y);
        const TL = getIdx(x - 1, y - 1);
        const TR = getIdx(x + 1, y - 1);
        const BL = getIdx(x - 1, y + 1);
        const BR = getIdx(x + 1, y + 1);

        const ox = x * 2;
        const oy = y * 2;
        const d0 = (oy * outW + ox) * 4;
        const d1 = (oy * outW + ox + 1) * 4;
        const d2 = ((oy + 1) * outW + ox) * 4;
        const d3 = ((oy + 1) * outW + ox + 1) * 4;

        // Default all 4 subpixels to P
        for (const d of [d0, d1, d2, d3]) {
          dst[d] = src[P];
          dst[d + 1] = src[P + 1];
          dst[d + 2] = src[P + 2];
          dst[d + 3] = src[P + 3];
        }

        const simLT = similarPixel(src, L, T);
        const simTR = similarPixel(src, T, R);
        const simLB = similarPixel(src, L, B);
        const simBR = similarPixel(src, B, R);

        // Top-Left subpixel (d0)
        if (simLT && !simTR && !simLB) {
          writeBlend(dst, d0, src, L, T, P, 0.85);
        } else if (src[P + 3] > 200 && src[L + 3] > 200 && src[T + 3] > 200 && !similarPixel(src, P, TL)) {
          if (similarPixel(src, L, TL) && similarPixel(src, T, TL)) {
            writeBlend(dst, d0, src, L, T, P, 0.35);
          }
        }

        // Top-Right subpixel (d1)
        if (simTR && !simLT && !simBR) {
          writeBlend(dst, d1, src, R, T, P, 0.85);
        } else if (src[P + 3] > 200 && src[R + 3] > 200 && src[T + 3] > 200 && !similarPixel(src, P, TR)) {
          if (similarPixel(src, R, TR) && similarPixel(src, T, TR)) {
            writeBlend(dst, d1, src, R, T, P, 0.35);
          }
        }

        // Bottom-Left subpixel (d2)
        if (simLB && !simLT && !simBR) {
          writeBlend(dst, d2, src, L, B, P, 0.85);
        } else if (src[P + 3] > 200 && src[L + 3] > 200 && src[B + 3] > 200 && !similarPixel(src, P, BL)) {
          if (similarPixel(src, L, BL) && similarPixel(src, B, BL)) {
            writeBlend(dst, d2, src, L, B, P, 0.35);
          }
        }

        // Bottom-Right subpixel (d3)
        if (simBR && !simLB && !simTR) {
          writeBlend(dst, d3, src, R, B, P, 0.85);
        } else if (src[P + 3] > 200 && src[R + 3] > 200 && src[B + 3] > 200 && !similarPixel(src, P, BR)) {
          if (similarPixel(src, R, BR) && similarPixel(src, B, BR)) {
            writeBlend(dst, d3, src, R, B, P, 0.35);
          }
        }
      }
    }
  }
  return dst;
}

/** A canvas-backed texture we paint pixel by pixel, then slice into frames and upscale to 4x HD. */
export class PixelCanvas {
  readonly tex: Phaser.Textures.CanvasTexture;
  readonly ctx: CanvasRenderingContext2D;
  private readonly frames: FrameRect[] = [];

  constructor(
    readonly scene: Phaser.Scene,
    readonly key: string,
    readonly w: number,
    readonly h: number,
  ) {
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
    this.frames.push({ x, y, w, h });
    this.tex.add(name, 0, x, y, w, h);
  }

  done() {
    const activeFrames: FrameRect[] =
      this.frames.length > 0 ? this.frames : [{ x: 0, y: 0, w: this.w, h: this.h }];

    // Apply pro pixel-art shading (Sel-Out, directional sun rim lighting, ambient occlusion, lustre gradient)
    const imgData = this.ctx.getImageData(0, 0, this.w, this.h);
    if (this.key !== 'glow' && this.key !== 'tiles') {
      shadePixelArt(imgData.data, this.w, this.h, activeFrames);
      this.ctx.putImageData(imgData, 0, 0);
    }

    this.tex.refresh();

    // Upload 4x HD Super-Resolution EPX/Scale4x texture directly to WebGL while keeping 1x logical frame metrics
    const renderer = this.scene.game?.renderer as Phaser.Renderer.WebGL.WebGLRenderer | undefined;
    const gl = renderer?.gl;
    const glWrapper = this.tex.source[0]?.glTexture;
    if (gl && glWrapper?.webGLTexture && this.key !== 'glow') {
      const wrapSeamless = this.key === 'tiles';
      const pass1 = upscaleEPX2x(imgData.data, this.w, this.h, activeFrames, wrapSeamless);
      const frames2x = activeFrames.map((f) => ({ x: f.x * 2, y: f.y * 2, w: f.w * 2, h: f.h * 2 }));
      const pass2 = upscaleEPX2x(pass1, this.w * 2, this.h * 2, frames2x, wrapSeamless);

      const hdW = this.w * 4;
      const hdH = this.h * 4;
      gl.bindTexture(gl.TEXTURE_2D, glWrapper.webGLTexture);
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, hdW, hdH, 0, gl.RGBA, gl.UNSIGNED_BYTE, pass2);
      // Keep logical dimensions on the wrapper so Phaser's TilemapLayer & Sprite UVs stay 100% matched
      glWrapper.width = this.w;
      glWrapper.height = this.h;
    }

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

