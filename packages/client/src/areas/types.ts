import type { AreaId } from '@hh/shared';

/** What happens when the player presses the action button next to an object. */
export type InteractId =
  | 'stall'
  | 'kitchen'
  | 'counter'
  | 'mailbox'
  | 'coop'
  | 'hives'
  | 'barn'
  | 'board'
  | 'store'
  | 'tailor'
  | 'petshop'
  | 'wardrobe'
  | 'lovetree'
  | 'sign'
  | 'question'
  | 'album';

export interface AreaObject {
  key: string;
  frame?: string | number;
  tx: number;
  ty: number;
  /** Footprint in tiles (for blocking and interaction reach). */
  w: number;
  h: number;
  /** Pixel offset applied to the sprite's bottom edge (some sprites hang over their footprint). */
  dy?: number;
  blocked?: boolean;
  interact?: InteractId;
  label?: string;
  /** Text shown for signs. */
  text?: string;
  /** Only shown when this upgrade is owned. */
  requiresUpgrade?: string;
  /** Render behind everything (floor decals). */
  floor?: boolean;
}

export interface Portal {
  tx: number;
  ty: number;
  w: number;
  h: number;
  to: AreaId;
  /** Where the player appears in the target area. */
  targetTx: number;
  targetTy: number;
  facing?: 'up' | 'down' | 'left' | 'right';
  label: string;
}

export interface NpcDef {
  id: string;
  lookId: string;
  tx: number;
  ty: number;
  /** Wander radius in tiles; 0 = stands still. */
  wander: number;
  lines: string[];
  /** Shopkeepers open a panel instead of just talking. */
  opens?: 'store' | 'tailor' | 'petshop';
}

export interface ForageSpot {
  key: string;
  tx: number;
  ty: number;
  item: 'mushroom' | 'berry' | 'herb';
  /** Minutes to respawn. */
  respawnMin: number;
}

export interface DinerTable {
  tx: number;
  ty: number;
  /** Chair tile where the diner sits. */
  chairTx: number;
  chairTy: number;
}

export interface Pen {
  x: number;
  y: number;
  w: number;
  h: number;
  animal: 'chicken' | 'cow' | 'sheep';
}

export interface AreaDef {
  id: AreaId;
  w: number;
  h: number;
  tiles: number[][];
  blocked: boolean[][];
  objects: AreaObject[];
  portals: Portal[];
  npcs: NpcDef[];
  forage: ForageSpot[];
  spawn: { tx: number; ty: number };
  /** Farm-only: tillable tiles. */
  farm?: Set<string>;
  farmRect?: { x: number; y: number; w: number; h: number };
  /** Home-only: floor rect furniture can be placed on. */
  floorRect?: { x: number; y: number; w: number; h: number };
  /** Restaurant-only. */
  tables?: DinerTable[];
  /** Where diners enter from. */
  dinerEntry?: { tx: number; ty: number };
  pens?: Pen[];
  /** Objects unlocked by upgrades that also block tiles. */
  upgradeBlocks?: { upgrade: string; tiles: { tx: number; ty: number }[] }[];
  sprinklers?: { tx: number; ty: number }[];
  flowerBeds?: { tx: number; ty: number }[];
  hives?: { tx: number; ty: number }[];
  loveTree?: { tx: number; ty: number };
  companionAnchor?: { tx: number; ty: number };
  customerEntry?: { tx: number; ty: number };
  counterStop?: { tx: number; ty: number };
  roadY?: number;
  /** Ambient decoration positions for special days. */
  party?: { tx: number; ty: number }[];
}

export function grid(w: number, h: number, v: number): number[][] {
  return Array.from({ length: h }, () => Array.from({ length: w }, () => v));
}

export function blockRect(blocked: boolean[][], x: number, y: number, w: number, h: number, v = true) {
  for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) if (blocked[yy]?.[xx] !== undefined) blocked[yy][xx] = v;
}

export function fillRect(tiles: number[][], x: number, y: number, w: number, h: number, t: number) {
  for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) if (tiles[yy]?.[xx] !== undefined) tiles[yy][xx] = t;
}

export function boolGrid(w: number, h: number, v: boolean): boolean[][] {
  return Array.from({ length: h }, () => Array.from({ length: w }, () => v));
}
