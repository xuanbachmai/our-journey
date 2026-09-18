import { mulberry32 } from '../art/pixel';
import { T } from '../art/tiles';
import { blockRect, boolGrid, fillRect, grid, type AreaDef, type AreaObject } from './types';

/** Our Farm: house, kitchen, restaurant, field, pond, counter by the road, coop, Love Tree. */
export function buildFarm(): AreaDef {
  const rnd = mulberry32(3);
  const w = 44;
  const h = 28;
  const tiles = grid(w, h, T.GRASS);
  const blocked = boolGrid(w, h, false);
  const objects: AreaObject[] = [];
  const farm = new Set<string>();

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const r = rnd();
      if (r < 0.08) tiles[y][x] = T.TUFT;
      else if (r < 0.14) tiles[y][x] = T.FLOWER;
      else if (r < 0.19) tiles[y][x] = T.FLOWER2;
      else if (r < 0.21) tiles[y][x] = T.PEBBLE;
      else if (r < 0.25) tiles[y][x] = T.CLOVER;
      else if (r < 0.5) tiles[y][x] = T.GRASS2;
    }
  }

  // border forest, leaving gaps for the road east (y 18-19) and the ranch path west (y 20-21)
  for (let y = 0; y < h; y += 2) {
    for (let x = 0; x < w; x += 2) {
      const edge = x < 2 || y < 2 || x >= w - 2 || y >= h - 2;
      if (!edge) continue;
      if (x >= w - 2 && y === 18) continue;
      if (x < 2 && y === 20) continue;
      const variant = rnd() < 0.25 ? 2 + Math.floor(rnd() * 2) : Math.floor(rnd() * 2);
      objects.push({ key: 'trees', frame: variant, tx: x, ty: y, w: 2, h: 2, blocked: true });
      blockRect(blocked, x, y, 2, 2);
    }
  }

  // house (footprint 7x5) with door mat below the door
  const houseTx = 4;
  const houseTy = 3;
  objects.push({ key: 'house', tx: houseTx, ty: houseTy, w: 7, h: 5, dy: 2, blocked: true });
  blockRect(blocked, houseTx, houseTy, 7, 5);
  fillRect(tiles, houseTx, houseTy, 7, 5, T.GRASS);
  const doorTx = houseTx + 3;
  const doorTy = houseTy + 5;
  tiles[doorTy][doorTx] = T.MAT;

  objects.push({ key: 'props', frame: 'mailbox', tx: houseTx + 7, ty: houseTy + 4, w: 1, h: 1, blocked: true, interact: 'mailbox', label: 'Mail' });
  blockRect(blocked, houseTx + 7, houseTy + 4, 1, 1);

  // outdoor kitchen
  const kitchen = { tx: houseTx + 8, ty: houseTy + 1 };
  objects.push({ key: 'kitchen', tx: kitchen.tx, ty: kitchen.ty, w: 3, h: 2, blocked: true, interact: 'kitchen', label: 'Cook' });
  blockRect(blocked, kitchen.tx, kitchen.ty, 3, 2);
  fillRect(tiles, kitchen.tx, kitchen.ty + 2, 3, 1, T.PATH);

  // restaurant building (5x3 footprint) north of the field
  const rest = { tx: 20, ty: 2 };
  objects.push({ key: 'buildings', frame: 'restaurant', tx: rest.tx, ty: rest.ty, w: 5, h: 3, blocked: true });
  blockRect(blocked, rest.tx, rest.ty, 5, 3);
  fillRect(tiles, rest.tx, rest.ty, 5, 3, T.GRASS);
  tiles[rest.ty + 3][rest.tx + 2] = T.MAT;
  fillRect(tiles, rest.tx + 2, rest.ty + 4, 1, 3, T.PATH);

  // flower beds along the house front (upgrade)
  const flowerBeds = [houseTx, houseTx + 1, houseTx + 5, houseTx + 6].map((tx) => ({ tx, ty: houseTy + 5 }));

  // field with picket fence
  const farmRect = { x: 15, y: 8, w: 12, h: 7 };
  fillRect(tiles, farmRect.x, farmRect.y, farmRect.w, farmRect.h, T.SOIL);
  for (let y = farmRect.y; y < farmRect.y + farmRect.h; y++) for (let x = farmRect.x; x < farmRect.x + farmRect.w; x++) farm.add(`${x},${y}`);
  const fx0 = farmRect.x - 1;
  const fy0 = farmRect.y - 1;
  const fx1 = farmRect.x + farmRect.w;
  const fy1 = farmRect.y + farmRect.h;
  const gapX = new Set([farmRect.x + 5, farmRect.x + 6]);
  for (let x = fx0; x <= fx1; x++) {
    if (!gapX.has(x)) {
      objects.push({ key: 'fence', frame: 0, tx: x, ty: fy0, w: 1, h: 1, blocked: true });
      blockRect(blocked, x, fy0, 1, 1);
      objects.push({ key: 'fence', frame: 0, tx: x, ty: fy1, w: 1, h: 1, blocked: true });
      blockRect(blocked, x, fy1, 1, 1);
    }
  }
  const gapY = new Set([farmRect.y + 3]);
  for (let y = fy0 + 1; y < fy1; y++) {
    if (!gapY.has(y)) {
      objects.push({ key: 'fence', frame: 1, tx: fx0, ty: y, w: 1, h: 1, blocked: true });
      blockRect(blocked, fx0, y, 1, 1);
    }
    objects.push({ key: 'fence', frame: 1, tx: fx1, ty: y, w: 1, h: 1, blocked: true });
    blockRect(blocked, fx1, y, 1, 1);
  }
  const sprinklers = [
    { tx: farmRect.x - 1, ty: farmRect.y - 1 },
    { tx: farmRect.x + farmRect.w, ty: farmRect.y - 1 },
    { tx: farmRect.x - 1, ty: farmRect.y + farmRect.h },
    { tx: farmRect.x + farmRect.w, ty: farmRect.y + farmRect.h },
  ];

  // pond with sand rim
  const pond = { cx: 35.5, cy: 9.5, rx: 5.5, ry: 3.4 };
  for (let y = 2; y < h - 2; y++) {
    for (let x = 2; x < w - 2; x++) {
      const dx = (x + 0.5 - pond.cx) / pond.rx;
      const dy = (y + 0.5 - pond.cy) / pond.ry;
      const d = dx * dx + dy * dy;
      if (d <= 1) {
        tiles[y][x] = T.WATER;
        blocked[y][x] = true;
      } else if (d <= 1.45) tiles[y][x] = T.SAND;
    }
  }

  // Love Tree east of the restaurant
  const loveTree = { tx: 28, ty: 3 };
  objects.push({ key: 'furniture', frame: 'lovetree0', tx: loveTree.tx, ty: loveTree.ty, w: 2, h: 2, dy: 0, blocked: true, interact: 'lovetree', label: 'Tree' });
  blockRect(blocked, loveTree.tx, loveTree.ty, 2, 2);

  // market stall
  const stall = { tx: 33, ty: 19 };
  objects.push({ key: 'stall', tx: stall.tx, ty: stall.ty, w: 3, h: 2, blocked: true, interact: 'stall', label: 'Shop' });
  blockRect(blocked, stall.tx, stall.ty, 3, 2);

  // display counter by the road
  const roadY = 18;
  const counter = { tx: 12, ty: roadY - 2 };
  objects.push({ key: 'counter', tx: counter.tx, ty: counter.ty, w: 2, h: 1, dy: 2, blocked: true, interact: 'counter', label: 'Counter' });
  blockRect(blocked, counter.tx, counter.ty, 2, 1);

  // roads
  fillRect(tiles, doorTx, doorTy + 1, 1, roadY - doorTy, T.PATH);
  fillRect(tiles, doorTx, roadY, w - doorTx, 1, T.PATH);
  fillRect(tiles, farmRect.x + 5, fy1, 2, roadY - fy1, T.PATH);
  fillRect(tiles, stall.tx, stall.ty + 2, 3, 1, T.PATH);
  fillRect(tiles, fx0 - 4, farmRect.y + 3, 4, 1, T.PATH);
  fillRect(tiles, doorTx, farmRect.y + 3, fx0 - 4 - doorTx + 1, 1, T.PATH);
  fillRect(tiles, counter.tx, counter.ty + 1, 2, 1, T.PATH);
  fillRect(tiles, 0, 21, 7, 1, T.PATH);
  fillRect(tiles, 6, 21, 1, 1, T.PATH);
  fillRect(tiles, 7, 19, 1, 3, T.PATH);

  // chicken coop (left of the path, below the house) and bee garden, both upgrades
  const coopTx = 2;
  const coopTy = 11;
  const pen = { x: 2, y: 14, w: 4, h: 2, animal: 'chicken' as const };
  const coopTiles: { tx: number; ty: number }[] = [];
  objects.push({ key: 'coop', tx: coopTx, ty: coopTy, w: 3, h: 2, blocked: true, interact: 'coop', label: 'Eggs', requiresUpgrade: 'coop' });
  for (let x = coopTx; x < coopTx + 3; x++) for (let y = coopTy; y < coopTy + 2; y++) coopTiles.push({ tx: x, ty: y });
  for (let x = pen.x; x < pen.x + pen.w + 1; x++) {
    objects.push({ key: 'fence', frame: 0, tx: x, ty: pen.y + pen.h, w: 1, h: 1, requiresUpgrade: 'coop' });
    coopTiles.push({ tx: x, ty: pen.y + pen.h });
  }
  for (let y = pen.y - 1; y < pen.y + pen.h; y++) {
    objects.push({ key: 'fence', frame: 1, tx: pen.x + pen.w, ty: y, w: 1, h: 1, requiresUpgrade: 'coop' });
    coopTiles.push({ tx: pen.x + pen.w, ty: y });
  }
  objects.push({ key: 'fence', frame: 0, tx: pen.x + 3, ty: pen.y - 1, w: 1, h: 1, requiresUpgrade: 'coop' });
  coopTiles.push({ tx: pen.x + 3, ty: pen.y - 1 });
  for (let x = pen.x; x < pen.x + pen.w; x++) for (let y = pen.y; y < pen.y + pen.h; y++) coopTiles.push({ tx: x, ty: y });

  const hives = [
    { tx: 29, ty: 14 },
    { tx: 31, ty: 14 },
  ];
  hives.forEach((hv, i) => objects.push({ key: 'props', frame: 'hive', tx: hv.tx, ty: hv.ty, w: 1, h: 1, blocked: true, interact: 'hives', label: 'Honey', requiresUpgrade: i === 0 ? 'beehive' : 'beehive' }));

  // scattered trees and bushes
  const reserved = (x: number, y: number) => {
    if (x >= coopTx - 1 && x <= pen.x + pen.w + 1 && y >= coopTy - 1 && y <= pen.y + pen.h + 1) return true;
    if (x >= counter.tx - 1 && x <= counter.tx + 2 && y >= counter.ty - 1 && y <= counter.ty + 1) return true;
    if (x >= kitchen.tx - 1 && x <= kitchen.tx + 3 && y >= kitchen.ty - 1 && y <= kitchen.ty + 3) return true;
    if (x >= rest.tx - 1 && x <= rest.tx + 5 && y >= rest.ty - 2 && y <= rest.ty + 7) return true;
    if (x >= loveTree.tx - 1 && x <= loveTree.tx + 2 && y >= loveTree.ty - 1 && y <= loveTree.ty + 3) return true;
    if (x >= 27 && x <= 33 && y >= 13 && y <= 16) return true;
    if (y >= 19 && y <= 22 && x <= 8) return true;
    return false;
  };
  const free = (x: number, y: number, bw: number, bh: number) => {
    for (let yy = y - 1; yy <= y + bh; yy++) {
      for (let xx = x - 1; xx <= x + bw; xx++) {
        if (blocked[yy]?.[xx] !== false) return false;
        if (reserved(xx, yy)) return false;
        const t = tiles[yy][xx];
        if (t === T.PATH || t === T.SOIL || t === T.SAND || t === T.WATER || t === T.MAT) return false;
      }
    }
    return true;
  };
  let placed = 0;
  let tries = 0;
  while (placed < 8 && tries++ < 600) {
    const x = 2 + Math.floor(rnd() * (w - 6));
    const y = 2 + Math.floor(rnd() * (h - 6));
    if (!free(x, y, 2, 2)) continue;
    objects.push({ key: 'trees', frame: rnd() < 0.4 ? 2 + Math.floor(rnd() * 2) : Math.floor(rnd() * 2), tx: x, ty: y, w: 2, h: 2, blocked: true });
    blockRect(blocked, x, y, 2, 2);
    placed++;
  }
  placed = 0;
  tries = 0;
  while (placed < 10 && tries++ < 600) {
    const x = 2 + Math.floor(rnd() * (w - 4));
    const y = 2 + Math.floor(rnd() * (h - 4));
    if (!free(x, y, 1, 1)) continue;
    objects.push({ key: 'bushes', frame: Math.floor(rnd() * 3), tx: x, ty: y, w: 1, h: 1, blocked: true });
    blockRect(blocked, x, y, 1, 1);
    placed++;
  }

  // party decorations on special days
  const party = [
    { tx: houseTx - 1, ty: houseTy + 4 },
    { tx: houseTx + 8, ty: houseTy + 4 },
    { tx: rest.tx - 1, ty: rest.ty + 2 },
    { tx: rest.tx + 5, ty: rest.ty + 2 },
  ];

  return {
    id: 'farm',
    w,
    h,
    tiles,
    blocked,
    objects,
    portals: [
      { tx: doorTx, ty: doorTy, w: 1, h: 1, to: 'home', targetTx: 8, targetTy: 10, facing: 'up', label: 'Home' },
      { tx: rest.tx + 2, ty: rest.ty + 3, w: 1, h: 1, to: 'restaurant', targetTx: 10, targetTy: 10, facing: 'up', label: 'Restaurant' },
      { tx: w - 1, ty: roadY, w: 1, h: 2, to: 'town', targetTx: 1, targetTy: 18, facing: 'right', label: 'To Maple Town' },
      { tx: 0, ty: 20, w: 1, h: 2, to: 'ranch', targetTx: 33, targetTy: 12, facing: 'left', label: 'To Sunny Ranch' },
    ],
    npcs: [],
    forage: [],
    spawn: { tx: doorTx, ty: doorTy + 1 },
    farm,
    farmRect,
    upgradeBlocks: [
      { upgrade: 'coop', tiles: coopTiles },
      { upgrade: 'beehive', tiles: hives },
    ],
    pens: [pen, { ...pen, animal: 'duck' as const }],
    sprinklers,
    flowerBeds,
    hives,
    loveTree,
    companionAnchor: { tx: doorTx + 4, ty: doorTy + 3 },
    customerEntry: { tx: w - 2, ty: roadY },
    counterStop: { tx: counter.tx + 1, ty: roadY },
    roadY,
    party,
  };
}
