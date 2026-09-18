import Phaser from 'phaser';
import { CROPS, CROP_IDS, FISH, FISH_IDS, FURNITURE_IDS, RECIPE_IDS, RECIPES, type CropId } from '@hh/shared';
import { P } from './palette';
import { PixelCanvas, mulberry32 } from './pixel';

export const TREE_W = 32;
export const TREE_H = 40;

// ------------------------------------------------------------------ helpers

function tree(pc: PixelCanvas, x0: number, y0: number, leaf: string, light: string, dark: string, rnd: () => number, scale = 1) {
  const s = scale;
  pc.rect(x0 + 12, y0 + 27, 8, 12, P.outline);
  pc.rect(x0 + 13, y0 + 27, 6, 11, P.trunk);
  pc.rect(x0 + 13, y0 + 27, 2, 11, P.trunkDark);
  pc.disc(x0 + 16, y0 + 17, Math.round(12 * s), P.outline);
  pc.disc(x0 + 9, y0 + 20, Math.round(8 * s), P.outline);
  pc.disc(x0 + 23, y0 + 20, Math.round(8 * s), P.outline);
  pc.disc(x0 + 16, y0 + 10, Math.round(9 * s), P.outline);
  pc.disc(x0 + 16, y0 + 17, Math.round(11 * s), dark);
  pc.disc(x0 + 9, y0 + 20, Math.round(7 * s), dark);
  pc.disc(x0 + 23, y0 + 20, Math.round(7 * s), dark);
  pc.disc(x0 + 16, y0 + 10, Math.round(8 * s), dark);
  pc.disc(x0 + 15, y0 + 15, Math.round(9 * s), leaf);
  pc.disc(x0 + 9, y0 + 19, Math.round(5 * s), leaf);
  pc.disc(x0 + 22, y0 + 18, Math.round(5 * s), leaf);
  pc.disc(x0 + 15, y0 + 9, Math.round(6 * s), leaf);
  pc.disc(x0 + 13, y0 + 12, Math.round(4 * s), light);
  pc.disc(x0 + 21, y0 + 15, 2, light);
  pc.disc(x0 + 9, y0 + 18, 2, light);
  for (let i = 0; i < 7; i++) pc.px(x0 + 6 + Math.floor(rnd() * 20), y0 + 6 + Math.floor(rnd() * 18), light);
}

/** A generic pitched-roof building facade of w x h with a door in the middle. */
function facade(pc: PixelCanvas, x0: number, y0: number, w: number, h: number, wall: string, wallDark: string, roof: string, roofDark: string, opts: { sign?: string; windows?: number; awning?: string; chimney?: boolean } = {}) {
  const roofH = Math.round(h * 0.38);
  pc.rect(x0 + 4, y0 + roofH, w - 8, h - roofH, P.outline);
  pc.rect(x0 + 5, y0 + roofH + 1, w - 10, h - roofH - 2, wall);
  pc.rect(x0 + 5, y0 + h - 6, w - 10, 5, wallDark);
  for (let y = 0; y < roofH; y++) {
    const inset = Math.max(0, Math.round((roofH - y) * 0.5));
    pc.rect(x0 + inset, y0 + y, w - inset * 2, 1, P.outline);
    if (y > 1) pc.rect(x0 + inset + 2, y0 + y, w - inset * 2 - 4, 1, y % 6 < 3 ? roof : roofDark);
  }
  pc.rect(x0, y0 + roofH - 3, w, 5, P.outline);
  pc.rect(x0 + 2, y0 + roofH - 2, w - 4, 3, roof);
  if (opts.chimney) {
    pc.rect(x0 + w - 18, y0 + 3, 10, 14, P.outline);
    pc.rect(x0 + w - 17, y0 + 4, 8, 12, P.woodDark);
  }
  // door
  const dw = 16;
  const dx = x0 + Math.round(w / 2 - dw / 2);
  pc.rect(dx, y0 + h - 26, dw, 26, P.outline);
  pc.rect(dx + 1, y0 + h - 25, dw - 2, 24, P.wood);
  pc.disc(dx + dw / 2, y0 + h - 24, 7, P.outline);
  pc.disc(dx + dw / 2, y0 + h - 24, 6, P.wood);
  pc.rect(dx + dw - 5, y0 + h - 14, 2, 2, P.coin);
  // windows
  const n = opts.windows ?? 2;
  for (let i = 0; i < n; i++) {
    const wx = x0 + 10 + Math.round((i * (w - 20 - 14)) / Math.max(1, n - 1));
    if (Math.abs(wx + 7 - (dx + dw / 2)) < 16) continue;
    pc.rect(wx, y0 + roofH + 8, 14, 14, P.outline);
    pc.rect(wx + 1, y0 + roofH + 9, 12, 12, P.window);
    pc.rect(wx + 6, y0 + roofH + 9, 2, 12, P.white);
    pc.rect(wx + 1, y0 + roofH + 14, 12, 2, P.white);
    pc.rect(wx + 2, y0 + roofH + 10, 4, 2, P.white);
  }
  if (opts.awning) {
    const ax = dx - 10;
    const aw = dw + 20;
    pc.rect(ax, y0 + h - 32, aw, 6, P.outline);
    for (let x = 1; x < aw - 1; x++) pc.rect(ax + x, y0 + h - 31, 1, 4, Math.floor(x / 4) % 2 ? P.awningWhite : opts.awning);
    for (let x = 0; x < aw; x += 4) pc.rect(ax + x + 1, y0 + h - 26, 2, 1, Math.floor(x / 4) % 2 ? P.awningWhite : opts.awning);
  }
  if (opts.sign) {
    const sw = Math.min(w - 12, opts.sign.length * 6 + 8);
    const sx = x0 + Math.round(w / 2 - sw / 2);
    pc.rect(sx, y0 + roofH + 3, sw, 9, P.outline);
    pc.rect(sx + 1, y0 + roofH + 4, sw - 2, 7, P.cream);
    // tiny pictogram letters: draw as coloured dots so any font-free sign reads as a sign
    for (let i = 0; i < opts.sign.length; i++) pc.rect(sx + 4 + i * 6, y0 + roofH + 6, 4, 3, [P.red, P.blue, P.leaf, P.orange, P.purple][i % 5]);
  }
}

function house(pc: PixelCanvas) {
  pc.rect(8, 44, 96, 60, P.outline);
  pc.rect(9, 45, 94, 58, P.wall);
  pc.rect(9, 96, 94, 7, P.wallDark);
  for (let y = 0; y < 44; y++) {
    const inset = Math.max(0, 22 - y);
    pc.rect(inset, y, 112 - inset * 2, 1, P.outline);
    if (y > 1) pc.rect(inset + 2, y, 112 - inset * 2 - 4, 1, y % 6 < 3 ? P.roof : P.roofDark);
  }
  pc.rect(0, 40, 112, 6, P.outline);
  pc.rect(2, 41, 108, 4, P.roofLight);
  pc.rect(84, 4, 12, 20, P.outline);
  pc.rect(85, 5, 10, 18, P.woodDark);
  pc.rect(85, 5, 10, 3, P.wood);
  pc.rect(48, 68, 18, 36, P.outline);
  pc.rect(49, 69, 16, 34, P.wood);
  pc.rect(49, 69, 16, 2, P.woodLight);
  pc.disc(57, 70, 9, P.outline);
  pc.disc(57, 70, 8, P.wood);
  pc.rect(61, 86, 2, 2, P.coin);
  for (const wx of [18, 82]) {
    pc.rect(wx, 60, 18, 18, P.outline);
    pc.rect(wx + 1, 61, 16, 16, P.window);
    pc.rect(wx + 8, 61, 2, 16, P.white);
    pc.rect(wx + 1, 68, 16, 2, P.white);
    pc.rect(wx + 2, 62, 5, 3, P.white);
    pc.rect(wx - 2, 78, 22, 6, P.outline);
    pc.rect(wx - 1, 79, 20, 4, P.wood);
    for (let i = 0; i < 5; i++) {
      const c = [P.pink, P.yellow, P.red, P.purple, P.white][i];
      pc.px(wx + 1 + i * 4, 77, c);
      pc.px(wx + 1 + i * 4, 76, c);
      pc.px(wx + 2 + i * 4, 77, P.leaf);
    }
  }
  pc.rows(52, 50, ['.oo.oo.', 'orroro.', 'orrrrro', '.orrro.', '..oro..', '...o...'], { o: P.outline, r: P.red });
  pc.px(54, 51, P.pink);
}

function stall(pc: PixelCanvas) {
  pc.rect(4, 12, 4, 30, P.outline);
  pc.rect(5, 12, 2, 30, P.wood);
  pc.rect(40, 12, 4, 30, P.outline);
  pc.rect(41, 12, 2, 30, P.wood);
  pc.rect(0, 26, 48, 18, P.outline);
  pc.rect(1, 27, 46, 16, P.wood);
  pc.rect(1, 27, 46, 3, P.woodLight);
  pc.rect(1, 40, 46, 2, P.woodDark);
  [P.red, P.orange, P.yellow, P.pink].forEach((c, i) => {
    pc.disc(10 + i * 9, 25, 3, P.outline);
    pc.disc(10 + i * 9, 25, 2, c);
  });
  pc.rect(0, 2, 48, 12, P.outline);
  for (let x = 1; x < 47; x++) pc.rect(x, 3, 1, 10, Math.floor((x - 1) / 6) % 2 === 0 ? P.awningRed : P.awningWhite);
  for (let x = 0; x < 48; x += 6) {
    pc.rect(x + 1, 13, 4, 2, Math.floor(x / 6) % 2 === 0 ? P.awningRed : P.awningWhite);
    pc.rect(x, 15, 6, 1, P.outline);
  }
  pc.rect(16, 0, 16, 6, P.outline);
  pc.rect(17, 1, 14, 4, P.cream);
  pc.rect(19, 2, 2, 2, P.red);
  pc.rect(23, 2, 2, 2, P.orange);
  pc.rect(27, 2, 2, 2, P.pink);
}

function kitchen(pc: PixelCanvas) {
  pc.rect(0, 16, 48, 24, P.outline);
  pc.rect(1, 17, 46, 22, P.wood);
  pc.rect(1, 17, 46, 3, P.woodLight);
  pc.rect(1, 36, 46, 2, P.woodDark);
  pc.rect(24, 12, 22, 8, P.outline);
  pc.rect(25, 13, 20, 6, '#8d8fa3');
  pc.disc(30, 16, 2, P.outline);
  pc.disc(30, 16, 1, P.red);
  pc.disc(39, 16, 2, P.outline);
  pc.disc(39, 16, 1, P.red);
  pc.rect(25, 4, 12, 9, P.outline);
  pc.rect(26, 5, 10, 7, '#6a6f8a');
  pc.rect(26, 5, 10, 2, '#9a9fbd');
  pc.rect(23, 6, 2, 2, P.outline);
  pc.rect(37, 6, 2, 2, P.outline);
  pc.px(29, 2, P.white);
  pc.px(31, 0, P.white);
  pc.px(33, 2, P.white);
  pc.rect(4, 12, 16, 6, P.outline);
  pc.rect(5, 13, 14, 4, P.woodLight);
  pc.disc(10, 12, 2, P.outline);
  pc.disc(10, 12, 1, P.red);
  pc.rect(14, 10, 4, 1, '#c9c9d9');
  pc.rect(17, 9, 2, 1, P.outline);
  pc.rect(2, 0, 2, 16, P.outline);
  pc.rect(44, 0, 2, 12, P.outline);
  pc.rect(2, 0, 44, 2, P.outline);
  pc.rect(3, 1, 42, 1, P.woodDark);
  pc.rect(8, 2, 1, 3, P.outline);
  pc.disc(8, 8, 3, P.outline);
  pc.disc(8, 8, 2, '#8d8fa3');
  pc.rect(9, 5, 1, 3, P.outline);
  pc.rect(6, 24, 10, 10, P.outlineSoft);
  pc.rect(32, 24, 10, 10, P.outlineSoft);
  pc.px(14, 29, P.coin);
  pc.px(33, 29, P.coin);
}

function counter(pc: PixelCanvas) {
  pc.rect(0, 0, 32, 6, P.outline);
  for (let x = 1; x < 31; x++) pc.rect(x, 1, 1, 4, Math.floor((x - 1) / 5) % 2 === 0 ? P.mint : P.awningWhite);
  pc.rect(2, 6, 2, 8, P.outline);
  pc.rect(28, 6, 2, 8, P.outline);
  pc.rect(0, 13, 32, 13, P.outline);
  pc.rect(1, 14, 30, 11, P.wood);
  pc.rect(1, 14, 30, 2, P.woodLight);
  pc.rect(1, 23, 30, 1, P.woodDark);
  pc.rect(11, 7, 10, 6, P.outline);
  pc.rect(12, 8, 8, 4, P.cream);
  pc.rect(13, 9, 2, 2, P.red);
  pc.rect(16, 9, 3, 2, P.leaf);
}

function coop(pc: PixelCanvas) {
  pc.rect(4, 16, 40, 24, P.outline);
  pc.rect(5, 17, 38, 22, '#e8635a');
  pc.rect(5, 17, 38, 2, '#ff8a80');
  for (let y = 0; y < 16; y++) {
    const inset = Math.max(0, 8 - y / 2);
    pc.rect(inset, y + 2, 48 - inset * 2, 1, P.outline);
    if (y > 1) pc.rect(inset + 2, y + 2, 48 - inset * 2 - 4, 1, y % 4 < 2 ? P.woodDark : P.wood);
  }
  pc.rect(0, 16, 48, 2, P.outline);
  pc.rect(19, 24, 10, 16, P.outline);
  pc.rect(20, 25, 8, 14, P.woodDark);
  pc.rect(20, 25, 8, 1, P.wood);
  pc.disc(12, 26, 5, P.outline);
  pc.disc(12, 26, 4, P.window);
  pc.disc(12, 27, 2, P.white);
  pc.px(13, 26, P.orange);
  pc.rect(32, 28, 10, 8, P.outline);
  pc.rect(33, 29, 8, 6, P.woodLight);
  pc.disc(36, 31, 1, P.white);
  pc.disc(39, 31, 1, P.white);
}

function barn(pc: PixelCanvas) {
  // big red barn 72x64
  pc.rect(6, 26, 60, 38, P.outline);
  pc.rect(7, 27, 58, 36, '#d9534f');
  pc.rect(7, 58, 58, 5, '#b03a36');
  for (let y = 0; y < 26; y++) {
    const inset = Math.max(0, Math.round((26 - y) * 0.45));
    pc.rect(inset, y, 72 - inset * 2, 1, P.outline);
    if (y > 1) pc.rect(inset + 2, y, 72 - inset * 2 - 4, 1, y % 5 < 3 ? '#8a5a33' : '#6e4426');
  }
  pc.rect(0, 24, 72, 4, P.outline);
  pc.rect(2, 25, 68, 2, '#a86a3c');
  // big doors with X braces
  pc.rect(24, 36, 24, 28, P.outline);
  pc.rect(25, 37, 22, 26, '#b8763f');
  pc.rect(36, 37, 1, 26, P.outline);
  for (let i = 0; i < 10; i++) {
    pc.px(26 + i, 38 + i * 2, P.woodDark);
    pc.px(46 - i, 38 + i * 2, P.woodDark);
  }
  // hay window
  pc.rect(30, 8, 12, 12, P.outline);
  pc.rect(31, 9, 10, 10, P.woodDark);
  pc.rect(32, 12, 8, 6, P.yellow);
  // white trim windows
  for (const wx of [10, 52]) {
    pc.rect(wx, 36, 10, 10, P.white);
    pc.rect(wx + 1, 37, 8, 8, P.window);
    pc.rect(wx + 4, 37, 2, 8, P.white);
  }
}

function furnitureSheet(pc: PixelCanvas) {
  let x = 0;
  const frame = (name: string, w: number, h: number, draw: (x0: number) => void) => {
    draw(x);
    pc.frame(name, x, 0, w, h);
    x += w + 2;
  };
  frame('bed', 32, 32, (x0) => {
    pc.rect(x0, 6, 32, 26, P.outline);
    pc.rect(x0 + 1, 7, 30, 24, P.woodDark);
    pc.rect(x0 + 2, 12, 28, 18, '#ff8fcf');
    pc.rect(x0 + 2, 12, 28, 3, '#ffb3d9');
    pc.rect(x0 + 2, 24, 28, 2, '#e05fa8');
    pc.rect(x0 + 4, 8, 10, 6, P.outline);
    pc.rect(x0 + 5, 9, 8, 4, P.white);
    pc.rect(x0 + 18, 8, 10, 6, P.outline);
    pc.rect(x0 + 19, 9, 8, 4, P.white);
    pc.rows(x0 + 12, 16, ['.oo.oo.', 'orroro.', 'orrrrro', '.orrro.', '..oro..'], { o: P.outline, r: P.red });
  });
  frame('table', 32, 18, (x0) => {
    pc.rect(x0, 2, 32, 8, P.outline);
    pc.rect(x0 + 1, 3, 30, 6, P.woodLight);
    pc.rect(x0 + 1, 8, 30, 1, P.woodDark);
    pc.rect(x0 + 3, 10, 3, 8, P.outline);
    pc.rect(x0 + 26, 10, 3, 8, P.outline);
    pc.rect(x0 + 4, 10, 1, 7, P.wood);
    pc.rect(x0 + 27, 10, 1, 7, P.wood);
    pc.disc(x0 + 16, 5, 2, P.pink);
  });
  frame('chair', 16, 18, (x0) => {
    pc.rect(x0 + 3, 0, 10, 10, P.outline);
    pc.rect(x0 + 4, 1, 8, 8, P.wood);
    pc.rect(x0 + 2, 9, 12, 5, P.outline);
    pc.rect(x0 + 3, 10, 10, 3, P.mint);
    pc.rect(x0 + 3, 14, 2, 4, P.outline);
    pc.rect(x0 + 11, 14, 2, 4, P.outline);
  });
  frame('rug', 48, 32, (x0) => {
    pc.disc(x0 + 24, 16, 15, P.outline);
    pc.disc(x0 + 24, 16, 14, '#ff8fa3');
    pc.disc(x0 + 24, 16, 10, '#ffd23f');
    pc.disc(x0 + 24, 16, 6, '#7de8c8');
    pc.disc(x0 + 24, 16, 2, P.white);
  });
  frame('plant', 16, 22, (x0) => {
    pc.rect(x0 + 4, 14, 8, 8, P.outline);
    pc.rect(x0 + 5, 15, 6, 6, '#c9764a');
    pc.disc(x0 + 8, 8, 6, P.outline);
    pc.disc(x0 + 8, 8, 5, P.leaf);
    pc.disc(x0 + 5, 6, 2, P.leafLight);
    pc.px(x0 + 10, 4, P.pink);
  });
  frame('bookshelf', 16, 28, (x0) => {
    pc.rect(x0, 0, 16, 28, P.outline);
    pc.rect(x0 + 1, 1, 14, 26, P.woodDark);
    for (let s = 0; s < 3; s++) {
      pc.rect(x0 + 1, 2 + s * 8, 14, 7, P.wood);
      [P.red, P.blue, P.leaf, P.yellow, P.purple].forEach((c, i) => pc.rect(x0 + 2 + i * 2.6, 3 + s * 8, 2, 5, c));
      pc.rect(x0 + 1, 8 + s * 8, 14, 1, P.outline);
    }
  });
  frame('lamp', 12, 22, (x0) => {
    pc.rect(x0 + 2, 0, 8, 8, P.outline);
    pc.rect(x0 + 3, 1, 6, 6, P.yellow);
    pc.rect(x0 + 3, 1, 6, 2, '#fff4b0');
    pc.rect(x0 + 5, 8, 2, 10, P.outline);
    pc.rect(x0 + 2, 18, 8, 4, P.outline);
    pc.rect(x0 + 3, 19, 6, 2, P.woodDark);
  });
  frame('painting', 16, 14, (x0) => {
    pc.rect(x0, 0, 16, 14, P.outline);
    pc.rect(x0 + 1, 1, 14, 12, P.coin);
    pc.rect(x0 + 2, 2, 12, 10, P.water);
    pc.rect(x0 + 2, 8, 12, 4, P.grass);
    pc.disc(x0 + 10, 5, 2, P.yellow);
    pc.rect(x0 + 5, 6, 3, 4, P.leafDark);
  });
  frame('fireplace', 32, 30, (x0) => {
    pc.rect(x0, 0, 32, 30, P.outline);
    pc.rect(x0 + 1, 1, 30, 28, '#8d8fa3');
    pc.rect(x0 + 1, 1, 30, 4, '#c9c9d9');
    pc.rect(x0 + 6, 8, 20, 20, P.outline);
    pc.rect(x0 + 7, 9, 18, 18, '#3b2a3a');
    pc.rows(x0 + 10, 12, ['....rr......', '...rrrr.....', '..rryyrr....', '..ryyyyr....', '.rryyyyrr...', '.ryywwyyr...', '.ryywwyyr...', '..ryyyyr....', '...rrrr.....', '....rr......'], { r: P.red, y: P.yellow, w: P.white });
    pc.rect(x0 + 9, 24, 14, 3, P.woodDark);
  });
  frame('piano', 32, 26, (x0) => {
    pc.rect(x0, 0, 32, 26, P.outline);
    pc.rect(x0 + 1, 1, 30, 24, '#2e2e3a');
    pc.rect(x0 + 1, 1, 30, 2, '#5a5a6a');
    pc.rect(x0 + 3, 14, 26, 6, P.white);
    for (let i = 0; i < 9; i++) pc.rect(x0 + 5 + i * 3, 14, 1, 4, P.outline);
    pc.px(x0 + 6, 6, P.white);
  });
  frame('aquarium', 32, 22, (x0) => {
    pc.rect(x0, 0, 32, 22, P.outline);
    pc.rect(x0 + 1, 1, 30, 20, P.water);
    pc.rect(x0 + 1, 1, 30, 3, P.waterLight);
    pc.rect(x0 + 1, 18, 30, 3, P.sand);
    pc.rows(x0 + 6, 8, ['..oooo...o', '.owwwwo.oo', 'owwewwwooo', '.owwwwo.oo', '..oooo...o'], { o: P.outline, w: P.orange, e: P.eye });
    pc.rows(x0 + 18, 10, ['..oooo...o', '.owwwwo.oo', 'owwewwwooo', '.owwwwo.oo', '..oooo...o'], { o: P.outline, w: P.yellow, e: P.eye });
    pc.rect(x0 + 4, 12, 2, 6, P.leaf);
    pc.rect(x0 + 26, 13, 2, 5, P.leaf);
  });
  frame('sofa', 32, 18, (x0) => {
    pc.rect(x0, 2, 32, 14, P.outline);
    pc.rect(x0 + 1, 3, 30, 12, '#6fb8ff');
    pc.rect(x0 + 3, 8, 26, 6, '#8fcaff');
    pc.rect(x0 + 1, 3, 4, 12, '#4f9fe0');
    pc.rect(x0 + 27, 3, 4, 12, '#4f9fe0');
    pc.rect(x0 + 3, 16, 2, 2, P.outline);
    pc.rect(x0 + 27, 16, 2, 2, P.outline);
    pc.rect(x0 + 12, 4, 8, 4, P.pink);
  });
  frame('teddy', 16, 18, (x0) => {
    pc.disc(x0 + 8, 11, 6, P.outline);
    pc.disc(x0 + 8, 11, 5, '#c98b4e');
    pc.disc(x0 + 8, 5, 4, P.outline);
    pc.disc(x0 + 8, 5, 3, '#c98b4e');
    pc.disc(x0 + 5, 2, 2, P.outline);
    pc.disc(x0 + 11, 2, 2, P.outline);
    pc.disc(x0 + 5, 2, 1, '#e2ad70');
    pc.disc(x0 + 11, 2, 1, '#e2ad70');
    pc.px(x0 + 7, 5, P.eye);
    pc.px(x0 + 9, 5, P.eye);
    pc.px(x0 + 8, 6, P.red);
    pc.rect(x0 + 6, 9, 4, 3, '#e2ad70');
  });
  frame('photo', 16, 14, (x0) => {
    pc.rect(x0, 0, 16, 14, P.outline);
    pc.rect(x0 + 1, 1, 14, 12, P.white);
    pc.rect(x0 + 2, 2, 12, 10, '#7ecbff');
    pc.rect(x0 + 2, 8, 12, 4, P.grass);
    pc.rect(x0 + 4, 4, 3, 6, '#5ab0ff');
    pc.rect(x0 + 9, 4, 3, 6, '#a56cff');
    pc.px(x0 + 7, 3, P.red);
    pc.px(x0 + 8, 3, P.red);
  });
  frame('wardrobe', 24, 32, (x0) => {
    pc.rect(x0, 0, 24, 32, P.outline);
    pc.rect(x0 + 1, 1, 22, 30, P.wood);
    pc.rect(x0 + 1, 1, 22, 2, P.woodLight);
    pc.rect(x0 + 12, 2, 1, 28, P.outline);
    pc.rect(x0 + 9, 14, 2, 3, P.coin);
    pc.rect(x0 + 13, 14, 2, 3, P.coin);
    pc.rect(x0 + 3, 4, 7, 6, P.woodDark);
    pc.rect(x0 + 14, 4, 7, 6, P.woodDark);
  });
  frame('rtable', 24, 20, (x0) => {
    pc.disc(x0 + 12, 7, 11, P.outline);
    pc.disc(x0 + 12, 7, 10, P.white);
    pc.disc(x0 + 12, 7, 8, '#ffe8f0');
    pc.rect(x0 + 10, 14, 4, 6, P.outline);
    pc.rect(x0 + 11, 14, 2, 5, P.woodDark);
    pc.rect(x0 + 6, 19, 12, 1, P.outline);
    pc.disc(x0 + 12, 6, 2, P.pink);
  });
  frame('rchair', 12, 14, (x0) => {
    pc.rect(x0 + 2, 0, 8, 8, P.outline);
    pc.rect(x0 + 3, 1, 6, 6, P.mint);
    pc.rect(x0 + 1, 7, 10, 4, P.outline);
    pc.rect(x0 + 2, 8, 8, 2, P.wood);
    pc.rect(x0 + 2, 11, 2, 3, P.outline);
    pc.rect(x0 + 8, 11, 2, 3, P.outline);
  });
  frame('shopcounter', 48, 24, (x0) => {
    pc.rect(x0, 0, 48, 24, P.outline);
    pc.rect(x0 + 1, 1, 46, 22, P.wood);
    pc.rect(x0 + 1, 1, 46, 4, P.woodLight);
    pc.rect(x0 + 1, 20, 46, 3, P.woodDark);
    pc.rect(x0 + 6, 8, 10, 8, P.outlineSoft);
    pc.rect(x0 + 32, 8, 10, 8, P.outlineSoft);
    pc.rect(x0 + 20, 2, 8, 3, P.coin);
  });
  frame('mannequin', 16, 28, (x0) => {
    pc.rect(x0 + 7, 20, 2, 6, P.outline);
    pc.rect(x0 + 4, 26, 8, 2, P.outline);
    pc.rect(x0 + 4, 6, 8, 14, P.outline);
    pc.rect(x0 + 5, 7, 6, 12, '#ff8fcf');
    pc.rect(x0 + 5, 7, 6, 3, P.white);
    pc.disc(x0 + 8, 3, 3, P.outline);
    pc.disc(x0 + 8, 3, 2, P.cream);
  });
  frame('petpen', 32, 20, (x0) => {
    pc.rect(x0, 8, 32, 12, P.outline);
    pc.rect(x0 + 1, 9, 30, 10, P.sand);
    for (let i = 0; i < 32; i += 4) pc.rect(x0 + i, 4, 2, 6, P.outline);
    pc.rect(x0, 6, 32, 1, P.woodDark);
    pc.rect(x0, 9, 32, 1, P.woodDark);
  });
  frame('kitchenwall', 48, 24, (x0) => {
    pc.rect(x0, 0, 48, 24, P.outline);
    pc.rect(x0 + 1, 1, 46, 22, '#c9c9d9');
    pc.rect(x0 + 1, 1, 46, 3, '#e6e6f2');
    pc.rect(x0 + 6, 6, 12, 8, P.outline);
    pc.rect(x0 + 7, 7, 10, 6, '#8d8fa3');
    pc.disc(x0 + 10, 10, 1, P.red);
    pc.disc(x0 + 14, 10, 1, P.red);
    pc.rect(x0 + 24, 6, 18, 8, P.outline);
    pc.rect(x0 + 25, 7, 16, 6, P.water);
    pc.rect(x0 + 32, 3, 2, 4, '#8d8fa3');
  });
  frame('lovetree0', 40, 48, (x0) => {
    pc.rect(x0 + 19, 36, 3, 12, P.outline);
    pc.rect(x0 + 20, 37, 1, 10, P.trunk);
    pc.disc(x0 + 20, 34, 4, P.outline);
    pc.disc(x0 + 20, 34, 3, P.leafLight);
    pc.px(x0 + 19, 33, P.pink);
  });
  for (let s = 1; s < 8; s++) {
    frame(`lovetree${s}`, 40, 48, (x0) => {
      const size = 0.45 + s * 0.08;
      const pink = s >= 3;
      tree(pc, x0 + 4, 8, pink ? P.blossom : P.leaf, pink ? P.blossomLight : P.leafLight, pink ? P.blossomDark : P.leafDark, mulberry32(s), size);
      if (s >= 5) for (let i = 0; i < s; i++) pc.rows(x0 + 6 + ((i * 7) % 26), 12 + ((i * 11) % 18), ['.o.', 'ooo', '.o.'], { o: P.red });
      if (s === 7) pc.rows(x0 + 16, 2, ['.oo.oo.', 'orroro.', 'orrrrro', '.orrro.', '..oro..'], { o: P.outline, r: P.red });
    });
  }

  // ---- Cozy Corner pieces ----
  frame('armchair', 16, 18, (x0) => {
    pc.rect(x0 + 1, 1, 14, 15, P.outline);
    pc.rect(x0 + 2, 2, 12, 13, '#ff9a8a');
    pc.rect(x0 + 2, 2, 12, 2, '#ffc0b5');
    pc.rect(x0 + 2, 7, 3, 8, '#e0706a');
    pc.rect(x0 + 11, 7, 3, 8, '#e0706a');
    pc.rect(x0 + 5, 9, 6, 4, '#ffb8aa');
    pc.rect(x0 + 2, 16, 2, 2, P.outline);
    pc.rect(x0 + 12, 16, 2, 2, P.outline);
  });
  frame('beanbag', 16, 16, (x0) => {
    pc.disc(x0 + 8, 9, 7, P.outline);
    pc.disc(x0 + 8, 9, 6, '#7de8c8');
    pc.disc(x0 + 8, 11, 4, '#5fcfad');
    pc.disc(x0 + 5, 6, 2, '#b3f5e2');
  });
  frame('vase', 12, 18, (x0) => {
    pc.rect(x0 + 5, 5, 1, 6, P.leafDark);
    pc.rect(x0 + 7, 4, 1, 7, P.leafDark);
    pc.px(x0 + 4, 8, P.leaf);
    pc.px(x0 + 8, 7, P.leaf);
    pc.disc(x0 + 3, 4, 2, P.pink);
    pc.disc(x0 + 8, 3, 2, P.yellow);
    pc.disc(x0 + 6, 2, 1, P.red);
    pc.px(x0 + 3, 4, P.white);
    pc.rect(x0 + 3, 10, 6, 8, P.outline);
    pc.rect(x0 + 4, 11, 4, 6, P.blue);
    pc.px(x0 + 4, 12, P.white);
  });
  frame('cactus', 12, 16, (x0) => {
    pc.rect(x0 + 4, 2, 4, 9, P.outline);
    pc.rect(x0 + 5, 3, 2, 7, P.leaf);
    pc.rect(x0 + 2, 5, 3, 2, P.outline);
    pc.px(x0 + 3, 4, P.outline);
    pc.px(x0 + 3, 5, P.leaf);
    pc.px(x0 + 6, 1, P.pink);
    pc.rect(x0 + 2, 10, 8, 6, P.outline);
    pc.rect(x0 + 3, 11, 6, 4, '#c9764a');
  });
  frame('clock', 14, 14, (x0) => {
    pc.disc(x0 + 7, 7, 6, P.outline);
    pc.disc(x0 + 7, 7, 5, P.cream);
    pc.rect(x0 + 7, 3, 1, 4, P.outline);
    pc.rect(x0 + 7, 7, 3, 1, P.outline);
    pc.px(x0 + 7, 7, P.red);
    for (const [dx, dy] of [[0, -4], [4, 0], [0, 4], [-4, 0]]) pc.px(x0 + 7 + dx, 7 + dy, P.woodDark);
  });
  frame('lights', 32, 10, (x0) => {
    const colors = [P.pink, P.yellow, P.mint, P.blue, P.purple, P.red];
    for (let x = 0; x < 32; x++) pc.px(x0 + x, 2 + Math.round(Math.sin(x / 5) * 1.5), P.outline);
    for (let i = 0; i < 7; i++) {
      const x = 2 + i * 5;
      const y = 5 + Math.round(Math.sin(x / 5) * 1.5);
      pc.disc(x0 + x, y, 2, P.outline);
      pc.disc(x0 + x, y, 1, colors[i % colors.length]);
    }
  });
  frame('tv', 32, 24, (x0) => {
    pc.rect(x0 + 2, 0, 28, 20, P.outline);
    pc.rect(x0 + 3, 1, 26, 18, '#b08a50');
    pc.rect(x0 + 5, 3, 18, 14, P.outline);
    pc.rect(x0 + 6, 4, 16, 12, '#7ecbff');
    pc.rect(x0 + 6, 12, 16, 4, P.grass);
    pc.disc(x0 + 17, 7, 2, P.yellow);
    pc.px(x0 + 7, 5, P.white);
    pc.disc(x0 + 26, 6, 1, P.outline);
    pc.disc(x0 + 26, 11, 1, P.outline);
    pc.rect(x0 + 5, 20, 2, 4, P.outline);
    pc.rect(x0 + 25, 20, 2, 4, P.outline);
    pc.rect(x0 + 14, -0, 1, 1, P.outline);
  });
  frame('records', 16, 22, (x0) => {
    pc.px(x0 + 12, 0, P.pink);
    pc.px(x0 + 13, 1, P.pink);
    pc.rect(x0 + 1, 5, 14, 6, P.outline);
    pc.rect(x0 + 2, 6, 12, 4, '#8a5a33');
    pc.disc(x0 + 7, 8, 2, '#2e2e3a');
    pc.px(x0 + 7, 8, P.red);
    pc.rect(x0 + 11, 6, 1, 3, '#c9c9d9');
    pc.rect(x0 + 1, 10, 14, 12, P.outline);
    pc.rect(x0 + 2, 11, 12, 10, P.wood);
    pc.rect(x0 + 3, 12, 4, 8, '#ff8fcf');
    pc.rect(x0 + 8, 12, 4, 8, P.blue);
  });
  frame('petbed', 16, 10, (x0) => {
    pc.rect(x0 + 1, 1, 14, 9, P.outline);
    pc.rect(x0 + 2, 2, 12, 7, '#ff8fcf');
    pc.rect(x0 + 4, 3, 8, 5, '#ffd2ea');
    pc.rows(x0 + 6, 4, ['o..o', 'oooo'], { o: P.white });
  });
  frame('heartrug', 48, 32, (x0) => {
    const inside = (px: number, py: number, k: number) => {
      const nx = (px - 23.5) / (17 * k);
      const ny = ((15 - py) / (14 * k)) * 1.1;
      const a = nx * nx + ny * ny - 1;
      return a * a * a - nx * nx * ny * ny * ny <= 0;
    };
    for (let y = 0; y < 32; y++)
      for (let x = 0; x < 48; x++) {
        if (!inside(x, y, 1)) continue;
        const edge = !inside(x - 1, y, 1) || !inside(x + 1, y, 1) || !inside(x, y - 1, 1) || !inside(x, y + 1, 1);
        pc.px(x0 + x, y, edge ? P.outline : inside(x, y, 0.7) ? (inside(x, y, 0.4) ? P.white : '#ffb3d9') : '#ff8fa3');
      }
  });
  frame('dresser', 32, 24, (x0) => {
    pc.rect(x0 + 20, 0, 8, 6, P.outline);
    pc.rect(x0 + 21, 1, 6, 4, P.window);
    pc.px(x0 + 22, 2, P.white);
    pc.rect(x0 + 4, 3, 4, 3, P.pink);
    pc.rect(x0, 6, 32, 18, P.outline);
    pc.rect(x0 + 1, 7, 30, 16, P.woodLight);
    for (let r = 0; r < 3; r++) {
      pc.rect(x0 + 2, 8 + r * 5, 28, 4, P.wood);
      pc.rect(x0 + 15, 9 + r * 5, 2, 2, P.coin);
    }
  });
  frame('loveseat', 32, 18, (x0) => {
    pc.rect(x0, 2, 32, 14, P.outline);
    pc.rect(x0 + 1, 3, 30, 12, '#ff8fcf');
    pc.rect(x0 + 3, 8, 26, 6, '#ffb3d9');
    pc.rect(x0 + 1, 3, 4, 12, '#e05fa8');
    pc.rect(x0 + 27, 3, 4, 12, '#e05fa8');
    pc.rect(x0 + 3, 16, 2, 2, P.outline);
    pc.rect(x0 + 27, 16, 2, 2, P.outline);
    pc.rows(x0 + 13, 3, ['.oo.oo.', 'orroro.', 'orrrrro', '.orrro.', '..oro..'], { o: P.outline, r: P.red });
  });
}

function crittersSheet(pc: PixelCanvas) {
  let x = 0;
  const frame = (name: string, w: number, h: number, rows: string[], pal: Record<string, string>) => {
    pc.rows(x, 0, rows, pal);
    pc.frame(name, x, 0, w, h);
    x += w + 1;
  };
  const chick = { o: P.outline, w: P.white, R: P.red, e: P.eye, B: P.orange, y: P.orange };
  frame('chicken0', 12, 12, ['.......oo...', '......oRRo..', '......oweo..', '.......ooB..', '..oooowwo...', '.owwwwwwo...', 'owwwwwwwo...', 'owwwwwwo....', '.oooooo.....', '..y..y......'], chick);
  frame('chicken1', 12, 12, ['....oo......', '...owwo.....', '..owwwwo....', '.owwwwwwoo..', 'owwwwwwwoRo.', 'owwwwwwwoeo.', '.owwwwwwoBo.', '..oooooo....', '...y..y.....', '...yy.yy....'], chick);
  const cowP = { o: P.outline, w: P.white, k: '#3b2a3a', e: P.eye, p: P.pink, h: P.trunk };
  frame('cow0', 20, 14, ['....oooooooo........', '...owwwwkkwwo.......', '..owwwwwwwwwwoo.....', '.owwkkwwwwwwwwwo....', '.owwkkwwwwkwwweo....', '.owwwwwwwwkwwwwo....', '.owwwwwwwwwwwwpo....', '..oooooooooooppo....', '...oo....oo.oooo....', '...oo....oo.........', '...oo....oo.........', '...oo....oo.........', '...oo....oo.........', '...oo....oo.........'], cowP);
  frame('cow1', 20, 14, ['....oooooooo........', '...owwwwkkwwo.......', '..owwwwwwwwwwoo.....', '.owwkkwwwwwwwwwo....', '.owwkkwwwwkwwweo....', '.owwwwwwwwkwwwwo....', '.owwwwwwwwwwwwpo....', '..oooooooooooppo....', '..oo......oo.ooo....', '..oo......oo........', '..oo......oo........', '..oo......oo........', '...oo....oo.........', '...oo....oo.........'], cowP);
  const sheepP = { o: P.outline, w: '#f4f4ff', k: '#3b2a3a', e: P.eye };
  frame('sheep0', 16, 14, ['...oooooooo.....', '..owwwwwwwwo....', '.owwwwwwwwwwoo..', '.owwwwwwwwwwkko.', '.owwwwwwwwwwkeo.', '.owwwwwwwwwwkko.', '..owwwwwwwwwoo..', '...oooooooo.....', '....kk..kk......', '....kk..kk......', '................', '................', '................', '................'], sheepP);
  frame('sheep1', 16, 14, ['...oooooooo.....', '..owwwwwwwwo....', '.owwwwwwwwwwoo..', '.owwwwwwwwwwkko.', '.owwwwwwwwwwkeo.', '.owwwwwwwwwwkko.', '..owwwwwwwwwoo..', '...oooooooo.....', '...kk....kk.....', '...kk....kk.....', '................', '................', '................', '................'], sheepP);
  const dogP = { o: P.outline, b: '#e2ad70', d: '#c98b4e', e: P.eye, r: P.red, w: P.white };
  frame('dog0', 12, 10, ['.oo.....oo..', 'obbo...obbo.', 'obbbooobbbo.', '.obbbbbbbeo.', '.obbbbbbbbo.', '..obbbbbbo..', '..obddddbo..', '..oo.oo.oo..', '..oo.oo.oo..', '............'], dogP);
  frame('dog1', 12, 10, ['.oo.....oo..', 'obbo...obbo.', 'obbbooobbbo.', '.obbbbbbbeo.', '.obbbbbbbbo.', '..obbbbbbo..', '..obddddbo..', '.oo..oo..oo.', '.oo..oo..oo.', '............'], dogP);
  const catP = { o: P.outline, b: '#8d8fa3', d: '#6a6f8a', e: '#7bd36a', p: P.pink };
  frame('cat0', 12, 10, ['.o......o...', 'obo....obo..', 'obbooooobbo.', '.obbbbbbbeo.', '.obbpbbbbbo.', '..obbbbbbo..', '..obddddbo..', '..oo.oo.oo..', '..oo.oo.ooo.', '............'], catP);
  frame('cat1', 12, 10, ['.o......o...', 'obo....obo..', 'obbooooobbo.', '.obbbbbbbeo.', '.obbpbbbbbo.', '..obbbbbbo..', '..obddddbo..', '.oo..oo..oo.', '.oo..oo..ooo', '............'], catP);
  const bunP = { o: P.outline, w: '#fafafa', p: P.pink, e: P.eye };
  frame('bunny0', 10, 10, ['.oo...oo..', 'opwo.owpo.', 'opwo.owpo.', '.owwwwwo..', 'owwwwwweo.', 'owwpwwwwo.', '.owwwwwo..', '..oo.oo...', '..oo.oo...', '..........'], bunP);
  frame('bunny1', 10, 10, ['.oo...oo..', 'opwo.owpo.', 'opwo.owpo.', '.owwwwwo..', 'owwwwwweo.', 'owwpwwwwo.', '.owwwwwo..', '.oo...oo..', '.oo...oo..', '..........'], bunP);
}

function propsSheet(pc: PixelCanvas) {
  let x = 0;
  const frame = (name: string, w: number, h: number, draw: (x0: number) => void) => {
    draw(x);
    pc.frame(name, x, 0, w, h);
    x += w + 2;
  };
  frame('fountain', 32, 32, (x0) => {
    pc.disc(x0 + 16, 22, 15, P.outline);
    pc.disc(x0 + 16, 22, 14, '#c9c2c2');
    pc.disc(x0 + 16, 22, 11, P.water);
    pc.disc(x0 + 16, 22, 11, P.water);
    pc.rect(x0 + 8, 20, 16, 1, P.waterLight);
    pc.rect(x0 + 13, 8, 6, 14, P.outline);
    pc.rect(x0 + 14, 9, 4, 12, '#c9c2c2');
    pc.disc(x0 + 16, 8, 4, P.outline);
    pc.disc(x0 + 16, 8, 3, '#d9d2d2');
    pc.px(x0 + 16, 3, P.waterLight);
    pc.px(x0 + 14, 5, P.waterLight);
    pc.px(x0 + 18, 5, P.waterLight);
    pc.px(x0 + 12, 8, P.waterLight);
    pc.px(x0 + 20, 8, P.waterLight);
  });
  frame('lamp', 8, 24, (x0) => {
    pc.rect(x0 + 3, 6, 2, 16, P.outline);
    pc.rect(x0 + 1, 22, 6, 2, P.outline);
    pc.rect(x0 + 1, 0, 6, 7, P.outline);
    pc.rect(x0 + 2, 1, 4, 5, P.yellow);
    pc.rect(x0 + 2, 1, 4, 1, '#fff4b0');
  });
  frame('bench', 16, 10, (x0) => {
    pc.rect(x0, 0, 16, 5, P.outline);
    pc.rect(x0 + 1, 1, 14, 3, P.wood);
    pc.rect(x0 + 1, 5, 2, 5, P.outline);
    pc.rect(x0 + 13, 5, 2, 5, P.outline);
    pc.rect(x0 + 1, 3, 14, 1, P.woodDark);
  });
  frame('board', 24, 24, (x0) => {
    pc.rect(x0 + 3, 20, 2, 4, P.outline);
    pc.rect(x0 + 19, 20, 2, 4, P.outline);
    pc.rect(x0, 0, 24, 21, P.outline);
    pc.rect(x0 + 1, 1, 22, 19, P.wood);
    pc.rect(x0 + 3, 3, 8, 7, P.cream);
    pc.rect(x0 + 13, 3, 8, 7, P.pink);
    pc.rect(x0 + 3, 11, 8, 7, P.mint);
    pc.rect(x0 + 13, 11, 8, 7, P.cream);
    pc.px(x0 + 6, 4, P.red);
    pc.px(x0 + 16, 4, P.red);
    pc.px(x0 + 6, 12, P.red);
    pc.px(x0 + 16, 12, P.red);
  });
  frame('sign', 16, 20, (x0) => {
    pc.rect(x0 + 7, 12, 2, 8, P.outline);
    pc.rect(x0, 2, 16, 11, P.outline);
    pc.rect(x0 + 1, 3, 14, 9, P.wood);
    pc.rect(x0 + 3, 5, 10, 1, P.woodDark);
    pc.rect(x0 + 3, 8, 8, 1, P.woodDark);
    pc.px(x0 + 14, 7, P.woodDark);
  });
  frame('hay', 16, 12, (x0) => {
    pc.rect(x0, 2, 16, 10, P.outline);
    pc.rect(x0 + 1, 3, 14, 8, P.yellow);
    pc.rect(x0 + 1, 3, 14, 2, '#fff0a8');
    pc.rect(x0 + 1, 7, 14, 1, P.coinDark);
    pc.rect(x0 + 5, 3, 1, 8, P.coinDark);
    pc.rect(x0 + 10, 3, 1, 8, P.coinDark);
  });
  frame('hive', 16, 18, (x0) => {
    pc.rect(x0 + 6, 14, 4, 4, P.outline);
    pc.rect(x0 + 7, 15, 2, 3, P.woodDark);
    pc.rect(x0 + 3, 2, 10, 12, P.outline);
    pc.rect(x0 + 4, 3, 8, 10, P.coin);
    pc.rect(x0 + 4, 6, 8, 1, P.coinDark);
    pc.rect(x0 + 4, 9, 8, 1, P.coinDark);
    pc.rect(x0 + 7, 10, 2, 2, P.outline);
    pc.px(x0 + 1, 1, P.yellow);
    pc.px(x0 + 14, 4, P.yellow);
    pc.px(x0 + 13, 0, P.yellow);
  });
  frame('stump', 16, 12, (x0) => {
    pc.rect(x0 + 2, 4, 12, 8, P.outline);
    pc.rect(x0 + 3, 5, 10, 6, P.trunkDark);
    pc.disc(x0 + 8, 4, 6, P.outline);
    pc.disc(x0 + 8, 4, 5, P.trunk);
    pc.disc(x0 + 8, 4, 3, P.woodLight);
    pc.disc(x0 + 8, 4, 1, P.trunk);
  });
  frame('mushroom', 12, 12, (x0) => {
    pc.rect(x0 + 4, 7, 4, 5, P.outline);
    pc.rect(x0 + 5, 8, 2, 3, P.cream);
    pc.disc(x0 + 6, 5, 5, P.outline);
    pc.disc(x0 + 6, 5, 4, P.red);
    pc.px(x0 + 4, 4, P.white);
    pc.px(x0 + 8, 5, P.white);
    pc.px(x0 + 6, 2, P.white);
    pc.rect(x0 + 2, 7, 8, 1, P.outline);
  });
  frame('berrybush', 16, 16, (x0) => {
    pc.disc(x0 + 8, 10, 6, P.outline);
    pc.disc(x0 + 4, 11, 4, P.outline);
    pc.disc(x0 + 12, 11, 4, P.outline);
    pc.disc(x0 + 8, 10, 5, P.leafDark);
    pc.disc(x0 + 4, 11, 3, P.leafDark);
    pc.disc(x0 + 12, 11, 3, P.leafDark);
    pc.disc(x0 + 7, 9, 3, P.leaf);
    for (const [bx, by] of [
      [5, 8],
      [10, 7],
      [4, 12],
      [12, 10],
      [8, 12],
    ]) {
      pc.px(x0 + bx, by, '#5a7cff');
      pc.px(x0 + bx + 1, by, '#5a7cff');
      pc.px(x0 + bx, by + 1, '#3f5fd9');
      pc.px(x0 + bx + 1, by + 1, '#3f5fd9');
    }
  });
  frame('herb', 12, 12, (x0) => {
    pc.rect(x0 + 5, 6, 2, 6, P.leafDark);
    pc.rect(x0 + 2, 4, 3, 2, P.leafLight);
    pc.rect(x0 + 7, 3, 3, 2, P.leafLight);
    pc.rect(x0 + 1, 8, 3, 2, P.leaf);
    pc.rect(x0 + 8, 7, 3, 2, P.leaf);
    pc.px(x0 + 6, 1, P.leafLight);
    pc.px(x0 + 5, 2, P.leafLight);
  });
  frame('sprinkler', 16, 16, (x0) => {
    pc.rect(x0 + 6, 6, 4, 10, P.outline);
    pc.rect(x0 + 7, 7, 2, 8, '#8d8fa3');
    pc.rect(x0 + 4, 4, 8, 3, P.outline);
    pc.rect(x0 + 5, 5, 6, 1, P.blue);
    pc.px(x0 + 8, 2, P.waterLight);
    pc.px(x0 + 4, 3, P.waterLight);
    pc.px(x0 + 12, 3, P.waterLight);
  });
  frame('flowerbed', 16, 16, (x0) => {
    pc.rect(x0, 10, 16, 5, P.outline);
    pc.rect(x0 + 1, 11, 14, 3, P.woodDark);
    [P.pink, P.yellow, P.purple, P.white, P.red].forEach((c, i) => {
      pc.px(x0 + 2 + i * 3, 8, c);
      pc.px(x0 + 1 + i * 3, 9, c);
      pc.px(x0 + 3 + i * 3, 9, c);
      pc.px(x0 + 2 + i * 3, 9, P.yellow);
      pc.px(x0 + 2 + i * 3, 10, P.leaf);
    });
  });
  frame('bobber', 16, 16, (x0) => {
    pc.disc(x0 + 8, 8, 3, P.outline);
    pc.disc(x0 + 8, 8, 2, P.red);
    pc.rect(x0 + 6, 8, 5, 2, P.white);
  });
  frame('mailbox', 16, 24, (x0) => {
    pc.rect(x0 + 7, 12, 3, 12, P.outline);
    pc.rect(x0 + 8, 13, 1, 10, P.woodDark);
    pc.rect(x0 + 2, 3, 12, 10, P.outline);
    pc.rect(x0 + 3, 4, 10, 8, P.red);
    pc.rect(x0 + 3, 4, 10, 2, P.pink);
    pc.rect(x0 + 5, 7, 6, 4, P.outline);
    pc.rect(x0 + 6, 8, 4, 2, P.cream);
    pc.rect(x0 + 13, 1, 2, 5, P.outline);
    pc.px(x0 + 13, 2, P.yellow);
    pc.px(x0 + 13, 3, P.yellow);
  });
  frame('balloons', 16, 24, (x0) => {
    pc.rect(x0 + 8, 12, 1, 12, P.outline);
    pc.disc(x0 + 5, 6, 4, P.outline);
    pc.disc(x0 + 5, 6, 3, P.red);
    pc.disc(x0 + 11, 5, 4, P.outline);
    pc.disc(x0 + 11, 5, 3, P.blue);
    pc.disc(x0 + 8, 10, 4, P.outline);
    pc.disc(x0 + 8, 10, 3, P.yellow);
    pc.px(x0 + 4, 4, P.white);
    pc.px(x0 + 10, 3, P.white);
  });
  frame('bunting', 32, 8, (x0) => {
    pc.rect(x0, 0, 32, 1, P.outline);
    [P.red, P.yellow, P.blue, P.pink, P.mint, P.orange, P.purple, P.red].forEach((c, i) => {
      pc.rows(x0 + i * 4, 1, ['ccc', 'ccc', '.c.'], { c });
    });
  });
}

function cropFrames(pc: PixelCanvas, x0: number, crop: CropId) {
  const def = CROPS[crop];
  const leaf = def.leaf;
  const s = 16;
  let x = x0;
  // 0: sprout
  pc.px(x + 8, 11, leaf);
  pc.px(x + 8, 12, leaf);
  pc.px(x + 7, 10, leaf);
  pc.px(x + 9, 10, leaf);
  pc.px(x + 8, 13, P.leafDark);
  // 1: small
  x = x0 + s;
  pc.rect(x + 8, 8, 1, 6, P.leafDark);
  pc.rect(x + 6, 9, 2, 2, leaf);
  pc.rect(x + 9, 7, 2, 2, leaf);
  pc.rect(x + 5, 12, 3, 1, leaf);
  pc.rect(x + 9, 11, 3, 1, leaf);
  // 2: big (no fruit) and 3: ripe
  for (const stage of [2, 3]) {
    x = x0 + stage * s;
    const ripe = stage === 3;
    if (def.shape === 'stalk') {
      for (const sx of [4, 7, 10]) {
        pc.rect(x + sx, 6, 1, 8, P.leafDark);
        if (ripe) {
          pc.rect(x + sx - 1, 3, 3, 5, def.color);
          pc.px(x + sx, 2, def.color);
          pc.px(x + sx - 1, 4, def.colorLight);
        } else {
          pc.rect(x + sx - 1, 7, 3, 2, leaf);
        }
        pc.rect(x + sx - 1, 10, 3, 1, leaf);
      }
    } else if (def.shape === 'root') {
      pc.rect(x + 8, 5, 1, 7, P.leafDark);
      pc.rect(x + 5, 5, 3, 2, leaf);
      pc.rect(x + 9, 4, 3, 2, leaf);
      pc.rect(x + 4, 8, 4, 2, leaf);
      pc.rect(x + 9, 7, 4, 2, leaf);
      if (ripe) {
        pc.rect(x + 6, 11, 5, 3, def.color);
        pc.rect(x + 7, 14, 3, 1, def.color);
        pc.rect(x + 6, 11, 5, 1, def.colorLight);
      }
    } else if (def.shape === 'vine') {
      pc.rect(x + 3, 12, 10, 1, P.leafDark);
      pc.rect(x + 2, 9, 4, 3, leaf);
      pc.rect(x + 10, 8, 4, 3, leaf);
      pc.rect(x + 6, 6, 3, 3, leaf);
      if (ripe) {
        pc.disc(x + 8, 11, 4, P.outline);
        pc.disc(x + 8, 11, 3, def.color);
        pc.px(x + 7, 9, def.colorLight);
        pc.px(x + 8, 7, P.leafDark);
      }
    } else {
      pc.rect(x + 8, 5, 1, 9, P.leafDark);
      pc.rect(x + 5, 6, 3, 2, leaf);
      pc.rect(x + 9, 5, 3, 2, leaf);
      pc.rect(x + 4, 9, 4, 2, leaf);
      pc.rect(x + 9, 8, 4, 2, leaf);
      pc.rect(x + 5, 12, 3, 1, leaf);
      pc.rect(x + 9, 12, 3, 1, leaf);
      if (ripe) {
        for (const [fx, fy] of [
          [5, 8],
          [11, 7],
          [6, 12],
          [10, 11],
        ]) {
          pc.rect(x + fx, fy, 2, 2, def.color);
          pc.px(x + fx, fy, def.colorLight);
        }
      }
    }
  }
  for (let f = 0; f < 4; f++) pc.frame(`${crop}-${f}`, x0 + f * s, 0, s, s);
}

function produceIcon(pc: PixelCanvas, x0: number, crop: CropId) {
  const def = CROPS[crop];
  if (def.shape === 'stalk') {
    pc.rect(x0 + 5, 1, 1, 10, P.leafDark);
    pc.rect(x0 + 3, 1, 5, 5, def.color);
    pc.px(x0 + 5, 0, def.color);
    pc.px(x0 + 4, 2, def.colorLight);
    pc.px(x0 + 3, 1, P.outline);
    pc.px(x0 + 7, 1, P.outline);
  } else if (def.shape === 'root') {
    pc.rect(x0 + 4, 0, 4, 3, def.leaf);
    pc.rect(x0 + 3, 3, 6, 5, def.color);
    pc.rect(x0 + 4, 8, 4, 2, def.color);
    pc.rect(x0 + 5, 10, 2, 1, def.color);
    pc.px(x0 + 4, 4, def.colorLight);
    pc.px(x0 + 4, 6, def.colorLight);
  } else if (def.shape === 'vine') {
    pc.disc(x0 + 6, 7, 5, P.outline);
    pc.disc(x0 + 6, 7, 4, def.color);
    pc.rect(x0 + 6, 5, 1, 5, def.colorLight);
    pc.rect(x0 + 5, 1, 2, 2, P.leafDark);
  } else if (crop === 'strawberry') {
    pc.rect(x0 + 4, 1, 4, 2, def.leaf);
    pc.rect(x0 + 3, 3, 6, 4, def.color);
    pc.rect(x0 + 4, 7, 4, 2, def.color);
    pc.rect(x0 + 5, 9, 2, 1, def.color);
    pc.px(x0 + 4, 4, P.yellow);
    pc.px(x0 + 7, 5, P.yellow);
    pc.px(x0 + 5, 7, P.yellow);
    pc.px(x0 + 4, 3, def.colorLight);
  } else if (crop === 'blueberry') {
    pc.disc(x0 + 4, 7, 2, def.color);
    pc.disc(x0 + 8, 7, 2, def.color);
    pc.disc(x0 + 6, 4, 2, def.color);
    pc.px(x0 + 5, 3, def.colorLight);
    pc.px(x0 + 3, 6, def.colorLight);
    pc.px(x0 + 6, 1, P.leafDark);
  } else {
    pc.rect(x0 + 5, 1, 2, 2, def.leaf);
    pc.disc(x0 + 6, 6, 4, def.color);
    pc.px(x0 + 4, 4, def.colorLight);
    pc.px(x0 + 5, 4, def.colorLight);
    pc.px(x0 + 4, 5, def.colorLight);
  }
}

function dishIcon(pc: PixelCanvas, x0: number, color: string, light: string) {
  pc.disc(x0 + 6, 7, 5, P.outline);
  pc.disc(x0 + 6, 7, 4, '#f4f4ff');
  pc.disc(x0 + 6, 6, 3, P.outline);
  pc.disc(x0 + 6, 6, 2, color);
  pc.px(x0 + 5, 5, light);
}

// ------------------------------------------------------------------ build

export function buildObjectTextures(scene: Phaser.Scene) {
  if (scene.textures.exists('trees')) return;
  const rnd = mulberry32(21);

  const trees = new PixelCanvas(scene, 'trees', TREE_W * 5, TREE_H);
  tree(trees, 0, 0, P.leaf, P.leafLight, P.leafDark, rnd);
  tree(trees, TREE_W, 0, '#3aa84a', P.leaf, '#2b7f38', rnd);
  tree(trees, TREE_W * 2, 0, P.blossom, P.blossomLight, P.blossomDark, rnd);
  tree(trees, TREE_W * 3, 0, '#ffc2df', '#fff0f7', P.blossom, rnd);
  tree(trees, TREE_W * 4, 0, '#2f7a3a', '#4a9a4a', '#1f5a2a', rnd);
  for (let i = 0; i < 5; i++) trees.frame(i, i * TREE_W, 0, TREE_W, TREE_H);
  trees.done();

  const h = new PixelCanvas(scene, 'house', 112, 104);
  house(h);
  h.done();

  const st = new PixelCanvas(scene, 'stall', 48, 44);
  stall(st);
  st.done();

  const k = new PixelCanvas(scene, 'kitchen', 48, 40);
  kitchen(k);
  k.done();

  const ct = new PixelCanvas(scene, 'counter', 32, 26);
  counter(ct);
  ct.done();

  const cp = new PixelCanvas(scene, 'coop', 48, 40);
  coop(cp);
  cp.done();

  const bn = new PixelCanvas(scene, 'barn', 72, 64);
  barn(bn);
  bn.done();

  // town buildings: store (blue), tailor (pink), petshop (green), restaurant (orange)
  const bl = new PixelCanvas(scene, 'buildings', 80 * 7, 72);
  facade(bl, 0, 8, 80, 64, '#fff3dc', '#eedcc0', '#5fa8ff', '#3f7fd0', { sign: 'STORE', windows: 2, awning: '#5fa8ff' });
  facade(bl, 80, 8, 80, 64, '#fff0f6', '#f0d8e6', '#ff8fcf', '#e05fa8', { sign: 'ROSA', windows: 2, awning: '#ff8fcf' });
  facade(bl, 160, 8, 80, 64, '#f0fff0', '#d8f0d8', '#7bd36a', '#4fa84a', { sign: 'PETS', windows: 2 });
  facade(bl, 240, 0, 80, 72, '#fff3dc', '#eedcc0', '#ff9a5c', '#e0733a', { sign: 'EAT', windows: 2, awning: '#ff9a5c', chimney: true });
  bl.frame('store', 0, 0, 80, 72);
  bl.frame('tailor', 80, 0, 80, 72);
  bl.frame('petshop', 160, 0, 80, 72);
  bl.frame('restaurant', 240, 0, 80, 72);
  // family homes: qd's family (lavender roof), xb's family (teal roof), each with a heart over the door
  facade(bl, 320, 4, 80, 68, '#fff6ee', '#f0dccc', '#b98cff', '#9466e0', { windows: 2, chimney: true });
  facade(bl, 400, 4, 80, 68, '#f4fbff', '#dcecf4', '#4fbfb0', '#2f9a8c', { windows: 2, chimney: true });
  for (const x0 of [320, 400]) {
    bl.rows(x0 + 37, 32, ['.oo.oo.', 'orroro.', 'orrrrro', '.orrro.', '..oro..', '...o...'], { o: P.outline, r: P.red });
    bl.px(x0 + 39, 33, P.pink);
    // flower boxes under the windows
    for (const wx of [10, 56]) {
      bl.rect(x0 + wx - 1, 48, 16, 3, P.woodDark);
      [P.pink, P.yellow, P.red, P.white].forEach((c, i) => bl.px(x0 + wx + 1 + i * 4, 47, c));
    }
  }
  bl.frame('house_qd', 320, 0, 80, 72);
  bl.frame('house_xb', 400, 0, 80, 72);
  // Cozy Corner furniture shop: sunny yellow roof, a sofa in the window
  facade(bl, 480, 8, 80, 64, '#fffbea', '#f0e4c0', '#ffd23f', '#e6a800', { sign: 'HOME', windows: 2, awning: '#ffd23f' });
  bl.rect(480 + 11, 43, 12, 5, '#ff8fcf');
  bl.rect(480 + 57, 45, 10, 3, P.woodDark);
  bl.frame('furnshop', 480, 0, 80, 72);
  bl.done();

  const f = new PixelCanvas(scene, 'fence', 32, 16);
  f.rect(0, 6, 16, 3, P.outline);
  f.rect(0, 7, 16, 1, P.white);
  f.rect(0, 11, 16, 3, P.outline);
  f.rect(0, 12, 16, 1, P.white);
  for (const px of [2, 8]) {
    f.rect(px, 3, 4, 13, P.outline);
    f.rect(px + 1, 4, 2, 11, P.white);
    f.px(px + 1, 2, P.outline);
    f.px(px + 2, 2, P.outline);
    f.px(px + 1, 3, P.white);
    f.px(px + 2, 3, P.white);
  }
  f.rect(22, 2, 4, 14, P.outline);
  f.rect(23, 3, 2, 12, P.white);
  f.px(23, 1, P.outline);
  f.px(24, 1, P.outline);
  f.px(23, 2, P.white);
  f.px(24, 2, P.white);
  f.frame(0, 0, 0, 16, 16);
  f.frame(1, 16, 0, 16, 16);
  f.done();

  const wf = new PixelCanvas(scene, 'woodfence', 32, 16);
  wf.rect(0, 5, 16, 2, P.outline);
  wf.rect(0, 6, 16, 1, P.woodLight);
  wf.rect(0, 10, 16, 2, P.outline);
  wf.rect(0, 11, 16, 1, P.woodLight);
  for (const px of [2, 9]) {
    wf.rect(px, 2, 3, 14, P.outline);
    wf.rect(px + 1, 3, 1, 12, P.wood);
  }
  wf.rect(22, 2, 3, 14, P.outline);
  wf.rect(23, 3, 1, 12, P.wood);
  wf.frame(0, 0, 0, 16, 16);
  wf.frame(1, 16, 0, 16, 16);
  wf.done();

  const b = new PixelCanvas(scene, 'bushes', 48, 16);
  [P.red, P.blue, P.pink].forEach((berry, i) => {
    const x0 = i * 16;
    b.disc(x0 + 8, 10, 6, P.outline);
    b.disc(x0 + 4, 11, 4, P.outline);
    b.disc(x0 + 12, 11, 4, P.outline);
    b.disc(x0 + 8, 10, 5, P.leafDark);
    b.disc(x0 + 4, 11, 3, P.leafDark);
    b.disc(x0 + 12, 11, 3, P.leafDark);
    b.disc(x0 + 7, 9, 3, P.leaf);
    b.disc(x0 + 5, 10, 1, P.leafLight);
    b.px(x0 + 10, 7, berry);
    b.px(x0 + 4, 12, berry);
    b.px(x0 + 12, 9, berry);
    b.px(x0 + 8, 12, berry);
    b.frame(i, x0, 0, 16, 16);
  });
  b.done();

  const fu = new PixelCanvas(scene, 'furniture', 1400, 48);
  furnitureSheet(fu);
  fu.done();

  const cr = new PixelCanvas(scene, 'critters', 200, 14);
  crittersSheet(cr);
  cr.done();

  const pr = new PixelCanvas(scene, 'props', 380, 32);
  propsSheet(pr);
  pr.done();

  const crops = new PixelCanvas(scene, 'crops', 16 * 4 * CROP_IDS.length, 16);
  CROP_IDS.forEach((id, i) => cropFrames(crops, i * 64, id));
  crops.done();

  // ---- 12x12 icons ----
  const draws: [string, (x0: number) => void][] = [];
  const I = (name: string, fn: (x0: number) => void) => draws.push([name, fn]);
  let icons: PixelCanvas;
  CROP_IDS.forEach((id) => I(`crop-${id}`, (x0) => produceIcon(icons, x0, id)));
  CROP_IDS.forEach((id) =>
    I(`seed-${id}`, (x0) => {
      icons.rect(x0 + 2, 1, 8, 10, P.outline);
      icons.rect(x0 + 3, 2, 6, 8, P.cream);
      icons.rect(x0 + 3, 2, 6, 2, CROPS[id].color);
      icons.rect(x0 + 5, 5, 2, 2, CROPS[id].color);
      icons.px(x0 + 4, 8, P.woodDark);
      icons.px(x0 + 7, 8, P.woodDark);
    }),
  );
  RECIPE_IDS.forEach((id) => I(`dish-${id}`, (x0) => dishIcon(icons, x0, RECIPES[id].color, RECIPES[id].colorLight)));
  FURNITURE_IDS.forEach((id) =>
    I(`furn-${id}`, (x0) => {
      icons.rect(x0 + 2, 3, 8, 7, P.outline);
      icons.rect(x0 + 3, 4, 6, 5, P.wood);
      icons.rect(x0 + 3, 4, 6, 1, P.woodLight);
      icons.rect(x0 + 3, 10, 1, 1, P.outline);
      icons.rect(x0 + 8, 10, 1, 1, P.outline);
    }),
  );
  I('coin', (x0) => {
    icons.disc(x0 + 6, 6, 5, P.outline);
    icons.disc(x0 + 6, 6, 4, P.coin);
    icons.disc(x0 + 6, 6, 2, P.coinDark);
    icons.px(x0 + 4, 4, P.white);
  });
  I('heart', (x0) => {
    icons.rows(x0 + 2, 2, ['.oo.oo.', 'orroro.', 'orrrrro', '.orrro.', '..oro..', '...o...'], { o: P.outline, r: P.red });
    icons.px(x0 + 4, 3, P.pink);
  });
  I('drop', (x0) => icons.rows(x0 + 3, 1, ['..o..', '.owo.', 'owwwo', 'olwwo', '.ooo.'], { o: P.outline, w: P.water, l: P.waterLight }));
  I('star', (x0) => icons.rows(x0 + 3, 3, ['..y..', '.yyy.', 'yywyy', '.yyy.', '..y..'], { y: P.yellow, w: P.white }));
  I('egg', (x0) => {
    icons.disc(x0 + 6, 7, 4, P.outline);
    icons.disc(x0 + 6, 5, 3, P.outline);
    icons.disc(x0 + 6, 7, 3, '#fff6e0');
    icons.disc(x0 + 6, 5, 2, '#fff6e0');
    icons.px(x0 + 5, 4, P.white);
  });
  I('fish', (x0) => {
    icons.rows(x0 + 1, 3, ['..oooo...o', '.owwwwo.oo', 'owwewwwooo', '.owwwwo.oo', '..oooo...o'], { o: P.outline, w: '#7fb8e6', e: P.eye });
    icons.px(x0 + 3, 4, P.waterLight);
  });
  // one colour per fish species; rare fish get a fin stripe, legendary a sparkle
  FISH_IDS.forEach((id) =>
    I(`fish-${id}`, (x0) => {
      const f = FISH[id];
      icons.rows(x0 + 1, 3, ['..oooo...o', '.owwwwo.oo', 'owwewwwooo', '.owwwwo.oo', '..oooo...o'], { o: P.outline, w: f.color, e: P.eye });
      icons.px(x0 + 3, 4, P.white);
      if (f.rarity === 'rare' || f.rarity === 'legendary') icons.rect(x0 + 5, 4, 1, 3, P.white);
      if (f.rarity === 'legendary') {
        icons.px(x0 + 10, 1, P.white);
        icons.px(x0 + 1, 9, P.yellow);
      }
    }),
  );
  I('milk', (x0) => {
    icons.rect(x0 + 3, 1, 6, 3, P.outline);
    icons.rect(x0 + 2, 4, 8, 7, P.outline);
    icons.rect(x0 + 3, 5, 6, 5, P.white);
    icons.rect(x0 + 4, 2, 4, 1, P.white);
    icons.rect(x0 + 3, 7, 6, 2, P.blue);
  });
  I('wool', (x0) => {
    icons.disc(x0 + 6, 6, 5, P.outline);
    icons.disc(x0 + 6, 6, 4, '#f4f4ff');
    icons.disc(x0 + 4, 5, 1, '#dcdcf0');
    icons.disc(x0 + 8, 7, 1, '#dcdcf0');
  });
  I('mushroom', (x0) => {
    icons.rect(x0 + 4, 7, 4, 4, P.outline);
    icons.rect(x0 + 5, 8, 2, 2, P.cream);
    icons.disc(x0 + 6, 5, 4, P.outline);
    icons.disc(x0 + 6, 5, 3, P.red);
    icons.px(x0 + 5, 4, P.white);
    icons.px(x0 + 8, 5, P.white);
  });
  I('berry', (x0) => {
    icons.disc(x0 + 4, 6, 2, '#5a7cff');
    icons.disc(x0 + 8, 7, 2, '#5a7cff');
    icons.disc(x0 + 6, 4, 2, '#5a7cff');
    icons.px(x0 + 5, 3, '#9fb4ff');
    icons.px(x0 + 6, 1, P.leafDark);
  });
  I('herb', (x0) => {
    icons.rect(x0 + 5, 5, 2, 6, P.leafDark);
    icons.rect(x0 + 2, 3, 3, 2, P.leafLight);
    icons.rect(x0 + 7, 2, 3, 2, P.leafLight);
    icons.rect(x0 + 2, 7, 3, 2, P.leaf);
    icons.rect(x0 + 7, 6, 3, 2, P.leaf);
  });
  I('honey', (x0) => {
    icons.rect(x0 + 3, 2, 6, 2, P.outline);
    icons.rect(x0 + 2, 4, 8, 7, P.outline);
    icons.rect(x0 + 3, 5, 6, 5, P.coin);
    icons.rect(x0 + 3, 5, 6, 1, '#fff0a8');
    icons.rect(x0 + 4, 3, 4, 1, P.woodDark);
  });
  I('rod', (x0) => {
    for (let i = 0; i < 9; i++) icons.px(x0 + 2 + i, 10 - i, P.woodDark);
    icons.px(x0 + 10, 2, P.outline);
    icons.rect(x0 + 10, 3, 1, 5, P.white);
    icons.disc(x0 + 10, 9, 1, P.red);
  });
  I('plate', (x0) => {
    icons.disc(x0 + 6, 6, 5, P.outline);
    icons.disc(x0 + 6, 6, 4, '#f4f4ff');
    icons.disc(x0 + 6, 6, 2, '#dcdcf0');
  });
  I('flame', (x0) => icons.rows(x0 + 3, 1, ['..r..', '.rrr.', 'rryrr', 'ryyyr', '.ryr.', '..o..'], { r: P.red, y: P.yellow, o: P.outline }));
  I('flower', (x0) => {
    icons.disc(x0 + 6, 5, 3, P.pink);
    icons.disc(x0 + 6, 5, 1, P.yellow);
    icons.rect(x0 + 6, 8, 1, 3, P.leafDark);
  });
  I('chicken', (x0) => {
    icons.disc(x0 + 6, 7, 4, P.outline);
    icons.disc(x0 + 6, 7, 3, P.white);
    icons.px(x0 + 8, 4, P.red);
    icons.px(x0 + 9, 6, P.orange);
    icons.px(x0 + 7, 6, P.eye);
  });
  I('cow', (x0) => {
    icons.rect(x0 + 2, 3, 8, 6, P.outline);
    icons.rect(x0 + 3, 4, 6, 4, P.white);
    icons.rect(x0 + 4, 5, 2, 2, '#3b2a3a');
    icons.px(x0 + 8, 6, P.eye);
    icons.rect(x0 + 3, 9, 1, 2, P.outline);
    icons.rect(x0 + 8, 9, 1, 2, P.outline);
    icons.px(x0 + 9, 8, P.pink);
  });
  I('sheep', (x0) => {
    icons.disc(x0 + 6, 6, 4, P.outline);
    icons.disc(x0 + 6, 6, 3, '#f4f4ff');
    icons.rect(x0 + 8, 5, 2, 3, '#3b2a3a');
    icons.px(x0 + 9, 6, P.white);
    icons.rect(x0 + 4, 9, 1, 2, '#3b2a3a');
    icons.rect(x0 + 7, 9, 1, 2, '#3b2a3a');
  });
  I('dog', (x0) => {
    icons.disc(x0 + 6, 6, 4, P.outline);
    icons.disc(x0 + 6, 6, 3, '#e2ad70');
    icons.rect(x0 + 2, 3, 2, 4, '#c98b4e');
    icons.rect(x0 + 8, 3, 2, 4, '#c98b4e');
    icons.px(x0 + 5, 6, P.eye);
    icons.px(x0 + 7, 6, P.eye);
    icons.px(x0 + 6, 8, P.outline);
  });
  I('cat', (x0) => {
    icons.disc(x0 + 6, 6, 4, P.outline);
    icons.disc(x0 + 6, 6, 3, '#8d8fa3');
    icons.rows(x0 + 2, 1, ['o...o', 'oo.oo'], { o: '#8d8fa3' });
    icons.px(x0 + 5, 6, '#7bd36a');
    icons.px(x0 + 7, 6, '#7bd36a');
    icons.px(x0 + 6, 7, P.pink);
  });
  I('bunny', (x0) => {
    icons.disc(x0 + 6, 7, 3, P.outline);
    icons.disc(x0 + 6, 7, 2, '#fafafa');
    icons.rect(x0 + 4, 1, 2, 5, P.outline);
    icons.rect(x0 + 7, 1, 2, 5, P.outline);
    icons.px(x0 + 4, 2, P.pink);
    icons.px(x0 + 7, 2, P.pink);
    icons.px(x0 + 5, 7, P.eye);
    icons.px(x0 + 7, 7, P.eye);
  });
  I('hat', (x0) => {
    icons.rect(x0 + 2, 7, 8, 2, P.outline);
    icons.rect(x0 + 3, 3, 6, 4, P.outline);
    icons.rect(x0 + 4, 4, 4, 3, P.yellow);
    icons.rect(x0 + 3, 7, 6, 1, P.yellow);
    icons.rect(x0 + 4, 6, 4, 1, P.red);
  });
  I('dye', (x0) => {
    icons.rect(x0 + 4, 1, 4, 2, P.outline);
    icons.rect(x0 + 3, 3, 6, 8, P.outline);
    icons.rect(x0 + 4, 4, 4, 6, P.purple);
    icons.rect(x0 + 4, 4, 4, 2, P.pink);
  });
  I('map', (x0) => {
    icons.rect(x0 + 1, 2, 10, 8, P.outline);
    icons.rect(x0 + 2, 3, 8, 6, P.cream);
    icons.rect(x0 + 3, 4, 3, 2, P.grass);
    icons.rect(x0 + 6, 6, 3, 2, P.water);
    icons.px(x0 + 8, 4, P.red);
  });
  I('help', (x0) => {
    icons.disc(x0 + 6, 6, 5, P.outline);
    icons.disc(x0 + 6, 6, 4, P.mint);
    icons.rows(x0 + 4, 3, ['ooo', '..o', '.oo', '.o.', '...', '.o.'], { o: P.outline });
  });
  I('bag', (x0) => {
    icons.rect(x0 + 3, 4, 6, 6, P.outline);
    icons.rect(x0 + 4, 5, 4, 4, P.wood);
    icons.rect(x0 + 4, 2, 4, 2, P.outline);
    icons.px(x0 + 5, 3, P.woodDark);
    icons.px(x0 + 6, 3, P.woodDark);
  });
  I('table', (x0) => {
    icons.rect(x0 + 1, 3, 10, 3, P.outline);
    icons.rect(x0 + 2, 4, 8, 1, P.woodLight);
    icons.rect(x0 + 2, 6, 2, 4, P.outline);
    icons.rect(x0 + 8, 6, 2, 4, P.outline);
  });
  I('painting', (x0) => {
    icons.rect(x0 + 1, 2, 10, 8, P.outline);
    icons.rect(x0 + 2, 3, 8, 6, P.coin);
    icons.rect(x0 + 3, 4, 6, 4, P.water);
    icons.rect(x0 + 3, 6, 6, 2, P.grass);
  });
  I('note', (x0) => {
    icons.rect(x0 + 2, 1, 8, 10, P.outline);
    icons.rect(x0 + 3, 2, 6, 8, P.cream);
    icons.rect(x0 + 4, 4, 4, 1, P.pink);
    icons.rect(x0 + 4, 6, 4, 1, P.pink);
    icons.rect(x0 + 4, 8, 2, 1, P.pink);
  });
  I('question', (x0) => {
    icons.disc(x0 + 6, 6, 5, P.outline);
    icons.disc(x0 + 6, 6, 4, P.pink);
    icons.rows(x0 + 4, 3, ['ooo', '..o', '.oo', '.o.', '...', '.o.'], { o: P.white });
  });
  I('camera', (x0) => {
    icons.rect(x0 + 1, 3, 10, 7, P.outline);
    icons.rect(x0 + 2, 4, 8, 5, '#8d8fa3');
    icons.disc(x0 + 6, 6, 2, P.outline);
    icons.disc(x0 + 6, 6, 1, P.water);
    icons.rect(x0 + 3, 2, 3, 1, P.outline);
  });
  I('sun', (x0) => {
    icons.disc(x0 + 6, 6, 4, P.outline);
    icons.disc(x0 + 6, 6, 3, P.yellow);
    icons.px(x0 + 6, 0, P.yellow);
    icons.px(x0 + 6, 11, P.yellow);
    icons.px(x0 + 0, 6, P.yellow);
    icons.px(x0 + 11, 6, P.yellow);
  });
  I('cloud', (x0) => {
    icons.disc(x0 + 4, 7, 3, P.outline);
    icons.disc(x0 + 8, 7, 3, P.outline);
    icons.disc(x0 + 6, 5, 3, P.outline);
    icons.disc(x0 + 4, 7, 2, P.white);
    icons.disc(x0 + 8, 7, 2, P.white);
    icons.disc(x0 + 6, 5, 2, P.white);
  });
  I('rain', (x0) => {
    icons.disc(x0 + 4, 4, 3, P.outline);
    icons.disc(x0 + 8, 4, 3, P.outline);
    icons.disc(x0 + 4, 4, 2, '#c9c9d9');
    icons.disc(x0 + 8, 4, 2, '#c9c9d9');
    icons.px(x0 + 3, 9, P.water);
    icons.px(x0 + 6, 10, P.water);
    icons.px(x0 + 9, 9, P.water);
  });
  I('wave', (x0) => {
    icons.rows(x0 + 2, 1, ['..o.o.o.', '..ooooo.', '.oosssoo', 'oosssso.', '.osssso.', '..osso..', '..oooo..'], { o: P.outline, s: P.skin });
  });
  I('hug', (x0) => {
    icons.rows(x0 + 1, 2, ['.oo....oo.', 'osso..osso', 'osso..osso', '.oo....oo.', 'obbbbbbbbo', '.obbbbbbo.', '..oo..oo..'], { o: P.outline, s: P.skin, b: P.pink });
  });
  I('gift', (x0) => {
    icons.rect(x0 + 2, 4, 8, 7, P.outline);
    icons.rect(x0 + 3, 5, 6, 5, P.red);
    icons.rect(x0 + 5, 5, 2, 5, P.yellow);
    icons.rect(x0 + 3, 7, 6, 1, P.yellow);
    icons.rect(x0 + 3, 2, 2, 2, P.outline);
    icons.rect(x0 + 7, 2, 2, 2, P.outline);
  });
  I('dots', (x0) => icons.rows(x0 + 2, 5, ['o.o.o', 'o.o.o'], { o: P.outline }));
  I('book', (x0) => {
    icons.rect(x0 + 2, 1, 8, 10, P.outline);
    icons.rect(x0 + 3, 2, 6, 8, P.mint);
    icons.rect(x0 + 4, 2, 1, 8, P.white);
    icons.rect(x0 + 6, 4, 2, 1, P.outline);
    icons.rect(x0 + 6, 6, 2, 1, P.outline);
  });
  I('sound', (x0) => icons.rows(x0 + 2, 2, ['..o.....', '.oo.o...', 'ooo..o..', 'ooo.o.o.', 'ooo..o..', '.oo.o...', '..o.....'], { o: P.outline }));
  I('menu', (x0) => {
    icons.rect(x0 + 2, 3, 8, 2, P.outline);
    icons.rect(x0 + 2, 7, 8, 2, P.outline);
    icons.rect(x0 + 2, 9, 8, 2, P.outline);
  });
  I('lock', (x0) => {
    icons.rect(x0 + 3, 5, 6, 6, P.outline);
    icons.rect(x0 + 4, 6, 4, 4, P.coin);
    icons.frameRect(x0 + 4, 2, 4, 4, P.outline);
  });
  I('link', (x0) => {
    icons.frameRect(x0 + 1, 4, 5, 4, P.outline);
    icons.frameRect(x0 + 6, 4, 5, 4, P.outline);
    icons.rect(x0 + 4, 5, 4, 2, P.outline);
  });
  I('tree', (x0) => {
    icons.disc(x0 + 6, 5, 4, P.outline);
    icons.disc(x0 + 6, 5, 3, P.blossom);
    icons.rect(x0 + 5, 8, 2, 3, P.trunk);
    icons.px(x0 + 5, 4, P.red);
  });
  icons = new PixelCanvas(scene, 'icons', 12 * draws.length, 12);
  draws.forEach(([name, draw], i) => {
    draw(i * 12);
    icons.frame(name, i * 12, 0, 12, 12);
  });
  icons.done();

  // ---- mini-game props ----
  const mg = new PixelCanvas(scene, 'mg', 200, 40);
  mg.rows(0, 0, ['..........o.....', '.........oo.....', '........owo.....', '.......owwo.....', '......owwo......', '.....owwo.......', '....owwo........', '...owwo.........', '..owwo..........', '.oddo...........', 'oddo............', 'oo..............'], { o: P.outline, w: '#e6e6f2', d: P.woodDark });
  mg.frame('knife', 0, 0, 16, 16);
  mg.rows(16, 0, ['....oooo........', '...owwwwo.......', '...owwwwo.......', '....owwo........', '.....oo.........', '.....oo.........', '.....oo.........', '.....oo.........', '.....oo.........', '.....oo.........', '.....oo.........', '.....oo.........'], { o: P.outline, w: P.woodLight });
  mg.frame('spoon', 16, 0, 16, 16);
  mg.rows(32, 0, ['..oooooo....', '.o.o.o.oo...', '.oooooooo...', '.owwwwwwo...', '.owwwwwwo...', '.owwwwwwo...', '.owwrrwwo...', '.owwrrwwo...', '.owwwwwwo...', '.oooooooo...'], { o: P.outline, w: '#e6e6f2', r: P.red });
  mg.frame('shaker', 32, 0, 12, 16);
  mg.rect(48, 6, 22, 8, P.outline);
  mg.rect(49, 7, 20, 6, '#5a5f7a');
  mg.rect(49, 7, 20, 2, '#8d8fa3');
  mg.rect(70, 8, 10, 3, P.outline);
  mg.rect(71, 9, 8, 1, P.woodDark);
  mg.frame('pan', 48, 0, 32, 16);
  mg.disc(87, 3, 6, P.outline);
  mg.rect(82, 2, 12, 3, '#f2b16b');
  mg.rect(83, 1, 10, 1, '#ffd9a0');
  mg.frame('pancake', 80, 0, 16, 8);
  mg.rect(100, 6, 40, 26, P.outline);
  mg.rect(101, 7, 38, 24, '#6a6f8a');
  mg.rect(101, 26, 38, 4, '#4f5470');
  mg.rect(96, 12, 5, 5, P.outline);
  mg.rect(139, 12, 5, 5, P.outline);
  mg.rect(97, 13, 3, 3, '#9a9fbd');
  mg.rect(140, 13, 3, 3, '#9a9fbd');
  mg.rect(102, 8, 36, 8, P.outline);
  mg.rect(103, 9, 34, 6, '#f2b16b');
  mg.rect(104, 9, 32, 1, '#ffd9a0');
  mg.px(108, 12, '#ff9a5c');
  mg.px(120, 11, '#ff9a5c');
  mg.px(130, 13, '#ff9a5c');
  mg.frame('pot', 96, 0, 48, 32);
  const flames = [
    ['....rr......', '...rrrr.....', '..rryyrr....', '..ryyyyr....', '.rryyyyrr...', '.ryywwyyr...', '.ryywwyyr...', '..ryyyyr....', '...rrrr.....', '....rr......'],
    ['.....r......', '....rrr.....', '...rryrr....', '..rryyyr....', '..ryyyyrr...', '.rryywwyr...', '.ryywwyyr...', '..ryyyyr....', '...rrrr.....', '....rr......'],
    ['............', '......r.....', '....rrrr....', '...rryyr....', '..rryyyrr...', '..ryywyyr...', '..ryywyyr...', '..rryyyrr...', '...rrrr.....', '....rr......'],
  ];
  flames.forEach((rows, i) => {
    mg.rows(144 + i * 12, 0, rows, { r: P.red, y: P.yellow, w: P.white });
    mg.frame(`flame${i}`, 144 + i * 12, 0, 12, 16);
  });
  mg.disc(183, 3, 2, P.waterLight);
  mg.px(182, 2, P.white);
  mg.frame('bubble', 180, 0, 8, 8);
  mg.rows(188, 0, ['..oooo...o', '.owwwwo.oo', 'owwewwwooo', '.owwwwo.oo', '..oooo...o'], { o: P.outline, w: '#7fb8e6', e: P.eye });
  mg.frame('reelfish', 188, 0, 12, 8);
  mg.done();

  // ---- fx ----
  const fx = new PixelCanvas(scene, 'fx', 8 * 14, 8);
  fx.rows(1, 1, ['..y..', '.yyy.', 'yywyy', '.yyy.', '..y..'], { y: P.yellow, w: P.white });
  fx.frame('spark0', 0, 0, 8, 8);
  fx.rows(9, 1, ['..w..', '.....', 'w.y.w', '.....', '..w..'], { y: P.yellow, w: P.white });
  fx.frame('spark1', 8, 0, 8, 8);
  fx.disc(20, 4, 2, P.pathLight);
  fx.frame('dust0', 16, 0, 8, 8);
  fx.px(27, 3, P.pathLight);
  fx.px(29, 5, P.pathLight);
  fx.px(26, 6, P.pathLight);
  fx.frame('dust1', 24, 0, 8, 8);
  [P.pink, P.yellow, P.blue].forEach((c, i) => {
    const x = 32 + i * 16;
    fx.rows(x, 1, ['ww.ww', 'wwoww', '.wow.', 'w.o.w'], { w: c, o: P.outline });
    fx.frame(`bf${i}-0`, x, 0, 8, 8);
    fx.rows(x + 8, 1, ['.....', 'w.o.w', 'wwoww', '.w.w.'], { w: c, o: P.outline });
    fx.frame(`bf${i}-1`, x + 8, 0, 8, 8);
  });
  fx.rect(82, 4, 2, 2, P.yellow);
  fx.frame('firefly', 80, 0, 8, 8);
  fx.rows(89, 1, ['.oo.oo.', 'orroro.', 'orrrrro', '.orrro.', '..oro..', '...o...'], { o: P.outline, r: P.red });
  fx.frame('heart', 88, 0, 8, 8);
  fx.rect(98, 0, 1, 5, P.waterLight);
  fx.px(98, 5, P.water);
  fx.frame('raindrop', 96, 0, 8, 8);
  fx.rows(105, 2, ['.o.', 'ooo', '.o.'], { o: P.white });
  fx.frame('twinkle', 104, 0, 8, 8);
  fx.done();
}
