import Phaser from 'phaser';
import { DEFAULT_OUTFIT, DYES, HAIR_COLORS, type Outfit, type PlayerId } from '@hh/shared';
import { P } from './palette';
import { PixelCanvas, assertRows, replaceRows, type Palette } from './pixel';

export const CHAR_W = 16;
/** 6 rows of head-room for hats above the 22-row body. */
export const HAT_ROOM = 6;
export const CHAR_H = 22 + HAT_ROOM;

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
  xb: { id: 'xb', name: 'xb', hair: '#5ab0ff', hairDark: '#3a8ae6', outfit: '#6fd98a', outfitDark: '#3fb35f', accent: '#3a8ae6', shoes: '#4a5a8a' },
  // qd: the girl. Purple hair, lavender overalls, pink bow.
  qd: { id: 'qd', name: 'qd', hair: '#a56cff', hairDark: '#7d45e0', outfit: '#e3a0ff', outfitDark: '#b96ee6', accent: '#ff7bc8', shoes: '#5a3a8a' },
};

/** Villagers, diners and shopkeepers. */
export const CUSTOMER_LOOKS: CharacterLook[] = [
  { id: 'c0', name: 'Lily', hair: '#f2c14e', hairDark: '#d19a2a', outfit: '#ff8fa3', outfitDark: '#e0607a', accent: '#ffffff', shoes: '#6b3a2a' },
  { id: 'c1', name: 'Old Tom', hair: '#d9d9d9', hairDark: '#b0b0b0', outfit: '#7fc8ff', outfitDark: '#4f9fe0', accent: '#b0b0b0', shoes: '#3b2a3a' },
  { id: 'c2', name: 'Pip', hair: '#ff9a5c', hairDark: '#e0733a', outfit: '#b7f27a', outfitDark: '#83c94a', accent: '#ffe066', shoes: '#6b3a2a' },
  { id: 'c3', name: 'Bo', hair: '#3b2a3a', hairDark: '#241825', outfit: '#ffd86b', outfitDark: '#e0ae3a', accent: '#241825', shoes: '#4a2a3f' },
  { id: 'c4', name: 'Grandma June', hair: '#e8e8f0', hairDark: '#c0c0d0', outfit: '#c9a0ff', outfitDark: '#9a6fe0', accent: '#ff8fcf', shoes: '#4a2a3f' },
  { id: 'c5', name: 'Hana', hair: '#ff6b6b', hairDark: '#d94a4a', outfit: '#7de8c8', outfitDark: '#4fbf9f', accent: '#d94a4a', shoes: '#3b2a3a' },
];

export const SHOPKEEPER_LOOKS: Record<'mabel' | 'rosa' | 'finn' | 'mayor', CharacterLook> = {
  mabel: { id: 'mabel', name: 'Mabel', hair: '#8a5a33', hairDark: '#5e3a1f', outfit: '#6fb8ff', outfitDark: '#3f8fe0', accent: '#ffffff', shoes: '#3b2a3a' },
  rosa: { id: 'rosa', name: 'Rosa', hair: '#ff7bac', hairDark: '#e2569a', outfit: '#ff8fcf', outfitDark: '#e05fa8', accent: '#ffffff', shoes: '#4a2a3f' },
  finn: { id: 'finn', name: 'Finn', hair: '#7bd36a', hairDark: '#4fa84a', outfit: '#ffa94d', outfitDark: '#e07f20', accent: '#4fa84a', shoes: '#6b3a2a' },
  mayor: { id: 'mayor', name: 'Mayor Bea', hair: '#4a4a5a', hairDark: '#2e2e3a', outfit: '#4a4a5a', outfitDark: '#2e2e3a', accent: '#ffd23f', shoes: '#241825' },
};

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
const DOWN_A = replaceRows(DOWN, 19, ['.....okk.bbo....', '.....ooo.kko....', '.........ooo....']);
const DOWN_B = replaceRows(DOWN, 19, ['.....obb.kko....', '.....okk.ooo....', '.....ooo........']);

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
const SIDE_A = replaceRows(SIDE, 19, ['.....obb..bbo...', '.....okk..kko...', '.....ooo..ooo...']);
const SIDE_B = replaceRows(SIDE, 19, ['....obb..bbo....', '....okk..kko....', '....ooo..ooo....']);

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
const UP_A = replaceRows(UP, 19, ['.....okk.bbo....', '.....ooo.kko....', '.........ooo....']);
const UP_B = replaceRows(UP, 19, ['.....obb.kko....', '.....okk.ooo....', '.....ooo........']);

/** Frame order: 0-2 down, 3-5 side (facing right), 6-8 up. Index 0 of each triple is idle. */
export const FRAMES = [DOWN, DOWN_A, DOWN_B, SIDE, SIDE_A, SIDE_B, UP, UP_A, UP_B];

// ---- hats: drawn at y = 0 (6 rows above the body), overlapping the top of the head ----
// Legend: o outline, p primary, q primary dark, w white, y yellow, k pink, g green, r red
type Hat = { down: string[]; side: string[]; p: string; q: string };
const HATS_ART: Record<string, Hat> = {
  straw: {
    p: '#ffd86b',
    q: '#e0ae3a',
    down: ['....oooooooo....', '...oppppppppo...', '...opppppppppo..', '.oooqqqqqqqqooo.', 'oppppppppppppppo', 'oooooooooooooooo'],
    side: ['....oooooooo....', '...oppppppppo...', '...opppppppppo..', '.oooqqqqqqqqooo.', 'oppppppppppppppo', 'oooooooooooooooo'],
  },
  cap: {
    p: '#4f9fe0',
    q: '#2f6fb0',
    down: ['................', '.....oooooo.....', '....oppppppo....', '...oppppppppo...', '..opppppppppoo..', '..ooqqqqqqqqqqo.'],
    side: ['................', '.....oooooo.....', '....oppppppo....', '...oppppppppo...', '...oppppppppooo.', '...oooqqqqqqqqqo'],
  },
  beanie: {
    p: '#ff6b6b',
    q: '#d94a4a',
    down: ['.......oo.......', '......owwo......', '.....oppppo.....', '...opppppppppo..', '..oppppppppppo..', '..oqqqqqqqqqqo..'],
    side: ['.......oo.......', '......owwo......', '.....oppppo.....', '...opppppppppo..', '..oppppppppppo..', '..oqqqqqqqqqqo..'],
  },
  flowercrown: {
    p: '#ff8fcf',
    q: '#3fb36b',
    down: ['................', '................', '...k..y..w..k...', '..okoyooowookoo.', '...qqqqqqqqqqq..', '................'],
    side: ['................', '................', '...k..y..w..k...', '..okoyooowookoo.', '...qqqqqqqqqqq..', '................'],
  },
  chef: {
    p: '#ffffff',
    q: '#dcdcf0',
    down: ['.....oooooo.....', '....owwwwwwo....', '...owwwwwwwwo...', '...owwwwwwwwo...', '...oqqqqqqqqo...', '....oooooooo....'],
    side: ['.....oooooo.....', '....owwwwwwo....', '...owwwwwwwwo...', '...owwwwwwwwo...', '...oqqqqqqqqo...', '....oooooooo....'],
  },
  crown: {
    p: '#ffd23f',
    q: '#e6a800',
    down: ['................', '...o..o..o..o...', '...opopppoppop..', '...opppppppppo..', '...opkppppprpo..', '...oooooooooo...'],
    side: ['................', '...o..o..o..o...', '...opopppoppop..', '...opppppppppo..', '...opkppppprpo..', '...oooooooooo...'],
  },
  bow_big: {
    p: '#ff5c8a',
    q: '#d93a6a',
    down: ['..........oo....', '.........oppo.o.', '........opppoop.', '.........oqqqo..', '..........oo....', '................'],
    side: ['..oo............', '.o.oppo.........', '.poopppo........', '..oqqqo.........', '....oo..........', '................'],
  },
  ears: {
    p: '#ffffff',
    q: '#ffb3d9',
    down: ['....oo....oo....', '...opqo..oqpo...', '...opqo..oqpo...', '...opqo..oqpo...', '...oppo..oppo...', '....oo....oo....'],
    side: ['....oo....oo....', '...opqo..oqpo...', '...opqo..oqpo...', '...opqo..oqpo...', '...oppo..oppo...', '....oo....oo....'],
  },
};

function outfitKey(o: Outfit) {
  return `${o.hat}-${o.accessory}-${o.dye}-${o.hair}`;
}

export function characterTextureKey(look: CharacterLook, outfit: Outfit = DEFAULT_OUTFIT) {
  return `char-${look.id}-${outfitKey(outfit)}`;
}

/** Builds (once) the sprite sheet + animations for a look wearing an outfit. Returns the texture key. */
export function buildCharacterTexture(scene: Phaser.Scene, look: CharacterLook, outfit: Outfit = DEFAULT_OUTFIT) {
  const key = characterTextureKey(look, outfit);
  if (scene.textures.exists(key)) return key;
  const dye = DYES[outfit.dye];
  const hairC = HAIR_COLORS[outfit.hair];
  const pal: Palette = {
    o: P.outline,
    h: hairC.color || look.hair,
    H: hairC.dark || look.hairDark,
    a: look.accent === look.hairDark && hairC.dark ? hairC.dark : look.accent,
    s: P.skin,
    E: P.white,
    e: P.eye,
    c: P.cheek,
    w: P.white,
    b: dye.color || look.outfit,
    B: dye.dark || look.outfitDark,
    k: look.shoes,
  };
  const pc = new PixelCanvas(scene, key, CHAR_W * FRAMES.length, CHAR_H);
  const hat = outfit.hat !== 'none' ? HATS_ART[outfit.hat] : null;
  FRAMES.forEach((rows, i) => {
    assertRows(rows, CHAR_W, 22, `${key} frame ${i}`);
    const x0 = i * CHAR_W;
    pc.rows(x0, HAT_ROOM, rows, pal);
    const facing = i < 3 ? 'down' : i < 6 ? 'side' : 'up';
    // accessories
    if (outfit.accessory === 'glasses') {
      if (facing === 'down') {
        pc.frameRect(x0 + 3, HAT_ROOM + 7, 4, 3, P.outline);
        pc.frameRect(x0 + 9, HAT_ROOM + 7, 4, 3, P.outline);
        pc.px(x0 + 7, HAT_ROOM + 8, P.outline);
        pc.px(x0 + 8, HAT_ROOM + 8, P.outline);
      } else if (facing === 'side') {
        pc.frameRect(x0 + 9, HAT_ROOM + 7, 4, 3, P.outline);
        pc.px(x0 + 8, HAT_ROOM + 8, P.outline);
      }
    }
    if (outfit.accessory === 'scarf') {
      pc.rect(x0 + 4, HAT_ROOM + 12, 8, 2, '#ff6b6b');
      pc.rect(x0 + 4, HAT_ROOM + 12, 8, 1, '#ff9a9a');
      if (facing !== 'up') pc.rect(x0 + 9, HAT_ROOM + 14, 2, 3, '#ff6b6b');
    }
    if (outfit.accessory === 'bag') {
      const bx = facing === 'side' ? x0 + 10 : x0 + 11;
      pc.rect(bx, HAT_ROOM + 14, 4, 4, P.outline);
      pc.rect(bx + 1, HAT_ROOM + 15, 2, 2, P.wood);
      pc.rect(bx - 1, HAT_ROOM + 12, 1, 3, P.woodDark);
    }
    if (hat) {
      const rows2 = facing === 'side' ? hat.side : hat.down;
      pc.rows(x0, 0, rows2, { o: P.outline, p: hat.p, q: hat.q, w: P.white, y: P.yellow, k: P.pink, g: P.leaf, r: P.red });
    }
    pc.frame(i, x0, 0, CHAR_W, CHAR_H);
  });
  pc.done();

  const mk = (name: string, frames: number[], rate = 8, repeat = -1) => {
    const full = `${key}-${name}`;
    if (!scene.anims.exists(full)) {
      scene.anims.create({ key: full, frames: scene.anims.generateFrameNumbers(key, { frames }), frameRate: rate, repeat });
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
