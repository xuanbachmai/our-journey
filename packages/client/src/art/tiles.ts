import Phaser from 'phaser';
import { FLOWER_COLORS, P } from './palette';
import { PixelCanvas, mulberry32 } from './pixel';

export const TILE = 16;

export const T = {
  GRASS: 0,
  GRASS2: 1,
  TUFT: 2,
  FLOWER: 3,
  FLOWER2: 4,
  PEBBLE: 5,
  PATH: 6,
  SOIL: 7,
  TILLED: 8,
  WATERED: 9,
  WATER: 10,
  SAND: 11,
  CLOVER: 12,
  COBBLE: 13,
  ROAD: 14,
  FLOOR_WOOD: 15,
  FLOOR_TILE: 16,
  WALL: 17,
  WALL_TOP: 18,
  DARKGRASS: 19,
  DECK: 20,
  FOREST: 21,
  MAT: 22,
  FLOOR_PINK: 23,
  FLOOR_BLUE: 24,
  WALL_DARK: 25,
} as const;

export const TILESET_KEY = 'tiles';
const COUNT = 26;

/**
 * Ground with depth: a soft dither so the base reads as two tones, clumps of
 * light and shade like real turf, and a darker lip along the bottom edge so
 * tiles stack with a hint of relief instead of looking flat.
 */
function speckle(pc: PixelCanvas, x0: number, y0: number, base: string, dots: string[], n: number, rnd: () => number) {
  pc.rect(x0, y0, TILE, TILE, base);
  const light = dots[0] ?? base;
  const shade = dots[dots.length - 1] ?? base;
  // Soft organic two-tone dither so ground reads with natural texture
  for (let y = 0; y < TILE; y++) {
    for (let x = 0; x < TILE; x++) {
      if ((x + y) % 2 === 0 && rnd() < 0.18) pc.px(x0 + x, y0 + y, shade);
      else if ((x * 3 + y) % 5 === 0 && rnd() < 0.12) pc.px(x0 + x, y0 + y, light);
    }
  }
  // Multi-tone clumps: a sun-lit blade tip, mid body, and subtle root shadow
  for (let i = 0; i < n; i++) {
    const cx = x0 + 1 + Math.floor(rnd() * (TILE - 2));
    const cy = y0 + 1 + Math.floor(rnd() * (TILE - 2));
    const color = dots[Math.floor(rnd() * dots.length)];
    pc.px(cx, cy, color);
    if (rnd() < 0.65) pc.px(cx, cy - 1, light);
    if (rnd() < 0.45) pc.px(cx + 1, cy, color);
    if (rnd() < 0.4) pc.px(cx + 1, cy + 1, shade);
  }
}

function flower(pc: PixelCanvas, x: number, y: number, color: string, center: string) {
  // Soft leaf shadow under the blossom
  pc.px(x - 1, y + 2, P.grassDeep);
  pc.px(x + 1, y + 2, P.leafDark);
  pc.px(x, y + 2, P.leaf);
  // Shaded petals + bright top-left petal catchlight
  pc.px(x, y - 1, P.white);
  pc.px(x - 1, y - 1, color);
  pc.px(x - 1, y, color);
  pc.px(x + 1, y, color);
  pc.px(x, y + 1, color);
  pc.px(x + 1, y + 1, color);
  pc.px(x, y, center);
}

export function buildTileset(scene: Phaser.Scene) {
  if (scene.textures.exists(TILESET_KEY)) return;
  const rnd = mulberry32(7);
  const pc = new PixelCanvas(scene, TILESET_KEY, TILE * COUNT, TILE);
  const at = (i: number) => i * TILE;

  speckle(pc, at(T.GRASS), 0, P.grass, [P.grassLight, P.grassDark, P.grassDeep], 12, rnd);
  speckle(pc, at(T.GRASS2), 0, P.grass, [P.grassLight, P.grassDark, P.grassLight], 16, rnd);
  speckle(pc, at(T.TUFT), 0, P.grass, [P.grassLight, P.grassDark], 10, rnd);
  for (const [tx, ty] of [
    [4, 9],
    [10, 5],
  ]) {
    const x = at(T.TUFT) + tx;
    pc.px(x, ty, P.grassDeep);
    pc.px(x + 1, ty - 1, P.grassLight);
    pc.px(x, ty - 1, P.grass);
    pc.px(x + 2, ty, P.grassDeep);
    pc.px(x + 1, ty, P.grassDark);
    pc.px(x + 1, ty + 1, P.grassDeep);
  }
  speckle(pc, at(T.FLOWER), 0, P.grass, [P.grassLight, P.grassDark], 9, rnd);
  flower(pc, at(T.FLOWER) + 4, 5, P.pink, P.yellow);
  flower(pc, at(T.FLOWER) + 11, 10, P.white, P.yellow);
  speckle(pc, at(T.FLOWER2), 0, P.grass, [P.grassLight, P.grassDark], 9, rnd);
  flower(pc, at(T.FLOWER2) + 5, 10, P.yellow, P.orange);
  flower(pc, at(T.FLOWER2) + 11, 4, P.purple, P.white);
  flower(pc, at(T.FLOWER2) + 2, 3, P.red, P.yellow);
  speckle(pc, at(T.PEBBLE), 0, P.grass, [P.grassLight, P.grassDark], 9, rnd);
  pc.rect(at(T.PEBBLE) + 6, 10, 3, 2, P.grassDeep);
  pc.rect(at(T.PEBBLE) + 6, 9, 3, 2, '#c9c2c2');
  pc.px(at(T.PEBBLE) + 6, 9, P.white);
  pc.rect(at(T.PEBBLE) + 11, 5, 2, 2, P.grassDeep);
  pc.rect(at(T.PEBBLE) + 11, 4, 2, 2, '#c9c2c2');
  pc.px(at(T.PEBBLE) + 11, 4, P.white);
  speckle(pc, at(T.PATH), 0, P.path, [P.pathLight, P.pathDark, P.pathLight], 15, rnd);
  speckle(pc, at(T.SOIL), 0, P.soil, [P.pathLight, P.soilDark, P.soilDark], 14, rnd);
  pc.rect(at(T.TILLED), 0, TILE, TILE, P.tilled);
  for (let y = 1; y < TILE; y += 4) {
    pc.rect(at(T.TILLED), y, TILE, 1, P.tilledDark);
    pc.rect(at(T.TILLED), y + 1, TILE, 1, P.pathDark);
    pc.rect(at(T.TILLED), y + 2, TILE, 1, P.soil);
  }
  // crumbs of earth, so the furrows read as broken ground and not as stripes
  for (let i = 0; i < 12; i++) pc.px(at(T.TILLED) + Math.floor(rnd() * TILE), Math.floor(rnd() * TILE), i % 3 ? P.tilledDark : P.pathLight);
  pc.rect(at(T.WATERED), 0, TILE, TILE, P.wet);
  for (let y = 1; y < TILE; y += 4) {
    pc.rect(at(T.WATERED), y, TILE, 1, P.wetDark);
    pc.rect(at(T.WATERED), y + 2, TILE, 1, P.tilled);
  }
  for (let i = 0; i < 12; i++) pc.px(at(T.WATERED) + Math.floor(rnd() * TILE), Math.floor(rnd() * TILE), i % 3 ? P.wetDark : P.tilled);
  // water: deeper towards the bottom, with ripples and a few sun sparkles
  pc.rect(at(T.WATER), 0, TILE, TILE, P.water);
  for (let y = 0; y < TILE; y++) {
    const deep = y / TILE;
    for (let x = 0; x < TILE; x++) {
      if ((x + y) % 2 === 0 && rnd() < deep * 0.55) pc.px(at(T.WATER) + x, y, P.waterDark);
      else if ((x - y + 16) % 4 === 0 && rnd() < (1 - deep) * 0.25) pc.px(at(T.WATER) + x, y, P.waterLight);
    }
  }
  for (let i = 0; i < 6; i++) {
    const rx = at(T.WATER) + Math.floor(rnd() * 12);
    const ry = Math.floor(rnd() * TILE);
    pc.rect(rx, ry, 3, 1, P.waterLight);
    if (ry + 1 < TILE) pc.rect(rx + 1, ry + 1, 2, 1, P.waterDark);
  }
  for (let i = 0; i < 3; i++) {
    const sx = at(T.WATER) + 1 + Math.floor(rnd() * 13);
    const sy = 1 + Math.floor(rnd() * 13);
    pc.px(sx, sy, P.white);
    pc.px(sx + 1, sy, P.waterLight);
  }
  speckle(pc, at(T.SAND), 0, P.sand, ['#fff0c0', P.pathLight, '#d9b87a'], 12, rnd);
  speckle(pc, at(T.CLOVER), 0, P.grass, [P.grassLight, P.grassDark], 9, rnd);
  const cx = at(T.CLOVER) + 8;
  pc.px(cx, 7, P.grassDeep);
  pc.px(cx - 1, 8, P.grassDeep);
  pc.px(cx + 1, 8, P.grassDeep);
  pc.px(cx, 9, P.grassDeep);
  pc.px(cx, 8, P.leafLight);

  // cobblestone: rounded beveled stones on recessed mortar
  pc.rect(at(T.COBBLE), 0, TILE, TILE, '#9e948c');
  for (const [sx, sy, w, h] of [
    [1, 1, 6, 5],
    [9, 1, 6, 5],
    [1, 8, 4, 6],
    [7, 8, 8, 6],
  ]) {
    pc.rect(at(T.COBBLE) + sx, sy, w, h, '#d9d0c8');
    pc.rect(at(T.COBBLE) + sx, sy, w, 1, '#f4efe9');
    pc.rect(at(T.COBBLE) + sx, sy, 1, h, '#ebe4dc');
    pc.rect(at(T.COBBLE) + sx, sy + h - 1, w, 1, '#b8afa7');
    pc.px(at(T.COBBLE) + sx + w - 1, sy + h - 1, '#9e948c');
  }
  // dirt road
  speckle(pc, at(T.ROAD), 0, '#cfa46e', ['#dcb27e', '#c39558', '#b9884c'], 18, rnd);
  // wood floor with warm bevels & grain
  pc.rect(at(T.FLOOR_WOOD), 0, TILE, TILE, '#d9a66a');
  for (let y = 0; y < TILE; y += 4) {
    pc.rect(at(T.FLOOR_WOOD), y, TILE, 1, '#b88244');
    pc.rect(at(T.FLOOR_WOOD), y + 1, TILE, 1, '#e6b87d');
    pc.px(at(T.FLOOR_WOOD) + ((y / 4) % 2 ? 4 : 11), y + 2, '#c48f52');
  }
  // tile floor
  pc.rect(at(T.FLOOR_TILE), 0, TILE, TILE, '#f0e6d8');
  pc.rect(at(T.FLOOR_TILE), 0, 8, 8, '#e4d8c6');
  pc.rect(at(T.FLOOR_TILE) + 8, 8, 8, 8, '#e4d8c6');
  pc.rect(at(T.FLOOR_TILE), 0, TILE, 1, '#faf4ec');
  pc.rect(at(T.FLOOR_TILE), 7, TILE, 1, '#cfc0ac');
  pc.rect(at(T.FLOOR_TILE) + 7, 0, 1, TILE, '#cfc0ac');
  // pink / blue floors for the shops
  pc.rect(at(T.FLOOR_PINK), 0, TILE, TILE, '#f7dbe8');
  pc.rect(at(T.FLOOR_PINK), 0, 8, 8, '#f0c9dc');
  pc.rect(at(T.FLOOR_PINK) + 8, 8, 8, 8, '#f0c9dc');
  pc.rect(at(T.FLOOR_BLUE), 0, TILE, TILE, '#d8e8f7');
  pc.rect(at(T.FLOOR_BLUE), 0, 8, 8, '#c6dbf0');
  pc.rect(at(T.FLOOR_BLUE) + 8, 8, 8, 8, '#c6dbf0');
  // wall (cream with wainscot) and wall top (dark edge)
  pc.rect(at(T.WALL), 0, TILE, TILE, P.wall);
  pc.rect(at(T.WALL), 0, TILE, 1, '#fffaf0');
  pc.rect(at(T.WALL), 10, TILE, 1, P.wallDark);
  pc.rect(at(T.WALL), 11, TILE, 5, P.wood);
  pc.rect(at(T.WALL), 11, TILE, 1, P.woodLight);
  pc.rect(at(T.WALL), 15, TILE, 1, P.woodDark);
  for (let x = 3; x < TILE; x += 4) pc.rect(at(T.WALL) + x, 12, 1, 3, P.woodDark);
  pc.rect(at(T.WALL_TOP), 0, TILE, TILE, '#5a3a4f');
  pc.rect(at(T.WALL_TOP), 0, TILE, 2, '#7a5a6f');
  pc.rect(at(T.WALL_TOP), 14, TILE, 2, P.outline);
  pc.rect(at(T.WALL_DARK), 0, TILE, TILE, '#e8d7c0');
  pc.rect(at(T.WALL_DARK), 11, TILE, 5, P.woodDark);
  pc.rect(at(T.WALL_DARK), 11, TILE, 1, P.wood);
  // dark grass / forest floor
  speckle(pc, at(T.DARKGRASS), 0, P.grassDark, [P.grass, P.grassDeep], 14, rnd);
  speckle(pc, at(T.FOREST), 0, '#5aa33a', ['#6fb84a', '#4a8a2f', '#8a5a33'], 16, rnd);
  pc.px(at(T.FOREST) + 3, 12, '#c98b4e');
  pc.px(at(T.FOREST) + 11, 4, '#c98b4e');
  // wooden deck
  pc.rect(at(T.DECK), 0, TILE, TILE, P.wood);
  for (let y = 0; y < TILE; y += 4) {
    pc.rect(at(T.DECK), y, TILE, 1, P.woodLight);
    pc.rect(at(T.DECK), y + 3, TILE, 1, P.woodDark);
  }
  pc.rect(at(T.DECK) + 7, 0, 1, TILE, P.woodDark);
  // door mat
  pc.rect(at(T.MAT), 0, TILE, TILE, '#d9a66a');
  pc.rect(at(T.MAT) + 2, 4, 12, 9, P.outline);
  pc.rect(at(T.MAT) + 3, 5, 10, 7, P.red);
  pc.rect(at(T.MAT) + 4, 6, 8, 5, P.pink);

  for (let i = 0; i < COUNT; i++) pc.frame(i, at(i), 0, TILE, TILE);
  pc.done();
}

export { FLOWER_COLORS };
