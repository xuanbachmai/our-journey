import { mulberry32 } from '../art/pixel';
import { T } from '../art/tiles';
import { blockRect, boolGrid, fillRect, grid, type AreaDef, type AreaObject, type ForageSpot, photoSpot } from './types';

/** Whisper Forest: a winding path, foraging spots, a hidden pond and a clearing. */
export function buildForest(): AreaDef {
  const rnd = mulberry32(29);
  const w = 40;
  const h = 30;
  const tiles = grid(w, h, T.FOREST);
  const blocked = boolGrid(w, h, false);
  const objects: AreaObject[] = [];

  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (rnd() < 0.3) tiles[y][x] = T.DARKGRASS;

  // path: south entrance winding to a clearing in the north-west, branch to the pond in the north-east
  const path: [number, number][] = [];
  const segment = (x0: number, y0: number, x1: number, y1: number) => {
    const dx = Math.sign(x1 - x0);
    const dy = Math.sign(y1 - y0);
    let x = x0;
    let y = y0;
    path.push([x, y]);
    while (x !== x1 || y !== y1) {
      if (x !== x1) x += dx;
      else y += dy;
      path.push([x, y]);
    }
  };
  segment(20, 29, 20, 24);
  segment(20, 24, 14, 24);
  segment(14, 24, 14, 17);
  segment(14, 17, 22, 17);
  segment(22, 17, 22, 12);
  segment(22, 12, 10, 12);
  segment(10, 12, 10, 6);
  segment(22, 12, 30, 12);
  segment(30, 12, 30, 8);
  for (const [x, y] of path) fillRect(tiles, x, y, 2, 1, T.ROAD);
  // clearing
  fillRect(tiles, 6, 3, 10, 6, T.GRASS2);
  for (let y = 3; y < 9; y++) for (let x = 6; x < 16; x++) if (rnd() < 0.25) tiles[y][x] = T.FLOWER;
  // hidden pond in the north-east
  const pond = { cx: 33.5, cy: 5.5, rx: 4.5, ry: 2.6 };
  for (let y = 1; y < 12; y++) {
    for (let x = 26; x < 40; x++) {
      const dx = (x + 0.5 - pond.cx) / pond.rx;
      const dy = (y + 0.5 - pond.cy) / pond.ry;
      const d = dx * dx + dy * dy;
      if (d <= 1) {
        tiles[y][x] = T.WATER;
        blocked[y][x] = true;
      } else if (d <= 1.5) tiles[y][x] = T.SAND;
    }
  }

  // dense trees everywhere the path and clearing are not
  const keep = (x: number, y: number) => {
    for (let yy = y - 1; yy <= y + 2; yy++) for (let xx = x - 1; xx <= x + 2; xx++) {
      const t = tiles[yy]?.[xx];
      if (t === undefined) return false;
      if (t === T.ROAD || t === T.SAND || t === T.WATER || t === T.GRASS2 || t === T.FLOWER) return false;
    }
    return true;
  };
  for (let y = 0; y < h - 1; y += 2) {
    for (let x = 0; x < w - 1; x += 2) {
      const edge = x < 2 || y < 2 || x >= w - 2 || y >= h - 2;
      if (edge && !(y >= h - 2 && (x === 20 || x === 18))) {
        objects.push({ key: 'trees', frame: 4, tx: x, ty: y, w: 2, h: 2, blocked: true });
        blockRect(blocked, x, y, 2, 2);
        continue;
      }
      if (!keep(x, y) || rnd() < 0.35) continue;
      objects.push({ key: 'trees', frame: rnd() < 0.7 ? 4 : rnd() < 0.5 ? 1 : 0, tx: x, ty: y, w: 2, h: 2, blocked: true });
      blockRect(blocked, x, y, 2, 2);
    }
  }
  // south entrance must be open
  blockRect(blocked, 18, 26, 4, 4, false);
  objects.splice(0, objects.length, ...objects.filter((o) => !(o.key === 'trees' && o.ty >= 26 && o.tx >= 18 && o.tx <= 20)));
  fillRect(tiles, 20, 26, 2, 4, T.ROAD);

  // stumps and a sign
  for (const [tx, ty] of [
    [12, 20],
    [24, 15],
    [8, 10],
  ]) {
    if (!blocked[ty][tx]) {
      objects.push({ key: 'props', frame: 'stump', tx, ty, w: 1, h: 1, blocked: true });
      blockRect(blocked, tx, ty, 1, 1);
    }
  }
  objects.push({ key: 'props', frame: 'sign', tx: 17, ty: 24, w: 1, h: 1, blocked: true, interact: 'sign', label: 'Read', text: 'Whisper Forest\nMushrooms grow back. Be gentle.' });
  blockRect(blocked, 17, 24, 1, 1);

  // forage spots along the way
  const forage: ForageSpot[] = [];
  const spots: [number, number, ForageSpot['item']][] = [
    [12, 23, 'mushroom'],
    [16, 19, 'herb'],
    [13, 15, 'berry'],
    [20, 16, 'mushroom'],
    [24, 11, 'berry'],
    [12, 10, 'herb'],
    [8, 5, 'mushroom'],
    [13, 5, 'berry'],
    [28, 10, 'herb'],
    [9, 8, 'mushroom'],
  ];
  spots.forEach(([tx, ty, item], i) => {
    if (blocked[ty][tx]) return;
    forage.push({ key: `f${i}`, tx, ty, item, respawnMin: item === 'berry' ? 25 : 15 });
    blocked[ty][tx] = true;
  });

  photoSpot(objects, blocked, 30, 8, 'pond');

  return {
    id: 'forest',
    w,
    h,
    tiles,
    blocked,
    objects,
    portals: [{ tx: 20, ty: 29, w: 2, h: 1, to: 'town', targetTx: 22, targetTy: 1, facing: 'down', label: 'To Maple Town' }],
    npcs: [{ id: 'june', lookId: 'c4', tx: 9, ty: 6, wander: 2, lines: ['Shh. The forest whispers if you stand still.', 'That pond up north has the fattest fish.', 'Berries come back slower than mushrooms.', 'I made jam here as a girl. Strawberry, three whole ones.'] }],
    forage,
    spawn: { tx: 20, ty: 27 },
    party: [{ tx: 10, ty: 4 }],
  };
}
