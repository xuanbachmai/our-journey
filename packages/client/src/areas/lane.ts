import { mulberry32 } from '../art/pixel';
import { T } from '../art/tiles';
import { FAMILIES } from '../config/family';
import { blockRect, boolGrid, fillRect, grid, type AreaDef, type AreaObject } from './types';

/** Family Lane, east of Maple Town: a quiet street with qd's and xb's family homes. */
export function buildLane(): AreaDef {
  const rnd = mulberry32(41);
  const w = 36;
  const h = 20;
  const tiles = grid(w, h, T.GRASS);
  const blocked = boolGrid(w, h, false);
  const objects: AreaObject[] = [];

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const r = rnd();
      if (r < 0.07) tiles[y][x] = T.TUFT;
      else if (r < 0.16) tiles[y][x] = T.FLOWER;
      else if (r < 0.22) tiles[y][x] = T.FLOWER2;
      else if (r < 0.48) tiles[y][x] = T.GRASS2;
    }
  }
  // border trees with a gap on the west edge for the road back to town
  for (let y = 0; y < h; y += 2) {
    for (let x = 0; x < w; x += 2) {
      const edge = x < 2 || y < 2 || x >= w - 2 || y >= h - 2;
      if (!edge) continue;
      if (x < 2 && y === 10) continue;
      objects.push({ key: 'trees', frame: rnd() < 0.45 ? 2 + Math.floor(rnd() * 2) : Math.floor(rnd() * 2), tx: x, ty: y, w: 2, h: 2, blocked: true });
      blockRect(blocked, x, y, 2, 2);
    }
  }

  // the lane itself
  const roadY = 10;
  fillRect(tiles, 0, roadY, w - 2, 2, T.ROAD);

  // two homes along the north side
  const homes = [
    { frame: 'house_qd', tx: 6, to: 'qdhome' as const, family: FAMILIES.qd },
    { frame: 'house_xb', tx: 23, to: 'xbhome' as const, family: FAMILIES.xb },
  ];
  const portals: AreaDef['portals'] = [];
  for (const hm of homes) {
    const ty = 3;
    objects.push({ key: 'buildings', frame: hm.frame, tx: hm.tx, ty, w: 5, h: 3, blocked: true });
    blockRect(blocked, hm.tx, ty, 5, 3);
    fillRect(tiles, hm.tx, ty, 5, 3, T.GRASS);
    const doorTx = hm.tx + 2;
    tiles[ty + 3][doorTx] = T.MAT;
    fillRect(tiles, doorTx, ty + 4, 1, roadY - (ty + 4), T.PATH);
    portals.push({ tx: doorTx, ty: ty + 3, w: 1, h: 1, to: hm.to, targetTx: 8, targetTy: 8, facing: 'up', label: hm.family.houseName });
    // flower beds either side of the door, mailbox, name sign by the path
    for (const fx of [hm.tx, hm.tx + 4]) {
      objects.push({ key: 'props', frame: 'flowerbed', tx: fx, ty: ty + 3, w: 1, h: 1, blocked: true });
      blockRect(blocked, fx, ty + 3, 1, 1);
    }
    objects.push({ key: 'props', frame: 'mailbox', tx: hm.tx - 1, ty: ty + 2, w: 1, h: 1, blocked: true });
    blockRect(blocked, hm.tx - 1, ty + 2, 1, 1);
    objects.push({ key: 'props', frame: 'sign', tx: doorTx + 1, ty: roadY - 2, w: 1, h: 1, blocked: true, interact: 'sign', label: 'Read', text: hm.family.sign });
    blockRect(blocked, doorTx + 1, roadY - 2, 1, 1);
  }

  // street lamps, benches and a few trees on the south side
  for (const tx of [4, 16, 20, 31]) {
    objects.push({ key: 'props', frame: 'lamp', tx, ty: roadY - 1, w: 1, h: 1, blocked: true });
    blockRect(blocked, tx, roadY - 1, 1, 1);
  }
  for (const tx of [10, 26]) {
    objects.push({ key: 'props', frame: 'bench', tx, ty: roadY + 2, w: 1, h: 1, blocked: true });
    blockRect(blocked, tx, roadY + 2, 1, 1);
  }
  for (const [tx, ty, fr] of [
    [5, 14, 2],
    [14, 15, 0],
    [21, 14, 3],
    [29, 15, 1],
  ]) {
    objects.push({ key: 'trees', frame: fr, tx, ty, w: 2, h: 2, blocked: true });
    blockRect(blocked, tx, ty, 2, 2);
  }
  for (const [tx, ty] of [
    [9, 16],
    [18, 13],
    [25, 16],
    [33, 13],
  ]) {
    objects.push({ key: 'bushes', frame: Math.floor(rnd() * 3), tx, ty, w: 1, h: 1, blocked: true });
    blockRect(blocked, tx, ty, 1, 1);
  }
  objects.push({ key: 'props', frame: 'sign', tx: 2, ty: roadY - 2, w: 1, h: 1, blocked: true, interact: 'sign', label: 'Read', text: 'Family Lane\nWest: Maple Town' });
  blockRect(blocked, 2, roadY - 2, 1, 1);

  return {
    id: 'lane',
    w,
    h,
    tiles,
    blocked,
    objects,
    portals: [...portals, { tx: 0, ty: roadY, w: 1, h: 2, to: 'town', targetTx: 42, targetTy: 12, facing: 'left', label: 'To Maple Town' }],
    npcs: [],
    forage: [],
    spawn: { tx: 2, ty: roadY },
    party: [
      { tx: 5, ty: 7 },
      { tx: 22, ty: 7 },
    ],
  };
}
