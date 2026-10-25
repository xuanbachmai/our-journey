import { describe, expect, it } from 'vitest';
import { shadePixelArt, upscaleEPX2x } from './pixel';

describe('HD advanced pixel art pipeline', () => {
  it('applies selective outlining (Sel-Out) and directional sun relief to flat shapes', () => {
    const w = 6;
    const h = 6;
    const data = new Uint8ClampedArray(w * h * 4);
    const setPx = (x: number, y: number, r: number, g: number, b: number, a = 255) => {
      const i = (y * w + x) * 4;
      data[i] = r;
      data[i + 1] = g;
      data[i + 2] = b;
      data[i + 3] = a;
    };

    // Draw a 4x4 outlined box at (1..4, 1..4) with outline (74, 42, 63) and green interior (111, 217, 138)
    for (let y = 1; y <= 4; y++) {
      for (let x = 1; x <= 4; x++) {
        if (x === 1 || x === 4 || y === 1 || y === 4) {
          setPx(x, y, 74, 42, 63);
        } else {
          setPx(x, y, 111, 217, 138);
        }
      }
    }

    shadePixelArt(data, w, h, [{ x: 0, y: 0, w, h }]);

    // Top-left interior pixel (2, 2) should be brighter than bottom-right interior pixel (3, 3)
    const tl = (2 * w + 2) * 4;
    const br = (3 * w + 3) * 4;
    expect(data[tl] + data[tl + 1] + data[tl + 2]).toBeGreaterThan(data[br] + data[br + 1] + data[br + 2]);

    // Top outline pixel (2, 1) should be sun-lightened compared to bottom outline pixel (2, 4)
    const outTop = (1 * w + 2) * 4;
    const outBot = (4 * w + 2) * 4;
    expect(data[outTop + 1]).toBeGreaterThan(data[outBot + 1]);
  });

  it('upscales 1x pixel art to 4x HD via two-pass EPX/Scale2x and smooths diagonal steps without frame bleed', () => {
    const w = 4;
    const h = 4;
    const src = new Uint8ClampedArray(w * h * 4);
    const setPx = (x: number, y: number, r: number, g: number, b: number, a = 255) => {
      const i = (y * w + x) * 4;
      src[i] = r;
      src[i + 1] = g;
      src[i + 2] = b;
      src[i + 3] = a;
    };

    // Diagonal line at (1,0) and (0,1)
    setPx(1, 0, 240, 120, 80, 255);
    setPx(0, 1, 240, 120, 80, 255);

    const frames1x = [{ x: 0, y: 0, w: 2, h: 2 }, { x: 2, y: 0, w: 2, h: 2 }];
    const pass1 = upscaleEPX2x(src, w, h, frames1x, false);
    expect(pass1.length).toBe(w * 2 * h * 2 * 4);

    // At (1,1) in 1x (which is transparent), its top-left 2x subpixel (ox=2, oy=2) has L=(0,1) and T=(1,0) matching!
    const subTL = (2 * (w * 2) + 2) * 4;
    expect(pass1[subTL + 3]).toBeGreaterThan(200);

    // Second pass -> 4x HD (16x16)
    const frames2x = frames1x.map((f) => ({ x: f.x * 2, y: f.y * 2, w: f.w * 2, h: f.h * 2 }));
    const pass2 = upscaleEPX2x(pass1, w * 2, h * 2, frames2x, false);
    expect(pass2.length).toBe(w * 4 * h * 4 * 4);

    // Ensure second frame (x >= 8 in 4x space) stayed 100% transparent (zero cross-frame bleed)
    for (let y = 0; y < 8; y++) {
      for (let x = 8; x < 16; x++) {
        expect(pass2[(y * (w * 4) + x) * 4 + 3]).toBe(0);
      }
    }
  });
});
