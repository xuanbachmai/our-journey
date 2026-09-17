import { mulberry32 } from '../art/pixel';
import { T } from '../art/tiles';
import { blockRect, boolGrid, fillRect, grid, type AreaDef, type AreaObject } from './types';

/** Sunny Ranch: a big red barn, a fenced pasture for cows and sheep, hay bales. */
export function buildRanch(): AreaDef {
  const rnd = mulberry32(17);
  const w = 36;
  const h = 24;
  const tiles = grid(w, h, T.GRASS);
  const blocked = boolGrid(w, h, false);
  const objects: AreaObject[] = [];

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const r = rnd();
      if (r < 0.1) tiles[y][x] = T.TUFT;
      else if (r < 0.15) tiles[y][x] = T.FLOWER2;
      else if (r < 0.5) tiles[y][x] = T.GRASS2;
    }
  }
  for (let y = 0; y < h; y += 2) {
    for (let x = 0; x < w; x += 2) {
      const edge = x < 2 || y < 2 || x >= w - 2 || y >= h - 2;
      if (!edge) continue;
      if (x >= w - 2 && y === 12) continue;
      objects.push({ key: 'trees', frame: Math.floor(rnd() * 2), tx: x, ty: y, w: 2, h: 2, blocked: true });
      blockRect(blocked, x, y, 2, 2);
    }
  }

  // barn (footprint 4x3), collect products at its doors
  const barn = { tx: 15, ty: 3 };
  objects.push({ key: 'barn', tx: barn.tx, ty: barn.ty, w: 4, h: 3, dy: 2, blocked: true, interact: 'barn', label: 'Collect' });
  blockRect(blocked, barn.tx, barn.ty, 4, 3);
  fillRect(tiles, barn.tx, barn.ty, 4, 3, T.GRASS);
  fillRect(tiles, barn.tx + 1, barn.ty + 3, 2, 1, T.ROAD);

  // pasture with a wooden fence and a gate at the top middle
  const pen = { x: 6, y: 9, w: 22, h: 9 };
  fillRect(tiles, pen.x, pen.y, pen.w, pen.h, T.DARKGRASS);
  for (let y = pen.y; y < pen.y + pen.h; y++) for (let x = pen.x; x < pen.x + pen.w; x++) if (rnd() < 0.3) tiles[y][x] = T.GRASS2;
  for (let x = pen.x - 1; x <= pen.x + pen.w; x++) {
    objects.push({ key: 'woodfence', frame: 0, tx: x, ty: pen.y - 1, w: 1, h: 1, blocked: true });
    blockRect(blocked, x, pen.y - 1, 1, 1);
    objects.push({ key: 'woodfence', frame: 0, tx: x, ty: pen.y + pen.h, w: 1, h: 1, blocked: true });
    blockRect(blocked, x, pen.y + pen.h, 1, 1);
  }
  for (let y = pen.y; y < pen.y + pen.h; y++) {
    objects.push({ key: 'woodfence', frame: 1, tx: pen.x - 1, ty: y, w: 1, h: 1, blocked: true });
    blockRect(blocked, pen.x - 1, y, 1, 1);
    objects.push({ key: 'woodfence', frame: 1, tx: pen.x + pen.w, ty: y, w: 1, h: 1, blocked: true });
    blockRect(blocked, pen.x + pen.w, y, 1, 1);
  }
  // animals wander inside; the player stays outside (blocked)
  blockRect(blocked, pen.x, pen.y, pen.w, pen.h);

  // road from the east gate to the barn
  fillRect(tiles, pen.x + pen.w + 1, 12, w - (pen.x + pen.w + 1), 1, T.ROAD);
  fillRect(tiles, pen.x + pen.w + 1, 6, 1, 7, T.ROAD);
  fillRect(tiles, barn.tx + 2, 6, pen.x + pen.w - barn.tx, 1, T.ROAD);

  // hay bales, water trough decor
  for (const [tx, ty] of [
    [4, 5],
    [5, 5],
    [30, 20],
    [31, 20],
    [8, 20],
  ]) {
    objects.push({ key: 'props', frame: 'hay', tx, ty, w: 1, h: 1, blocked: true });
    blockRect(blocked, tx, ty, 1, 1);
  }
  objects.push({ key: 'props', frame: 'sign', tx: 31, ty: 11, w: 1, h: 1, blocked: true, interact: 'sign', label: 'Read', text: 'Sunny Ranch\nCows: milk. Sheep: wool.\nBuy them at the pet shop.' });
  blockRect(blocked, 31, 11, 1, 1);

  return {
    id: 'ranch',
    w,
    h,
    tiles,
    blocked,
    objects,
    portals: [{ tx: w - 1, ty: 12, w: 1, h: 2, to: 'farm', targetTx: 1, targetTy: 21, facing: 'right', label: 'To Our Farm' }],
    npcs: [{ id: 'bo', lookId: 'c3', tx: 22, ty: 6, wander: 3, lines: ['Howdy! Bo here. I mind the animals.', 'Milk and wool pile up in the barn. Collect them anytime.', 'Sheep are slow but wool sells dear.', 'Cows like it when you visit.'] }],
    forage: [],
    spawn: { tx: 33, ty: 12 },
    pens: [
      { x: pen.x, y: pen.y, w: Math.floor(pen.w / 2), h: pen.h, animal: 'cow' },
      { x: pen.x + Math.floor(pen.w / 2), y: pen.y, w: Math.ceil(pen.w / 2), h: pen.h, animal: 'sheep' },
    ],
    party: [{ tx: barn.tx - 1, ty: barn.ty + 2 }],
  };
}
