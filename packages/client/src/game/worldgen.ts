import { mulberry32 } from '../art/pixel';
import { T } from '../art/tiles';

export interface WorldObject {
  type: 'tree' | 'house' | 'stall' | 'fence' | 'bush' | 'mailbox' | 'kitchen' | 'counter';
  tx: number;
  ty: number;
  variant: number;
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface WorldDef {
  w: number;
  h: number;
  tiles: number[][];
  blocked: boolean[][];
  farm: Set<string>;
  objects: WorldObject[];
  spawn: { tx: number; ty: number };
  companionAnchor: { tx: number; ty: number };
  stall: { tx: number; ty: number };
  mailbox: { tx: number; ty: number };
  kitchen: { tx: number; ty: number };
  counter: { tx: number; ty: number };
  farmRect: Rect;
  /** Where customers appear and leave (east end of the road). */
  customerEntry: { tx: number; ty: number };
  roadY: number;
  /** Coop layout, only rendered/blocked once bought. */
  coop: { tx: number; ty: number; pen: Rect; fences: { tx: number; ty: number; variant: number }[]; blocked: { tx: number; ty: number }[] };
  flowerBeds: { tx: number; ty: number }[];
  sprinklers: { tx: number; ty: number }[];
}

export function generateWorld(seed = 3): WorldDef {
  const rnd = mulberry32(seed);
  const w = 44;
  const h = 28;
  const tiles: number[][] = [];
  const blocked: boolean[][] = [];
  const farm = new Set<string>();
  const objects: WorldObject[] = [];

  for (let y = 0; y < h; y++) {
    tiles.push([]);
    blocked.push([]);
    for (let x = 0; x < w; x++) {
      const r = rnd();
      let t: number = T.GRASS;
      if (r < 0.08) t = T.TUFT;
      else if (r < 0.14) t = T.FLOWER;
      else if (r < 0.19) t = T.FLOWER2;
      else if (r < 0.21) t = T.PEBBLE;
      else if (r < 0.25) t = T.CLOVER;
      else if (r < 0.5) t = T.GRASS2;
      tiles[y].push(t);
      blocked[y].push(false);
    }
  }

  const block = (x: number, y: number, bw = 1, bh = 1) => {
    for (let yy = y; yy < y + bh; yy++) for (let xx = x; xx < x + bw; xx++) if (blocked[yy]?.[xx] !== undefined) blocked[yy][xx] = true;
  };
  const fill = (x: number, y: number, bw: number, bh: number, t: number) => {
    for (let yy = y; yy < y + bh; yy++) for (let xx = x; xx < x + bw; xx++) if (tiles[yy]?.[xx] !== undefined) tiles[yy][xx] = t;
  };

  // border forest
  for (let y = 0; y < h; y += 2) {
    for (let x = 0; x < w; x += 2) {
      const edge = x < 2 || y < 2 || x >= w - 2 || y >= h - 2;
      if (!edge) continue;
      const variant = rnd() < 0.25 ? 2 + Math.floor(rnd() * 2) : Math.floor(rnd() * 2);
      objects.push({ type: 'tree', tx: x, ty: y, variant });
      block(x, y, 2, 2);
    }
  }

  // house
  const houseTx = 4;
  const houseTy = 3;
  objects.push({ type: 'house', tx: houseTx, ty: houseTy, variant: 0 });
  block(houseTx, houseTy, 7, 5);
  fill(houseTx, houseTy, 7, 5, T.GRASS);
  const doorTx = houseTx + 3;
  const doorTy = houseTy + 5;

  const mailbox = { tx: houseTx + 7, ty: houseTy + 4 };
  objects.push({ type: 'mailbox', tx: mailbox.tx, ty: mailbox.ty, variant: 0 });
  block(mailbox.tx, mailbox.ty);

  // outdoor kitchen right of the house
  const kitchen = { tx: houseTx + 8, ty: houseTy + 1 };
  objects.push({ type: 'kitchen', tx: kitchen.tx, ty: kitchen.ty, variant: 0 });
  block(kitchen.tx, kitchen.ty, 3, 2);
  fill(kitchen.tx, kitchen.ty + 2, 3, 1, T.PATH);

  // flower beds along the house front (decor upgrade)
  const flowerBeds = [
    { tx: houseTx, ty: houseTy + 5 },
    { tx: houseTx + 1, ty: houseTy + 5 },
    { tx: houseTx + 5, ty: houseTy + 5 },
    { tx: houseTx + 6, ty: houseTy + 5 },
  ];

  // farm field with picket fence
  const farmRect = { x: 15, y: 8, w: 12, h: 7 };
  fill(farmRect.x, farmRect.y, farmRect.w, farmRect.h, T.SOIL);
  for (let y = farmRect.y; y < farmRect.y + farmRect.h; y++) for (let x = farmRect.x; x < farmRect.x + farmRect.w; x++) farm.add(`${x},${y}`);
  const fx0 = farmRect.x - 1;
  const fy0 = farmRect.y - 1;
  const fx1 = farmRect.x + farmRect.w;
  const fy1 = farmRect.y + farmRect.h;
  const gapX = new Set([farmRect.x + 5, farmRect.x + 6]);
  for (let x = fx0; x <= fx1; x++) {
    objects.push({ type: 'fence', tx: x, ty: fy0, variant: 0 });
    block(x, fy0);
    if (!gapX.has(x)) {
      objects.push({ type: 'fence', tx: x, ty: fy1, variant: 0 });
      block(x, fy1);
    }
  }
  const gapY = new Set([farmRect.y + 3]);
  for (let y = fy0 + 1; y < fy1; y++) {
    if (!gapY.has(y)) {
      objects.push({ type: 'fence', tx: fx0, ty: y, variant: 1 });
      block(fx0, y);
    }
    objects.push({ type: 'fence', tx: fx1, ty: y, variant: 1 });
    block(fx1, y);
  }
  const sprinklers = [
    { tx: farmRect.x - 1, ty: farmRect.y - 1 },
    { tx: farmRect.x + farmRect.w, ty: farmRect.y - 1 },
    { tx: farmRect.x - 1, ty: farmRect.y + farmRect.h },
    { tx: farmRect.x + farmRect.w, ty: farmRect.y + farmRect.h },
  ];

  // pond
  const pond = { cx: 35.5, cy: 8.5, rx: 5.5, ry: 3.6 };
  for (let y = 2; y < h - 2; y++) {
    for (let x = 2; x < w - 2; x++) {
      const dx = (x + 0.5 - pond.cx) / pond.rx;
      const dy = (y + 0.5 - pond.cy) / pond.ry;
      const d = dx * dx + dy * dy;
      if (d <= 1) {
        tiles[y][x] = T.WATER;
        block(x, y);
      } else if (d <= 1.45) tiles[y][x] = T.SAND;
    }
  }

  // market stall
  const stall = { tx: 33, ty: 19 };
  objects.push({ type: 'stall', tx: stall.tx, ty: stall.ty, variant: 0 });
  block(stall.tx, stall.ty, 3, 2);

  // display counter by the road, customers stand on the road below it
  const roadY = 18;
  const counter = { tx: 12, ty: roadY - 2 };
  objects.push({ type: 'counter', tx: counter.tx, ty: counter.ty, variant: 0 });
  block(counter.tx, counter.ty, 2, 1);

  // roads
  fill(doorTx, doorTy, 1, roadY - doorTy + 1, T.PATH);
  fill(doorTx, roadY, w - 2 - doorTx, 1, T.PATH);
  fill(farmRect.x + 5, fy1, 2, roadY - fy1, T.PATH);
  fill(stall.tx, stall.ty + 2, 3, 1, T.PATH);
  fill(fx0 - 4, farmRect.y + 3, 4, 1, T.PATH);
  fill(doorTx, farmRect.y + 3, fx0 - 4 - doorTx + 1, 1, T.PATH);
  fill(counter.tx, counter.ty + 1, 2, 1, T.PATH);
  const customerEntry = { tx: w - 3, ty: roadY };

  // chicken coop (left of the path, below the house)
  const coopTx = 2;
  const coopTy = 11;
  const pen = { x: 2, y: 14, w: 4, h: 2 };
  const coopFences: { tx: number; ty: number; variant: number }[] = [];
  const coopBlocked: { tx: number; ty: number }[] = [];
  for (let x = coopTx; x < coopTx + 3; x++) for (let y = coopTy; y < coopTy + 2; y++) coopBlocked.push({ tx: x, ty: y });
  for (let x = pen.x; x < pen.x + pen.w + 1; x++) {
    coopFences.push({ tx: x, ty: pen.y + pen.h, variant: 0 });
    coopBlocked.push({ tx: x, ty: pen.y + pen.h });
  }
  for (let y = pen.y - 1; y < pen.y + pen.h; y++) {
    coopFences.push({ tx: pen.x + pen.w, ty: y, variant: 1 });
    coopBlocked.push({ tx: pen.x + pen.w, ty: y });
  }
  coopFences.push({ tx: pen.x + 3, ty: pen.y - 1, variant: 0 });
  coopBlocked.push({ tx: pen.x + 3, ty: pen.y - 1 });
  for (let x = pen.x; x < pen.x + pen.w; x++) for (let y = pen.y; y < pen.y + pen.h; y++) coopBlocked.push({ tx: x, ty: y });

  // scattered trees and bushes, avoiding everything important
  const reserved = (x: number, y: number) => {
    if (x >= coopTx - 1 && x <= pen.x + pen.w + 1 && y >= coopTy - 1 && y <= pen.y + pen.h + 1) return true;
    if (x >= counter.tx - 1 && x <= counter.tx + 2 && y >= counter.ty - 1 && y <= counter.ty + 1) return true;
    if (x >= kitchen.tx - 1 && x <= kitchen.tx + 3 && y >= kitchen.ty - 1 && y <= kitchen.ty + 3) return true;
    return false;
  };
  const free = (x: number, y: number, bw: number, bh: number) => {
    for (let yy = y - 1; yy <= y + bh; yy++) {
      for (let xx = x - 1; xx <= x + bw; xx++) {
        if (blocked[yy]?.[xx] !== false) return false;
        if (reserved(xx, yy)) return false;
        const t = tiles[yy][xx];
        if (t === T.PATH || t === T.SOIL || t === T.SAND || t === T.WATER) return false;
      }
    }
    return true;
  };
  let placed = 0;
  let tries = 0;
  while (placed < 9 && tries++ < 500) {
    const x = 2 + Math.floor(rnd() * (w - 6));
    const y = 2 + Math.floor(rnd() * (h - 6));
    if (!free(x, y, 2, 2)) continue;
    objects.push({ type: 'tree', tx: x, ty: y, variant: rnd() < 0.4 ? 2 + Math.floor(rnd() * 2) : Math.floor(rnd() * 2) });
    block(x, y, 2, 2);
    placed++;
  }
  placed = 0;
  tries = 0;
  while (placed < 10 && tries++ < 500) {
    const x = 2 + Math.floor(rnd() * (w - 4));
    const y = 2 + Math.floor(rnd() * (h - 4));
    if (!free(x, y, 1, 1)) continue;
    objects.push({ type: 'bush', tx: x, ty: y, variant: Math.floor(rnd() * 3) });
    block(x, y);
    placed++;
  }

  return {
    w,
    h,
    tiles,
    blocked,
    farm,
    objects,
    spawn: { tx: doorTx, ty: doorTy + 1 },
    companionAnchor: { tx: doorTx + 4, ty: doorTy + 3 },
    stall,
    mailbox,
    kitchen,
    counter,
    farmRect,
    customerEntry,
    roadY,
    coop: { tx: coopTx, ty: coopTy, pen, fences: coopFences, blocked: coopBlocked },
    flowerBeds,
    sprinklers,
  };
}
