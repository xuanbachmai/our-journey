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
} as const;

export const TILESET_KEY = 'tiles';
const COUNT = 13;

function speckle(pc: PixelCanvas, x0: number, y0: number, base: string, dots: string[], n: number, rnd: () => number) {
  pc.rect(x0, y0, TILE, TILE, base);
  for (let i = 0; i < n; i++) {
    pc.px(x0 + Math.floor(rnd() * TILE), y0 + Math.floor(rnd() * TILE), dots[Math.floor(rnd() * dots.length)]);
  }
}

function flower(pc: PixelCanvas, x: number, y: number, color: string, center: string) {
  pc.px(x, y - 1, color);
  pc.px(x - 1, y, color);
  pc.px(x + 1, y, color);
  pc.px(x, y + 1, color);
  pc.px(x, y, center);
  pc.px(x, y + 2, P.leafDark);
}

export function buildTileset(scene: Phaser.Scene) {
  if (scene.textures.exists(TILESET_KEY)) return;
  const rnd = mulberry32(7);
  const pc = new PixelCanvas(scene, TILESET_KEY, TILE * COUNT, TILE);
  const at = (i: number) => i * TILE;

  // grass variants
  speckle(pc, at(T.GRASS), 0, P.grass, [P.grassLight, P.grassDark], 10, rnd);
  speckle(pc, at(T.GRASS2), 0, P.grass, [P.grassLight, P.grassDark, P.grassLight], 14, rnd);

  speckle(pc, at(T.TUFT), 0, P.grass, [P.grassLight, P.grassDark], 8, rnd);
  for (const [tx, ty] of [
    [4, 9],
    [10, 5],
  ]) {
    const x = at(T.TUFT) + tx;
    pc.px(x, ty, P.grassDeep);
    pc.px(x + 1, ty - 1, P.grassDeep);
    pc.px(x + 2, ty, P.grassDeep);
    pc.px(x + 1, ty, P.grassDark);
    pc.px(x + 1, ty + 1, P.grassDark);
  }

  speckle(pc, at(T.FLOWER), 0, P.grass, [P.grassLight, P.grassDark], 8, rnd);
  flower(pc, at(T.FLOWER) + 4, 5, P.pink, P.yellow);
  flower(pc, at(T.FLOWER) + 11, 10, P.white, P.yellow);

  speckle(pc, at(T.FLOWER2), 0, P.grass, [P.grassLight, P.grassDark], 8, rnd);
  flower(pc, at(T.FLOWER2) + 5, 10, P.yellow, P.orange);
  flower(pc, at(T.FLOWER2) + 11, 4, P.purple, P.white);
  flower(pc, at(T.FLOWER2) + 2, 3, P.red, P.yellow);

  speckle(pc, at(T.PEBBLE), 0, P.grass, [P.grassLight, P.grassDark], 8, rnd);
  pc.rect(at(T.PEBBLE) + 6, 9, 3, 2, '#c9c2c2');
  pc.px(at(T.PEBBLE) + 6, 9, P.white);
  pc.rect(at(T.PEBBLE) + 11, 4, 2, 2, '#c9c2c2');

  speckle(pc, at(T.PATH), 0, P.path, [P.pathLight, P.pathDark, P.pathLight], 14, rnd);

  speckle(pc, at(T.SOIL), 0, P.soil, [P.soilDark, P.soilDark, P.pathLight], 12, rnd);

  // tilled: horizontal ridges
  pc.rect(at(T.TILLED), 0, TILE, TILE, P.tilled);
  for (let y = 1; y < TILE; y += 4) {
    pc.rect(at(T.TILLED), y, TILE, 1, P.tilledDark);
    pc.rect(at(T.TILLED), y + 2, TILE, 1, P.soil);
  }
  pc.rect(at(T.WATERED), 0, TILE, TILE, P.wet);
  for (let y = 1; y < TILE; y += 4) {
    pc.rect(at(T.WATERED), y, TILE, 1, P.wetDark);
    pc.rect(at(T.WATERED), y + 2, TILE, 1, P.tilled);
  }

  // water with little highlights
  pc.rect(at(T.WATER), 0, TILE, TILE, P.water);
  for (let i = 0; i < 5; i++) {
    const x = at(T.WATER) + Math.floor(rnd() * 13);
    const y = Math.floor(rnd() * TILE);
    pc.rect(x, y, 3, 1, P.waterLight);
  }
  for (let i = 0; i < 4; i++) {
    pc.px(at(T.WATER) + Math.floor(rnd() * TILE), Math.floor(rnd() * TILE), P.waterDark);
  }

  speckle(pc, at(T.SAND), 0, P.sand, [P.pathLight, '#fff0c0'], 10, rnd);

  speckle(pc, at(T.CLOVER), 0, P.grass, [P.grassLight, P.grassDark], 8, rnd);
  const cx = at(T.CLOVER) + 8;
  pc.px(cx, 7, P.grassDeep);
  pc.px(cx - 1, 8, P.grassDeep);
  pc.px(cx + 1, 8, P.grassDeep);
  pc.px(cx, 9, P.grassDeep);
  pc.px(cx, 8, P.leafLight);

  for (let i = 0; i < COUNT; i++) pc.frame(i, at(i), 0, TILE, TILE);
  pc.done();
}

export { FLOWER_COLORS };
