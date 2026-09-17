import Phaser from 'phaser';
import type { PlayerId } from '@hh/shared';
import { P } from './palette';
import { PixelCanvas, assertRows, replaceRows, type Palette } from './pixel';

export const CHAR_W = 16;
export const CHAR_H = 22;

export interface CharacterLook {
  id: string;
  name: string;
  hair: string;
  hairDark: string;
  outfit: string;
  outfitDark: string;
  accent: string;
  shoes: string;
}

export const LOOKS: Record<PlayerId, CharacterLook> = {
  // xb: the boy. Blue hair, green overalls, no bow (accent pixels become hair shading).
  xb: {
    id: 'xb',
    name: 'xb',
    hair: '#5ab0ff',
    hairDark: '#3a8ae6',
    outfit: '#6fd98a',
    outfitDark: '#3fb35f',
    accent: '#3a8ae6',
    shoes: '#4a5a8a',
  },
  // qd: the girl. Purple hair, lavender overalls, pink bow.
  qd: {
    id: 'qd',
    name: 'qd',
    hair: '#a56cff',
    hairDark: '#7d45e0',
    outfit: '#e3a0ff',
    outfitDark: '#b96ee6',
    accent: '#ff7bc8',
    shoes: '#5a3a8a',
  },
};

/** Villagers who come to buy food. Random-ish cheerful palettes. */
export const CUSTOMER_LOOKS: CharacterLook[] = [
  { id: 'c0', name: '', hair: '#f2c14e', hairDark: '#d19a2a', outfit: '#ff8fa3', outfitDark: '#e0607a', accent: '#ffffff', shoes: '#6b3a2a' },
  { id: 'c1', name: '', hair: '#6b4a2a', hairDark: '#4a3018', outfit: '#7fc8ff', outfitDark: '#4f9fe0', accent: '#4a3018', shoes: '#3b2a3a' },
  { id: 'c2', name: '', hair: '#ff9a5c', hairDark: '#e0733a', outfit: '#b7f27a', outfitDark: '#83c94a', accent: '#ffe066', shoes: '#6b3a2a' },
  { id: 'c3', name: '', hair: '#3b2a3a', hairDark: '#241825', outfit: '#ffd86b', outfitDark: '#e0ae3a', accent: '#241825', shoes: '#4a2a3f' },
  { id: 'c4', name: '', hair: '#d9d9d9', hairDark: '#b0b0b0', outfit: '#c9a0ff', outfitDark: '#9a6fe0', accent: '#ff8fcf', shoes: '#4a2a3f' },
  { id: 'c5', name: '', hair: '#ff6b6b', hairDark: '#d94a4a', outfit: '#7de8c8', outfitDark: '#4fbf9f', accent: '#d94a4a', shoes: '#3b2a3a' },
];

// Legend: o outline, h hair, H hair shade, a accessory, s skin, E eye shine, e eye,
// c cheek, w shirt, b outfit, B outfit shade, k shoes, . transparent

const DOWN: string[] = [
  '......oooo......',
  '....oohhhhoo....',
  '...ohhhhhhaao...',
  '..ohhhhhhhaaho..',
  '..ohhhhhhhhhho..',
  '..ohhhsssshhho..',
  '..ohssssssssho..',
  '..osEessssEeso..',
  '..oseesssseeso..',
  '..oscsssssscso..',
  '...ossssssssso..',
  '....oossssoo....',
  '......oooo......',
  '....owbwwbwo....',
  '..osobbbbbboso..',
  '..osobbBBbboso..',
  '..osobbbbbboso..',
  '....oBbbbbBo....',
  '....oobbbboo....',
  '.....obb.bbo....',
  '.....okk.kko....',
  '.....ooo.ooo....',
];

const DOWN_A = replaceRows(DOWN, 19, [
  '.....okk.bbo....',
  '.....ooo.kko....',
  '.........ooo....',
]);
const DOWN_B = replaceRows(DOWN, 19, [
  '.....obb.kko....',
  '.....okk.ooo....',
  '.....ooo........',
]);

const SIDE: string[] = [
  '......oooo......',
  '....oohhhhoo....',
  '...oaahhhhhho...',
  '..ohaahhhhhhho..',
  '..ohhhhhhhhhho..',
  '..ohhhhhhsssso..',
  '..ohhhhhssssso..',
  '..ohhhhhssEeso..',
  '..ohhhhhsseeso..',
  '..ohhhhhsscsso..',
  '...ohhhhsssso...',
  '....oohsssoo....',
  '......oooo......',
  '....obbwbbbo....',
  '....obbsbbbo....',
  '....obbsbbBo....',
  '....obbsbbbo....',
  '....oBbbbbBo....',
  '....oobbbboo....',
  '.....obbbo......',
  '.....okkko......',
  '.....ooooo......',
];

const SIDE_A = replaceRows(SIDE, 19, [
  '.....obb..bbo...',
  '.....okk..kko...',
  '.....ooo..ooo...',
]);
const SIDE_B = replaceRows(SIDE, 19, [
  '....obb..bbo....',
  '....okk..kko....',
  '....ooo..ooo....',
]);

const UP: string[] = [
  '......oooo......',
  '....oohhhhoo....',
  '...ohhhhhhhho...',
  '..ohhhhhhhhhho..',
  '..ohhhhhhhhhho..',
  '..ohhhhhhhhhho..',
  '..ohhhhhhhhhho..',
  '..ohhhhhhhaaho..',
  '..ohhhhhhhaaho..',
  '..ohHhhhhhhhho..',
  '...ohHHhhhhho...',
  '....oohhhhoo....',
  '......oooo......',
  '....obbbbbbo....',
  '..osobbbbbboso..',
  '..osobbbbbboso..',
  '..osobbbbbboso..',
  '....oBbbbbBo....',
  '....oobbbboo....',
  '.....obb.bbo....',
  '.....okk.kko....',
  '.....ooo.ooo....',
];

const UP_A = replaceRows(UP, 19, [
  '.....okk.bbo....',
  '.....ooo.kko....',
  '.........ooo....',
]);
const UP_B = replaceRows(UP, 19, [
  '.....obb.kko....',
  '.....okk.ooo....',
  '.....ooo........',
]);

/** Frame order: 0-2 down, 3-5 side (facing right), 6-8 up. Index 0 of each triple is idle. */
export const FRAMES = [DOWN, DOWN_A, DOWN_B, SIDE, SIDE_A, SIDE_B, UP, UP_A, UP_B];

export function buildCharacterTexture(scene: Phaser.Scene, look: CharacterLook) {
  const key = `char-${look.id}`;
  if (scene.textures.exists(key)) return key;
  const pal: Palette = {
    o: P.outline,
    h: look.hair,
    H: look.hairDark,
    a: look.accent,
    s: P.skin,
    E: P.white,
    e: P.eye,
    c: P.cheek,
    w: P.white,
    b: look.outfit,
    B: look.outfitDark,
    k: look.shoes,
  };
  const pc = new PixelCanvas(scene, key, CHAR_W * FRAMES.length, CHAR_H);
  FRAMES.forEach((rows, i) => {
    assertRows(rows, CHAR_W, CHAR_H, `${key} frame ${i}`);
    pc.rows(i * CHAR_W, 0, rows, pal);
    pc.frame(i, i * CHAR_W, 0, CHAR_W, CHAR_H);
  });
  pc.done();

  const mk = (name: string, frames: number[], rate = 8, repeat = -1) => {
    const full = `${key}-${name}`;
    if (!scene.anims.exists(full)) {
      scene.anims.create({
        key: full,
        frames: scene.anims.generateFrameNumbers(key, { frames }),
        frameRate: rate,
        repeat,
      });
    }
  };
  mk('idle-down', [0], 1);
  mk('idle-side', [3], 1);
  mk('idle-up', [6], 1);
  mk('walk-down', [1, 0, 2, 0]);
  mk('walk-side', [4, 3, 5, 3]);
  mk('walk-up', [7, 6, 8, 6]);
  return key;
}
