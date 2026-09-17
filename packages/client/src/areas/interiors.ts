import { T } from '../art/tiles';
import { blockRect, boolGrid, fillRect, grid, type AreaDef, type AreaObject, type DinerTable, type NpcDef } from './types';

/** Walls on the top two rows and both sides, floor in between, a door mat at the bottom middle. */
function room(w: number, h: number, floor: number, wallTile = T.WALL) {
  const tiles = grid(w, h, floor);
  const blocked = boolGrid(w, h, false);
  fillRect(tiles, 0, 0, w, 1, T.WALL_TOP);
  fillRect(tiles, 0, 1, w, 1, wallTile);
  blockRect(blocked, 0, 0, w, 2);
  blockRect(blocked, 0, 0, 1, h);
  blockRect(blocked, w - 1, 0, 1, h);
  fillRect(tiles, 0, 2, 1, h - 2, T.WALL_TOP);
  fillRect(tiles, w - 1, 2, 1, h - 2, T.WALL_TOP);
  fillRect(tiles, 0, h - 1, w, 1, T.WALL_TOP);
  blockRect(blocked, 0, h - 1, w, 1);
  const doorTx = Math.floor(w / 2);
  tiles[h - 1][doorTx] = T.MAT;
  blocked[h - 1][doorTx] = false;
  return { tiles, blocked, doorTx };
}

function windows(objects: AreaObject[], xs: number[], ty = 1) {
  for (const tx of xs) objects.push({ key: 'furniture', frame: 'painting', tx, ty, w: 1, h: 1, dy: -2, floor: true });
}

export function buildHome(): AreaDef {
  const w = 18;
  const h = 13;
  const { tiles, blocked, doorTx } = room(w, h, T.FLOOR_WOOD);
  const objects: AreaObject[] = [];
  // wardrobe against the top wall, plus a fixed window
  objects.push({ key: 'furniture', frame: 'wardrobe', tx: 1, ty: 1, w: 2, h: 1, dy: 4, blocked: true, interact: 'wardrobe', label: 'Wardrobe' });
  blockRect(blocked, 1, 1, 2, 1);
  objects.push({ key: 'furniture', frame: 'photo', tx: 9, ty: 1, w: 1, h: 1, dy: -2, floor: true });
  return {
    id: 'home',
    w,
    h,
    tiles,
    blocked,
    objects,
    portals: [{ tx: doorTx, ty: h - 1, w: 1, h: 1, to: 'farm', targetTx: 7, targetTy: 9, facing: 'down', label: 'Outside' }],
    npcs: [],
    forage: [],
    spawn: { tx: doorTx, ty: h - 3 },
    floorRect: { x: 1, y: 2, w: w - 2, h: h - 3 },
  };
}

export function buildRestaurant(): AreaDef {
  const w = 21;
  const h = 13;
  const { tiles, blocked, doorTx } = room(w, h, T.FLOOR_TILE);
  const objects: AreaObject[] = [];
  // kitchen along the top-left wall: cook here too
  objects.push({ key: 'furniture', frame: 'kitchenwall', tx: 1, ty: 1, w: 3, h: 1, dy: 6, blocked: true, interact: 'kitchen', label: 'Cook' });
  blockRect(blocked, 1, 1, 3, 1);
  objects.push({ key: 'furniture', frame: 'shopcounter', tx: 5, ty: 2, w: 3, h: 1, dy: 2, blocked: true });
  blockRect(blocked, 5, 2, 3, 1);
  windows(objects, [10, 14, 18]);
  // five tables; the first (2 + upgrades) are in use
  const tables: DinerTable[] = [
    { tx: 4, ty: 6, chairTx: 4, chairTy: 8 },
    { tx: 9, ty: 6, chairTx: 9, chairTy: 8 },
    { tx: 14, ty: 6, chairTx: 14, chairTy: 8 },
    { tx: 6, ty: 10, chairTx: 8, chairTy: 10 },
    { tx: 14, ty: 10, chairTx: 16, chairTy: 10 },
  ];
  tables.forEach((t, i) => {
    objects.push({ key: 'furniture', frame: 'rtable', tx: t.tx, ty: t.ty, w: 2, h: 1, dy: 2, blocked: true, requiresUpgrade: i < 2 ? undefined : `tables:${i - 1}` });
    objects.push({ key: 'furniture', frame: 'rchair', tx: t.chairTx, ty: t.chairTy, w: 1, h: 1, dy: 0, requiresUpgrade: i < 2 ? undefined : `tables:${i - 1}` });
  });
  const upgradeBlocks = tables.map((t, i) => ({ upgrade: i < 2 ? '' : `tables:${i - 1}`, tiles: [{ tx: t.tx, ty: t.ty }, { tx: t.tx + 1, ty: t.ty }] }));
  return {
    id: 'restaurant',
    w,
    h,
    tiles,
    blocked,
    objects,
    portals: [{ tx: doorTx, ty: h - 1, w: 1, h: 1, to: 'farm', targetTx: 22, targetTy: 6, facing: 'down', label: 'Outside' }],
    npcs: [],
    forage: [],
    spawn: { tx: doorTx, ty: h - 3 },
    tables,
    dinerEntry: { tx: doorTx, ty: h - 2 },
    upgradeBlocks,
    party: [{ tx: 17, ty: 3 }],
  };
}

function shop(id: 'store' | 'tailor' | 'petshop', floor: number, keeper: NpcDef, extra: (objects: AreaObject[], blocked: boolean[][]) => void, town: { tx: number; ty: number }): AreaDef {
  const w = 16;
  const h = 11;
  const { tiles, blocked, doorTx } = room(w, h, floor);
  const objects: AreaObject[] = [];
  objects.push({ key: 'furniture', frame: 'shopcounter', tx: 6, ty: 3, w: 3, h: 1, dy: 2, blocked: true, interact: id, label: 'Shop' });
  blockRect(blocked, 6, 3, 3, 1);
  blockRect(blocked, 5, 2, 5, 1); // keeper's side
  windows(objects, [3, 12]);
  extra(objects, blocked);
  return {
    id,
    w,
    h,
    tiles,
    blocked,
    objects,
    portals: [{ tx: doorTx, ty: h - 1, w: 1, h: 1, to: 'town', targetTx: town.tx, targetTy: town.ty, facing: 'down', label: 'Outside' }],
    npcs: [keeper],
    forage: [],
    spawn: { tx: doorTx, ty: h - 3 },
  };
}

export function buildStore(): AreaDef {
  return shop(
    'store',
    T.FLOOR_WOOD,
    { id: 'mabel', lookId: 'mabel', tx: 7, ty: 2, wander: 0, opens: 'store', lines: ['Seeds, furniture and recipe books. And I buy anything you grow.'] },
    (objects, blocked) => {
      for (const tx of [1, 2, 13, 14]) {
        objects.push({ key: 'furniture', frame: 'bookshelf', tx, ty: 1, w: 1, h: 1, dy: 4, blocked: true });
        blockRect(blocked, tx, 1, 1, 1);
      }
      objects.push({ key: 'furniture', frame: 'plant', tx: 1, ty: 8, w: 1, h: 1, blocked: true });
      objects.push({ key: 'furniture', frame: 'plant', tx: 14, ty: 8, w: 1, h: 1, blocked: true });
      blockRect(blocked, 1, 8, 1, 1);
      blockRect(blocked, 14, 8, 1, 1);
      objects.push({ key: 'props', frame: 'hay', tx: 11, ty: 6, w: 1, h: 1, blocked: true });
      blockRect(blocked, 11, 6, 1, 1);
    },
    { tx: 8, ty: 7 },
  );
}

export function buildTailor(): AreaDef {
  return shop(
    'tailor',
    T.FLOOR_PINK,
    { id: 'rosa', lookId: 'rosa', tx: 7, ty: 2, wander: 0, opens: 'tailor', lines: ['Hats, dyes and hair colour. Try the bunny ears, everyone loves them.'] },
    (objects, blocked) => {
      for (const [tx, ty] of [
        [2, 5],
        [13, 5],
        [2, 8],
        [13, 8],
      ]) {
        objects.push({ key: 'furniture', frame: 'mannequin', tx, ty, w: 1, h: 1, dy: 2, blocked: true });
        blockRect(blocked, tx, ty, 1, 1);
      }
      objects.push({ key: 'furniture', frame: 'rug', tx: 6, ty: 6, w: 3, h: 2, floor: true });
    },
    { tx: 32, ty: 7 },
  );
}

export function buildPetshop(): AreaDef {
  return shop(
    'petshop',
    T.FLOOR_BLUE,
    { id: 'finn', lookId: 'finn', tx: 7, ty: 2, wander: 0, opens: 'petshop', lines: ['Puppies, kittens, bunnies! And farm animals for the ranch and coop.'] },
    (objects, blocked) => {
      for (const [tx, ty] of [
        [1, 6],
        [11, 6],
      ]) {
        objects.push({ key: 'furniture', frame: 'petpen', tx, ty, w: 2, h: 1, dy: 4, blocked: true });
        blockRect(blocked, tx, ty, 2, 1);
      }
      objects.push({ key: 'critters', frame: 'dog0', tx: 1, ty: 6, w: 1, h: 1, dy: -4, floor: false });
      objects.push({ key: 'critters', frame: 'cat0', tx: 2, ty: 6, w: 1, h: 1, dy: -4 });
      objects.push({ key: 'critters', frame: 'bunny0', tx: 11, ty: 6, w: 1, h: 1, dy: -4 });
      objects.push({ key: 'critters', frame: 'chicken0', tx: 12, ty: 6, w: 1, h: 1, dy: -4 });
      objects.push({ key: 'props', frame: 'hay', tx: 13, ty: 8, w: 1, h: 1, blocked: true });
      blockRect(blocked, 13, 8, 1, 1);
    },
    { tx: 38, ty: 7 },
  );
}
