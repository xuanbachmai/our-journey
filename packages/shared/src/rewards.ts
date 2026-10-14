import { clothingDef, clothingKey, CLOTHING_KINDS, type ClothingKind } from './clothing';
import { costume, costumePieces } from './costumes';
import { FURNITURE, type FurnitureId } from './furniture';
import { ITEMS, type ItemId } from './items';
import { MACHINES, MAX_MACHINES, type MachineId } from './machines';
import { emptyBond } from './bond';
import { bump, type WorldState } from './world';

/**
 * A parcel of things a gift code hands over. Everything is optional, so a code
 * can be one bag of coins or a whole outfit with a note attached.
 */
export interface Reward {
  coins?: number;
  reputation?: number;
  /** Item id -> how many. */
  items?: Partial<Record<ItemId, number>>;
  /** Clothing keys, e.g. "hat:crown". */
  clothing?: string[];
  /** A whole look, by its id: hands over every piece. */
  costume?: string;
  furniture?: Partial<Record<FurnitureId, number>>;
  /** Machine id -> how many to drop in the yard. */
  machines?: Partial<Record<MachineId, number>>;
  /** Points on the couple bond. */
  bond?: number;
}

/** One line per thing given, for the "you got" panel. */
export type RewardLine = { icon: string; text: string };

const MAX_GIFT_COINS = 1_000_000;

/**
 * Hand a reward to a world, in place. Returns a line per thing given, so the
 * panel can list what arrived; anything unknown is skipped rather than
 * throwing, because a code may be written for a later version of the game.
 */
export function applyReward(w: WorldState, r: Reward): RewardLine[] {
  const lines: RewardLine[] = [];

  if (r.coins && r.coins > 0) {
    const n = Math.min(Math.floor(r.coins), MAX_GIFT_COINS);
    w.coins += n;
    bump(w, 'earned', n);
    lines.push({ icon: 'coin', text: `${n} coins` });
  }

  if (r.reputation && r.reputation > 0) {
    const before = w.reputation;
    w.reputation = Math.min(100, w.reputation + r.reputation);
    const got = Math.round(w.reputation - before);
    if (got > 0) lines.push({ icon: 'heart', text: `+${got} reputation` });
  }

  for (const [id, n] of Object.entries(r.items ?? {})) {
    const item = id as ItemId;
    if (!ITEMS[item] || !n || n <= 0) continue;
    w.inventory[item] = (w.inventory[item] ?? 0) + Math.floor(n);
    lines.push({ icon: ITEMS[item].icon, text: `${Math.floor(n)} ${ITEMS[item].name}` });
  }

  const give = (key: string, label: string, icon: string) => {
    if (w.clothingOwned.includes(key)) return;
    w.clothingOwned.push(key);
    lines.push({ icon, text: label });
  };

  for (const key of r.clothing ?? []) {
    const [kind, id] = key.split(':');
    if (!kind || !id) continue;
    // a piece that does not exist would sit in the wardrobe list for ever
    const def = CLOTHING_KINDS.includes(kind as ClothingKind) ? clothingDef(kind as ClothingKind, id) : undefined;
    if (!def) continue;
    give(clothingKey(kind as ClothingKind, id), def.name, 'bag');
  }

  if (r.costume) {
    const c = costume(r.costume);
    if (c) {
      for (const p of costumePieces(c)) give(p.key, clothingDef(p.kind, p.id)?.name ?? p.id, 'bag');
      lines.push({ icon: 'bag', text: `the ${c.name} look` });
    }
  }

  for (const [id, n] of Object.entries(r.furniture ?? {})) {
    const f = id as FurnitureId;
    if (!FURNITURE[f] || !n || n <= 0) continue;
    w.furnitureOwned[f] = (w.furnitureOwned[f] ?? 0) + Math.floor(n);
    lines.push({ icon: 'table', text: FURNITURE[f].name });
  }

  for (const [id, n] of Object.entries(r.machines ?? {})) {
    const m = id as MachineId;
    if (!MACHINES[m] || !n || n <= 0) continue;
    if (!w.machines) w.machines = {};
    const have = w.machines[m] ?? { count: 0, jobs: [], ready: 0 };
    const add = Math.min(Math.floor(n), MAX_MACHINES - have.count);
    if (add <= 0) continue;
    have.count += add;
    w.machines[m] = have;
    lines.push({ icon: MACHINES[m].icon, text: MACHINES[m].name });
  }

  if (r.bond && r.bond > 0) {
    // straight onto the total: a gift code is not one of the daily-capped
    // sources, so it does not go through addBond
    const bond = w.bond ?? emptyBond(Date.now());
    bond.points += Math.floor(r.bond);
    w.bond = bond;
    lines.push({ icon: 'heart', text: `${Math.floor(r.bond)} on your bond` });
  }

  w.changeCounter++;
  return lines;
}

/** Codes are typed by hand, so they are compared loosely. */
export function normaliseGiftCode(raw: string): string {
  return raw.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
}
