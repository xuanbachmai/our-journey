import { mulberry32 } from '../art/pixel';
import { T } from '../art/tiles';
import { blockRect, boolGrid, fillRect, grid, type AreaDef, type AreaObject, type NpcDef, photoSpot } from './types';

/** Maple Town: plaza with a fountain, three shops, the orders board and villagers. */
export function buildTown(): AreaDef {
  const rnd = mulberry32(11);
  const w = 44;
  const h = 28;
  const tiles = grid(w, h, T.GRASS);
  const blocked = boolGrid(w, h, false);
  const objects: AreaObject[] = [];

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const r = rnd();
      if (r < 0.06) tiles[y][x] = T.TUFT;
      else if (r < 0.12) tiles[y][x] = T.FLOWER;
      else if (r < 0.16) tiles[y][x] = T.FLOWER2;
      else if (r < 0.45) tiles[y][x] = T.GRASS2;
    }
  }
  // border trees with gaps west (road y18-19) and north (x 22-23)
  for (let y = 0; y < h; y += 2) {
    for (let x = 0; x < w; x += 2) {
      const edge = x < 2 || y < 2 || x >= w - 2 || y >= h - 2;
      if (!edge) continue;
      if (x < 2 && y === 18) continue;
      if (y < 2 && x === 22) continue;
      if (x >= w - 2 && y === 12) continue;
      objects.push({ key: 'trees', frame: rnd() < 0.3 ? 2 : Math.floor(rnd() * 2), tx: x, ty: y, w: 2, h: 2, blocked: true });
      blockRect(blocked, x, y, 2, 2);
    }
  }

  // plaza and roads
  fillRect(tiles, 10, 9, 24, 12, T.COBBLE);
  fillRect(tiles, 0, 18, 10, 2, T.ROAD);
  fillRect(tiles, 22, 0, 2, 9, T.ROAD);
  fillRect(tiles, 34, 12, 10, 2, T.ROAD);

  // shops along the top: footprints 5x3 with the door tile below
  const shops: { key: string; tx: number; portalTo: 'store' | 'tailor' | 'petshop' | 'furnshop' }[] = [
    { key: 'store', tx: 6, portalTo: 'store' },
    { key: 'furnshop', tx: 14, portalTo: 'furnshop' },
    { key: 'tailor', tx: 30, portalTo: 'tailor' },
    { key: 'petshop', tx: 36, portalTo: 'petshop' },
  ];
  const portals: AreaDef['portals'] = [];
  for (const s of shops) {
    const ty = 3;
    objects.push({ key: 'buildings', frame: s.key, tx: s.tx, ty, w: 5, h: 3, blocked: true });
    blockRect(blocked, s.tx, ty, 5, 3);
    fillRect(tiles, s.tx, ty, 5, 3, T.GRASS);
    tiles[ty + 3][s.tx + 2] = T.MAT;
    fillRect(tiles, s.tx + 2, ty + 4, 1, 9 - (ty + 4), T.COBBLE);
    portals.push({ tx: s.tx + 2, ty: ty + 3, w: 1, h: 1, to: s.portalTo, targetTx: 8, targetTy: 8, facing: 'up', label: s.key });
  }

  // fountain in the middle
  objects.push({ key: 'props', frame: 'fountain', tx: 21, ty: 13, w: 2, h: 2, blocked: true });
  blockRect(blocked, 21, 13, 2, 2);

  // orders board
  objects.push({ key: 'props', frame: 'board', tx: 14, ty: 11, w: 2, h: 1, dy: 2, blocked: true, interact: 'board', label: 'Orders' });
  blockRect(blocked, 14, 11, 2, 1);

  // lamps, benches, sign
  for (const [tx, ty] of [
    [11, 10],
    [32, 10],
    [11, 19],
    [32, 19],
  ]) {
    objects.push({ key: 'props', frame: 'lamp', tx, ty, w: 1, h: 1, blocked: true });
    blockRect(blocked, tx, ty, 1, 1);
  }
  for (const [tx, ty] of [
    [18, 16],
    [25, 16],
  ]) {
    objects.push({ key: 'props', frame: 'bench', tx, ty, w: 1, h: 1, blocked: true });
    blockRect(blocked, tx, ty, 1, 1);
  }
  objects.push({ key: 'props', frame: 'sign', tx: 20, ty: 8, w: 1, h: 1, blocked: true, interact: 'sign', label: 'Read', text: 'North: Whisper Forest\nWest: Our Farm\nEast: Family Lane' });
  blockRect(blocked, 20, 8, 1, 1);
  objects.push({ key: 'props', frame: 'sign', tx: 3, ty: 17, w: 1, h: 1, blocked: true, interact: 'sign', label: 'Read', text: 'Welcome to Maple Town!\nShops open day and night.' });
  blockRect(blocked, 3, 17, 1, 1);

  // a few inner trees and bushes
  for (const [tx, ty, fr] of [
    [4, 8, 2],
    [38, 20, 0],
    [4, 22, 3],
    [36, 22, 1],
  ]) {
    objects.push({ key: 'trees', frame: fr, tx, ty, w: 2, h: 2, blocked: true });
    blockRect(blocked, tx, ty, 2, 2);
  }
  for (const [tx, ty] of [
    [12, 22],
    [30, 23],
    [26, 5],
  ]) {
    objects.push({ key: 'bushes', frame: Math.floor(rnd() * 3), tx, ty, w: 1, h: 1, blocked: true });
    blockRect(blocked, tx, ty, 1, 1);
  }

  const npcs: NpcDef[] = [
    { id: 'mayor', lookId: 'mayor', tx: 24, ty: 16, wander: 2, lines: ['Welcome to Maple Town! I am Mayor Bea.', 'The board by the fountain lists what folks want. Good coin in it.', 'Prices at the store change every day. Sell high!', 'Our forest hides mushrooms and berries. Go look!'] },
    { id: 'lily', lookId: 'c0', tx: 16, ty: 14, wander: 4, lines: ['Your restaurant smells amazing from here!', 'I heard cows at the ranch give milk every so often.', 'Ivy at Cozy Corner has a new love seat. Cute!', 'Rainy days water the fields for free.'] },
    { id: 'tom', lookId: 'c1', tx: 28, ty: 18, wander: 3, lines: ['Back in my day we fished with a stick.', 'Serve diners fast and they tip well.', 'Furniture makes a house a home. And your food pricier, somehow.', 'The Love Tree only grows when you both show up. Sweet, that.'] },
    { id: 'pip', lookId: 'c2', tx: 20, ty: 19, wander: 5, lines: ['Have you tried Honey Toast? You need a book for it!', 'Finn at the pet shop has puppies!', 'Blueberries take forever but sell for a lot.', 'I once got a gift from a dog. He dug it up!'] },
    { id: 'hana', lookId: 'c5', tx: 12, ty: 17, wander: 3, lines: ['Special days get fireworks on your farm.', 'Ask each other the daily question. It is fun.', 'The bunny ears at Rosa\'s are adorable.', 'Bring me a berry pie some day!'] },
  ];

  photoSpot(objects, blocked, 24, 13, 'fountain');

  return {
    id: 'town',
    w,
    h,
    tiles,
    blocked,
    objects,
    portals: [
      ...portals,
      { tx: 0, ty: 18, w: 1, h: 2, to: 'farm', targetTx: 42, targetTy: 18, facing: 'left', label: 'To Our Farm' },
      { tx: 22, ty: 0, w: 2, h: 1, to: 'forest', targetTx: 20, targetTy: 27, facing: 'up', label: 'To Whisper Forest' },
      { tx: 43, ty: 12, w: 1, h: 2, to: 'lane', targetTx: 1, targetTy: 10, facing: 'right', label: 'To Family Lane' },
    ],
    npcs,
    forage: [],
    spawn: { tx: 2, ty: 18 },
    party: [
      { tx: 20, ty: 12 },
      { tx: 24, ty: 12 },
    ],
  };
}
