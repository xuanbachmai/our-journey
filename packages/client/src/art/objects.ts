import Phaser from 'phaser';
import { CROPS, CROP_IDS, RECIPE_IDS, RECIPES, type CropId } from '@hh/shared';
import { P } from './palette';
import { PixelCanvas, mulberry32 } from './pixel';

export const TREE_W = 32;
export const TREE_H = 40;
export const HOUSE_W = 112;
export const HOUSE_H = 104;
export const STALL_W = 48;
export const STALL_H = 44;
export const KITCHEN_W = 48;
export const KITCHEN_H = 40;
export const COUNTER_W = 32;
export const COUNTER_H = 26;
export const COOP_W = 48;
export const COOP_H = 40;

function tree(pc: PixelCanvas, x0: number, y0: number, leaf: string, light: string, dark: string, rnd: () => number) {
  pc.rect(x0 + 12, y0 + 27, 8, 12, P.outline);
  pc.rect(x0 + 13, y0 + 27, 6, 11, P.trunk);
  pc.rect(x0 + 13, y0 + 27, 2, 11, P.trunkDark);
  pc.disc(x0 + 16, y0 + 17, 12, P.outline);
  pc.disc(x0 + 9, y0 + 20, 8, P.outline);
  pc.disc(x0 + 23, y0 + 20, 8, P.outline);
  pc.disc(x0 + 16, y0 + 10, 9, P.outline);
  pc.disc(x0 + 16, y0 + 17, 11, dark);
  pc.disc(x0 + 9, y0 + 20, 7, dark);
  pc.disc(x0 + 23, y0 + 20, 7, dark);
  pc.disc(x0 + 16, y0 + 10, 8, dark);
  pc.disc(x0 + 15, y0 + 15, 9, leaf);
  pc.disc(x0 + 9, y0 + 19, 5, leaf);
  pc.disc(x0 + 22, y0 + 18, 5, leaf);
  pc.disc(x0 + 15, y0 + 9, 6, leaf);
  pc.disc(x0 + 13, y0 + 12, 4, light);
  pc.disc(x0 + 21, y0 + 15, 2, light);
  pc.disc(x0 + 9, y0 + 18, 2, light);
  for (let i = 0; i < 7; i++) pc.px(x0 + 6 + Math.floor(rnd() * 20), y0 + 6 + Math.floor(rnd() * 18), light);
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
    pc.px(x, 13, P.outline);
    pc.px(x + 5, 13, P.outline);
    pc.px(x, 14, P.outline);
    pc.px(x + 5, 14, P.outline);
  }
  pc.rect(16, 0, 16, 6, P.outline);
  pc.rect(17, 1, 14, 4, P.cream);
  pc.rect(19, 2, 2, 2, P.red);
  pc.rect(23, 2, 2, 2, P.orange);
  pc.rect(27, 2, 2, 2, P.pink);
}

function kitchen(pc: PixelCanvas) {
  // wooden counter body
  pc.rect(0, 16, 48, 24, P.outline);
  pc.rect(1, 17, 46, 22, P.wood);
  pc.rect(1, 17, 46, 3, P.woodLight);
  pc.rect(1, 36, 46, 2, P.woodDark);
  // stove on the right: grey top with two burners
  pc.rect(24, 12, 22, 8, P.outline);
  pc.rect(25, 13, 20, 6, '#8d8fa3');
  pc.disc(30, 16, 2, P.outline);
  pc.disc(30, 16, 1, P.red);
  pc.disc(39, 16, 2, P.outline);
  pc.disc(39, 16, 1, P.red);
  // pot on the left burner
  pc.rect(25, 4, 12, 9, P.outline);
  pc.rect(26, 5, 10, 7, '#6a6f8a');
  pc.rect(26, 5, 10, 2, '#9a9fbd');
  pc.rect(23, 6, 2, 2, P.outline);
  pc.rect(37, 6, 2, 2, P.outline);
  // steam
  pc.px(29, 2, P.white);
  pc.px(31, 0, P.white);
  pc.px(33, 2, P.white);
  // cutting board with tomato on the left
  pc.rect(4, 12, 16, 6, P.outline);
  pc.rect(5, 13, 14, 4, P.woodLight);
  pc.disc(10, 12, 2, P.outline);
  pc.disc(10, 12, 1, P.red);
  pc.rect(14, 10, 4, 1, '#c9c9d9');
  pc.rect(17, 9, 2, 1, P.outline);
  // hanging pan and hood posts
  pc.rect(2, 0, 2, 16, P.outline);
  pc.rect(44, 0, 2, 12, P.outline);
  pc.rect(2, 0, 44, 2, P.outline);
  pc.rect(3, 1, 42, 1, P.woodDark);
  pc.rect(8, 2, 1, 3, P.outline);
  pc.disc(8, 8, 3, P.outline);
  pc.disc(8, 8, 2, '#8d8fa3');
  pc.rect(9, 5, 1, 3, P.outline);
  // cupboard doors
  pc.rect(6, 24, 10, 10, P.outlineSoft);
  pc.rect(32, 24, 10, 10, P.outlineSoft);
  pc.px(14, 29, P.coin);
  pc.px(33, 29, P.coin);
}

function counter(pc: PixelCanvas) {
  // small roof
  pc.rect(0, 0, 32, 6, P.outline);
  for (let x = 1; x < 31; x++) pc.rect(x, 1, 1, 4, Math.floor((x - 1) / 5) % 2 === 0 ? P.mint : P.awningWhite);
  pc.rect(2, 6, 2, 8, P.outline);
  pc.rect(28, 6, 2, 8, P.outline);
  // counter body
  pc.rect(0, 13, 32, 13, P.outline);
  pc.rect(1, 14, 30, 11, P.wood);
  pc.rect(1, 14, 30, 2, P.woodLight);
  pc.rect(1, 23, 30, 1, P.woodDark);
  // little sign "OPEN"
  pc.rect(11, 7, 10, 6, P.outline);
  pc.rect(12, 8, 8, 4, P.cream);
  pc.rect(13, 9, 2, 2, P.red);
  pc.rect(16, 9, 3, 2, P.leaf);
}

function coop(pc: PixelCanvas) {
  // red barn-style coop
  pc.rect(4, 16, 40, 24, P.outline);
  pc.rect(5, 17, 38, 22, '#e8635a');
  pc.rect(5, 17, 38, 2, '#ff8a80');
  for (let y = 0; y < 16; y++) {
    const inset = Math.max(0, 8 - y / 2);
    pc.rect(inset, y + 2, 48 - inset * 2, 1, P.outline);
    if (y > 1) pc.rect(inset + 2, y + 2, 48 - inset * 2 - 4, 1, y % 4 < 2 ? P.woodDark : P.wood);
  }
  pc.rect(0, 16, 48, 2, P.outline);
  // door
  pc.rect(19, 24, 10, 16, P.outline);
  pc.rect(20, 25, 8, 14, P.woodDark);
  pc.rect(20, 25, 8, 1, P.wood);
  // round window with a chicken face
  pc.disc(12, 26, 5, P.outline);
  pc.disc(12, 26, 4, P.window);
  pc.disc(12, 27, 2, P.white);
  pc.px(13, 26, P.orange);
  // nest box
  pc.rect(32, 28, 10, 8, P.outline);
  pc.rect(33, 29, 8, 6, P.woodLight);
  pc.disc(36, 31, 1, P.white);
  pc.disc(39, 31, 1, P.white);
}

function chicken(pc: PixelCanvas, x0: number, peck: boolean) {
  const rows = peck
    ? ['....oo......', '...owwo.....', '..owwwwo....', '.owwwwwwoo..', 'owwwwwwwoRo.', 'owwwwwwwoeo.', '.owwwwwwoBo.', '..oooooo....', '...y..y.....', '...yy.yy....']
    : ['.......oo...', '......oRRo..', '......oweo..', '.......ooB..', '..oooowwo...', '.owwwwwwo...', 'owwwwwwwo...', 'owwwwwwo....', '.oooooo.....', '..y..y......'];
  pc.rows(x0, 2, rows, { o: P.outline, w: P.white, R: P.red, e: P.eye, B: P.orange, y: P.orange });
}

function dishIcon(pc: PixelCanvas, x0: number, color: string, light: string) {
  pc.disc(x0 + 6, 7, 5, P.outline);
  pc.disc(x0 + 6, 7, 4, '#f4f4ff');
  pc.disc(x0 + 6, 6, 3, P.outline);
  pc.disc(x0 + 6, 6, 2, color);
  pc.px(x0 + 5, 5, light);
}

export function buildObjectTextures(scene: Phaser.Scene) {
  if (scene.textures.exists('trees')) return;
  const rnd = mulberry32(21);

  const trees = new PixelCanvas(scene, 'trees', TREE_W * 4, TREE_H);
  tree(trees, 0, 0, P.leaf, P.leafLight, P.leafDark, rnd);
  tree(trees, TREE_W, 0, '#3aa84a', P.leaf, '#2b7f38', rnd);
  tree(trees, TREE_W * 2, 0, P.blossom, P.blossomLight, P.blossomDark, rnd);
  tree(trees, TREE_W * 3, 0, '#ffc2df', '#fff0f7', P.blossom, rnd);
  for (let i = 0; i < 4; i++) trees.frame(i, i * TREE_W, 0, TREE_W, TREE_H);
  trees.done();

  const h = new PixelCanvas(scene, 'house', HOUSE_W, HOUSE_H);
  house(h);
  h.done();

  const st = new PixelCanvas(scene, 'stall', STALL_W, STALL_H);
  stall(st);
  st.done();

  const k = new PixelCanvas(scene, 'kitchen', KITCHEN_W, KITCHEN_H);
  kitchen(k);
  k.done();

  const ct = new PixelCanvas(scene, 'counter', COUNTER_W, COUNTER_H);
  counter(ct);
  ct.done();

  const cp = new PixelCanvas(scene, 'coop', COOP_W, COOP_H);
  coop(cp);
  cp.done();

  const ch = new PixelCanvas(scene, 'chicken', 24, 12);
  chicken(ch, 0, false);
  chicken(ch, 12, true);
  ch.frame(0, 0, 0, 12, 12);
  ch.frame(1, 12, 0, 12, 12);
  ch.done();

  const f = new PixelCanvas(scene, 'fence', 32, 16);
  // horizontal
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
  // post
  f.rect(22, 2, 4, 14, P.outline);
  f.rect(23, 3, 2, 12, P.white);
  f.px(23, 1, P.outline);
  f.px(24, 1, P.outline);
  f.px(23, 2, P.white);
  f.px(24, 2, P.white);
  f.frame(0, 0, 0, 16, 16);
  f.frame(1, 16, 0, 16, 16);
  f.done();

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

  // decor: flower bed strip, sprinkler, bobber
  const dec = new PixelCanvas(scene, 'decor', 48, 16);
  dec.rect(0, 10, 16, 5, P.outline);
  dec.rect(1, 11, 14, 3, P.woodDark);
  [P.pink, P.yellow, P.purple, P.white, P.red].forEach((c, i) => {
    dec.px(2 + i * 3, 8, c);
    dec.px(1 + i * 3, 9, c);
    dec.px(3 + i * 3, 9, c);
    dec.px(2 + i * 3, 9, P.yellow);
    dec.px(2 + i * 3, 10, P.leaf);
  });
  dec.frame('flowerbed', 0, 0, 16, 16);
  dec.rect(22, 6, 4, 10, P.outline);
  dec.rect(23, 7, 2, 8, '#8d8fa3');
  dec.rect(20, 4, 8, 3, P.outline);
  dec.rect(21, 5, 6, 1, P.blue);
  dec.px(24, 2, P.waterLight);
  dec.px(20, 3, P.waterLight);
  dec.px(28, 3, P.waterLight);
  dec.frame('sprinkler', 16, 0, 16, 16);
  dec.disc(40, 8, 3, P.outline);
  dec.disc(40, 8, 2, P.red);
  dec.rect(38, 8, 5, 2, P.white);
  dec.frame('bobber', 32, 0, 16, 16);
  dec.done();

  // crops (4 stages each)
  const crops = new PixelCanvas(scene, 'crops', 16 * 4 * CROP_IDS.length, 16);
  CROP_IDS.forEach((id, i) => cropFrames(crops, i * 64, id));
  crops.done();

  // 12x12 icons, laid out in a row
  const iconDraws: [string, (x0: number) => void][] = [];
  CROP_IDS.forEach((id) => iconDraws.push([`crop-${id}`, (x0) => produceIcon(icons, x0, id)]));
  CROP_IDS.forEach((id) =>
    iconDraws.push([
      `seed-${id}`,
      (x0) => {
        icons.rect(x0 + 2, 1, 8, 10, P.outline);
        icons.rect(x0 + 3, 2, 6, 8, P.cream);
        icons.rect(x0 + 3, 2, 6, 2, CROPS[id].color);
        icons.rect(x0 + 5, 5, 2, 2, CROPS[id].color);
        icons.px(x0 + 4, 8, P.woodDark);
        icons.px(x0 + 7, 8, P.woodDark);
      },
    ]),
  );
  RECIPE_IDS.forEach((id) => iconDraws.push([`dish-${id}`, (x0) => dishIcon(icons, x0, RECIPES[id].color, RECIPES[id].colorLight)]));
  iconDraws.push([
    'coin',
    (x0) => {
      icons.disc(x0 + 6, 6, 5, P.outline);
      icons.disc(x0 + 6, 6, 4, P.coin);
      icons.disc(x0 + 6, 6, 2, P.coinDark);
      icons.px(x0 + 4, 4, P.white);
    },
  ]);
  iconDraws.push([
    'heart',
    (x0) => {
      icons.rows(x0 + 2, 2, ['.oo.oo.', 'orroro.', 'orrrrro', '.orrro.', '..oro..', '...o...'], { o: P.outline, r: P.red });
      icons.px(x0 + 4, 3, P.pink);
    },
  ]);
  iconDraws.push(['drop', (x0) => icons.rows(x0 + 3, 1, ['..o..', '.owo.', 'owwwo', 'olwwo', '.ooo.'], { o: P.outline, w: P.water, l: P.waterLight })]);
  iconDraws.push(['star', (x0) => icons.rows(x0 + 3, 3, ['..y..', '.yyy.', 'yywyy', '.yyy.', '..y..'], { y: P.yellow, w: P.white })]);
  iconDraws.push([
    'egg',
    (x0) => {
      icons.disc(x0 + 6, 7, 4, P.outline);
      icons.disc(x0 + 6, 5, 3, P.outline);
      icons.disc(x0 + 6, 7, 3, '#fff6e0');
      icons.disc(x0 + 6, 5, 2, '#fff6e0');
      icons.px(x0 + 5, 4, P.white);
    },
  ]);
  iconDraws.push([
    'fish',
    (x0) => {
      icons.rows(x0 + 1, 3, ['..oooo...o', '.owwwwo.oo', 'owwewwwooo', '.owwwwo.oo', '..oooo...o'], { o: P.outline, w: '#7fb8e6', e: P.eye });
      icons.px(x0 + 3, 4, P.waterLight);
    },
  ]);
  iconDraws.push([
    'rod',
    (x0) => {
      for (let i = 0; i < 9; i++) icons.px(x0 + 2 + i, 10 - i, P.woodDark);
      icons.px(x0 + 10, 2, P.outline);
      icons.rect(x0 + 10, 3, 1, 5, P.white);
      icons.disc(x0 + 10, 9, 1, P.red);
    },
  ]);
  iconDraws.push([
    'plate',
    (x0) => {
      icons.disc(x0 + 6, 6, 5, P.outline);
      icons.disc(x0 + 6, 6, 4, '#f4f4ff');
      icons.disc(x0 + 6, 6, 2, '#dcdcf0');
    },
  ]);
  iconDraws.push(['flame', (x0) => icons.rows(x0 + 3, 1, ['..r..', '.rrr.', 'rryrr', 'ryyyr', '.ryr.', '..o..'], { r: P.red, y: P.yellow, o: P.outline })]);
  iconDraws.push([
    'flower',
    (x0) => {
      icons.disc(x0 + 6, 5, 3, P.pink);
      icons.disc(x0 + 6, 5, 1, P.yellow);
      icons.rect(x0 + 6, 8, 1, 3, P.leafDark);
      icons.px(x0 + 7, 9, P.leaf);
    },
  ]);
  iconDraws.push([
    'chicken',
    (x0) => {
      icons.disc(x0 + 6, 7, 4, P.outline);
      icons.disc(x0 + 6, 7, 3, P.white);
      icons.px(x0 + 8, 4, P.red);
      icons.px(x0 + 9, 6, P.orange);
      icons.px(x0 + 7, 6, P.eye);
    },
  ]);
  iconDraws.push(['dots', (x0) => icons.rows(x0 + 2, 5, ['o.o.o', 'o.o.o'], { o: P.outline })]);
  iconDraws.push([
    'book',
    (x0) => {
      icons.rect(x0 + 2, 1, 8, 10, P.outline);
      icons.rect(x0 + 3, 2, 6, 8, P.mint);
      icons.rect(x0 + 4, 2, 1, 8, P.white);
      icons.rect(x0 + 6, 4, 2, 1, P.outline);
      icons.rect(x0 + 6, 6, 2, 1, P.outline);
    },
  ]);
  iconDraws.push([
    'sound',
    (x0) => {
      icons.rows(x0 + 2, 2, ['..o.....', '.oo.o...', 'ooo..o..', 'ooo.o.o.', 'ooo..o..', '.oo.o...', '..o.....'], { o: P.outline });
    },
  ]);
  iconDraws.push([
    'menu',
    (x0) => {
      icons.rect(x0 + 2, 3, 8, 2, P.outline);
      icons.rect(x0 + 2, 7, 8, 2, P.outline);
      icons.rect(x0 + 2, 11 - 2, 8, 2, P.outline);
    },
  ]);
  const icons = new PixelCanvas(scene, 'icons', 12 * iconDraws.length, 12);
  iconDraws.forEach(([name, draw], i) => {
    draw(i * 12);
    icons.frame(name, i * 12, 0, 12, 12);
  });
  icons.done();

  // mini-game props
  const mg = new PixelCanvas(scene, 'mg', 200, 40);
  // knife 16x16
  mg.rows(0, 0, ['..........o.....', '.........oo.....', '........owo.....', '.......owwo.....', '......owwo......', '.....owwo.......', '....owwo........', '...owwo.........', '..owwo..........', '.oddo...........', 'oddo............', 'oo..............'], { o: P.outline, w: '#e6e6f2', d: P.woodDark });
  mg.frame('knife', 0, 0, 16, 16);
  // spoon 16x16
  mg.rows(16, 0, ['....oooo........', '...owwwwo.......', '...owwwwo.......', '....owwo........', '.....oo.........', '.....oo.........', '.....oo.........', '.....oo.........', '.....oo.........', '.....oo.........', '.....oo.........', '.....oo.........'], { o: P.outline, w: P.woodLight });
  mg.frame('spoon', 16, 0, 16, 16);
  // shaker 12x16
  mg.rows(32, 0, ['..oooooo....', '.o.o.o.oo...', '.oooooooo...', '.owwwwwwo...', '.owwwwwwo...', '.owwwwwwo...', '.owwrrwwo...', '.owwrrwwo...', '.owwwwwwo...', '.oooooooo...'], { o: P.outline, w: '#e6e6f2', r: P.red });
  mg.frame('shaker', 32, 0, 12, 16);
  // pan 32x16
  mg.rect(48, 6, 22, 8, P.outline);
  mg.rect(49, 7, 20, 6, '#5a5f7a');
  mg.rect(49, 7, 20, 2, '#8d8fa3');
  mg.rect(70, 8, 10, 3, P.outline);
  mg.rect(71, 9, 8, 1, P.woodDark);
  mg.frame('pan', 48, 0, 32, 16);
  // pancake 14x6
  mg.disc(87, 3, 6, P.outline);
  mg.rect(82, 2, 12, 3, '#f2b16b');
  mg.rect(83, 1, 10, 1, '#ffd9a0');
  mg.frame('pancake', 80, 0, 16, 8);
  // pot 48x32: grey pot seen slightly from above, orange soup inside
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
  // flame frames 12x16 x3
  const flames = [
    ['....rr......', '...rrrr.....', '..rryyrr....', '..ryyyyr....', '.rryyyyrr...', '.ryywwyyr...', '.ryywwyyr...', '..ryyyyr....', '...rrrr.....', '....rr......'],
    ['.....r......', '....rrr.....', '...rryrr....', '..rryyyr....', '..ryyyyrr...', '.rryywwyr...', '.ryywwyyr...', '..ryyyyr....', '...rrrr.....', '....rr......'],
    ['............', '......r.....', '....rrrr....', '...rryyr....', '..rryyyrr...', '..ryywyyr...', '..ryywyyr...', '..rryyyrr...', '...rrrr.....', '....rr......'],
  ];
  flames.forEach((rows, i) => {
    mg.rows(144 + i * 12, 0, rows, { r: P.red, y: P.yellow, w: P.white });
    mg.frame(`flame${i}`, 144 + i * 12, 0, 12, 16);
  });
  // bubble 6x6
  mg.disc(183, 3, 2, P.waterLight);
  mg.px(182, 2, P.white);
  mg.frame('bubble', 180, 0, 8, 8);
  // fish silhouette for reel bar 10x6
  mg.rows(188, 0, ['..oooo...o', '.owwwwo.oo', 'owwewwwooo', '.owwwwo.oo', '..oooo...o'], { o: P.outline, w: '#7fb8e6', e: P.eye });
  mg.frame('reelfish', 188, 0, 12, 8);
  mg.done();

  // fx: sparkle, dust, butterflies, zzz
  const fx = new PixelCanvas(scene, 'fx', 8 * 12, 8);
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
  fx.px(82, 4, P.yellow);
  fx.px(83, 4, P.yellow);
  fx.px(82, 5, P.yellow);
  fx.px(83, 5, P.yellow);
  fx.frame('firefly', 80, 0, 8, 8);
  fx.done();

  const mb = new PixelCanvas(scene, 'mailbox', 16, 24);
  mb.rect(7, 12, 3, 12, P.outline);
  mb.rect(8, 13, 1, 10, P.woodDark);
  mb.rect(2, 3, 12, 10, P.outline);
  mb.rect(3, 4, 10, 8, P.red);
  mb.rect(3, 4, 10, 2, P.pink);
  mb.rect(5, 7, 6, 4, P.outline);
  mb.rect(6, 8, 4, 2, P.cream);
  mb.rect(13, 1, 2, 5, P.outline);
  mb.px(13, 2, P.yellow);
  mb.px(13, 3, P.yellow);
  mb.done();
}

function cropFrames(pc: PixelCanvas, x0: number, crop: CropId) {
  const def = CROPS[crop];
  const leaf = def.leaf;
  const s = 16;
  let x = x0;
  pc.px(x + 8, 11, leaf);
  pc.px(x + 8, 12, leaf);
  pc.px(x + 7, 10, leaf);
  pc.px(x + 9, 10, leaf);
  pc.px(x + 8, 13, P.leafDark);
  x = x0 + s;
  pc.rect(x + 8, 8, 1, 6, P.leafDark);
  pc.rect(x + 6, 9, 2, 2, leaf);
  pc.rect(x + 9, 7, 2, 2, leaf);
  pc.rect(x + 5, 12, 3, 1, leaf);
  pc.rect(x + 9, 11, 3, 1, leaf);
  x = x0 + 2 * s;
  if (crop === 'wheat') {
    for (const sx of [4, 7, 10]) {
      pc.rect(x + sx, 6, 1, 8, P.leafDark);
      pc.rect(x + sx - 1, 7, 3, 2, leaf);
      pc.rect(x + sx - 1, 10, 3, 1, leaf);
    }
  } else {
    pc.rect(x + 8, 5, 1, 9, P.leafDark);
    pc.rect(x + 5, 6, 3, 2, leaf);
    pc.rect(x + 9, 5, 3, 2, leaf);
    pc.rect(x + 4, 9, 4, 2, leaf);
    pc.rect(x + 9, 8, 4, 2, leaf);
    pc.rect(x + 5, 12, 3, 1, leaf);
    pc.rect(x + 9, 12, 3, 1, leaf);
  }
  x = x0 + 3 * s;
  if (crop === 'wheat') {
    for (const sx of [4, 7, 10]) {
      pc.rect(x + sx, 6, 1, 8, P.leafDark);
      pc.rect(x + sx - 1, 3, 3, 5, def.color);
      pc.px(x + sx, 2, def.color);
      pc.px(x + sx - 1, 4, def.colorLight);
      pc.px(x + sx, 6, def.colorLight);
    }
  } else if (crop === 'carrot') {
    pc.rect(x + 8, 5, 1, 7, P.leafDark);
    pc.rect(x + 5, 5, 3, 2, leaf);
    pc.rect(x + 9, 4, 3, 2, leaf);
    pc.rect(x + 4, 8, 4, 2, leaf);
    pc.rect(x + 9, 7, 4, 2, leaf);
    pc.rect(x + 6, 11, 5, 3, def.color);
    pc.rect(x + 7, 14, 3, 1, def.color);
    pc.rect(x + 6, 11, 5, 1, def.colorLight);
  } else {
    pc.rect(x + 8, 5, 1, 9, P.leafDark);
    pc.rect(x + 5, 6, 3, 2, leaf);
    pc.rect(x + 9, 5, 3, 2, leaf);
    pc.rect(x + 4, 9, 4, 2, leaf);
    pc.rect(x + 9, 8, 4, 2, leaf);
    pc.rect(x + 5, 12, 3, 1, leaf);
    pc.rect(x + 9, 12, 3, 1, leaf);
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
  for (let f = 0; f < 4; f++) pc.frame(`${crop}-${f}`, x0 + f * s, 0, s, s);
}

function produceIcon(pc: PixelCanvas, x0: number, crop: CropId) {
  const def = CROPS[crop];
  if (crop === 'wheat') {
    pc.rect(x0 + 5, 1, 1, 10, P.leafDark);
    pc.rect(x0 + 3, 1, 5, 5, def.color);
    pc.px(x0 + 5, 0, def.color);
    pc.px(x0 + 4, 2, def.colorLight);
    pc.px(x0 + 3, 1, P.outline);
    pc.px(x0 + 7, 1, P.outline);
  } else if (crop === 'carrot') {
    pc.rect(x0 + 4, 0, 4, 3, def.leaf);
    pc.rect(x0 + 3, 3, 6, 5, def.color);
    pc.rect(x0 + 4, 8, 4, 2, def.color);
    pc.rect(x0 + 5, 10, 2, 1, def.color);
    pc.px(x0 + 4, 4, def.colorLight);
    pc.px(x0 + 4, 6, def.colorLight);
  } else if (crop === 'strawberry') {
    pc.rect(x0 + 4, 1, 4, 2, def.leaf);
    pc.rect(x0 + 3, 3, 6, 4, def.color);
    pc.rect(x0 + 4, 7, 4, 2, def.color);
    pc.rect(x0 + 5, 9, 2, 1, def.color);
    pc.px(x0 + 4, 4, P.yellow);
    pc.px(x0 + 7, 5, P.yellow);
    pc.px(x0 + 5, 7, P.yellow);
    pc.px(x0 + 4, 3, def.colorLight);
  } else {
    pc.rect(x0 + 5, 1, 2, 2, def.leaf);
    pc.disc(x0 + 6, 6, 4, def.color);
    pc.px(x0 + 4, 4, def.colorLight);
    pc.px(x0 + 5, 4, def.colorLight);
    pc.px(x0 + 4, 5, def.colorLight);
  }
}
