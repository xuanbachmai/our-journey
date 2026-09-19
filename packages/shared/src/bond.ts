import type { AreaId } from './areas';
import type { Outfit } from './clothing';
import type { PlayerId } from './couple';
import type { FurnitureId } from './furniture';
import { dayIndex } from './prices';
import type { WorldState } from './world';

// ---------- Bond: the couple's shared level ----------

/** Points needed for each bond level (level 1 at 0 points). */
export const BOND_LEVELS = [0, 40, 110, 220, 380, 600, 880, 1250, 1700, 2300];
export const MAX_BOND = BOND_LEVELS.length;

export interface BondState {
  points: number;
  /** Local day index the daily caps belong to. */
  day: number;
  /** Points earned today per source, for the daily caps. */
  got: Record<string, number>;
}

/** Where bond points come from, and how many a day each source can give. */
export const BOND_SOURCES = {
  together_day: { points: 20, cap: 20, label: 'Both played today' },
  note: { points: 5, cap: 15, label: 'Left a note' },
  answer: { points: 5, cap: 5, label: 'Answered the question' },
  both_answered: { points: 10, cap: 10, label: 'Both answered' },
  coop: { points: 15, cap: 45, label: 'Cooked together' },
  photo: { points: 10, cap: 30, label: 'Photo together' },
  selfie: { points: 3, cap: 6, label: 'Took a photo' },
  gift: { points: 15, cap: 15, label: 'Gift for your love' },
  opened: { points: 5, cap: 10, label: 'Opened a gift' },
  matching: { points: 10, cap: 10, label: 'Matching outfits' },
  together_min: { points: 2, cap: 30, label: 'Time together' },
  hug: { points: 3, cap: 15, label: 'Hugs' },
  heart: { points: 2, cap: 6, label: 'Thinking of you' },
} as const;
export type BondSource = keyof typeof BOND_SOURCES;

export interface BondReward {
  level: number;
  text: string;
  coins?: number;
  furniture?: Partial<Record<FurnitureId, number>>;
  clothing?: string[];
  /** Extra dish price bonus from this level on. */
  priceBonus?: number;
}

export const BOND_REWARDS: BondReward[] = [
  { level: 2, text: 'A picnic blanket for dates', furniture: { picnic: 1 } },
  { level: 3, text: 'Made with love: dishes +3%', priceBonus: 0.03 },
  { level: 4, text: 'Matching heart headbands', clothing: ['hat:heartband'] },
  { level: 5, text: '+500 coins for a date night', coins: 500 },
  { level: 6, text: 'Made with love: dishes +6%', priceBonus: 0.03 },
  { level: 7, text: 'A couple bench for home', furniture: { lovebench: 1 } },
  { level: 8, text: 'Matching couple tees', clothing: ['top:coupletee'] },
  { level: 9, text: 'Made with love: dishes +10%', priceBonus: 0.04 },
  { level: 10, text: 'Golden rings, forever', clothing: ['accessory:rings'] },
];

export function emptyBond(now: number): BondState {
  return { points: 0, day: dayIndex(now), got: {} };
}

export function bondLevel(points: number): number {
  let lvl = 1;
  for (let i = 0; i < BOND_LEVELS.length; i++) if (points >= BOND_LEVELS[i]) lvl = i + 1;
  return lvl;
}

/** Progress within the current level: [have, need] or null at max. */
export function bondProgress(points: number): [number, number] | null {
  const lvl = bondLevel(points);
  if (lvl >= MAX_BOND) return null;
  return [points - BOND_LEVELS[lvl - 1], BOND_LEVELS[lvl] - BOND_LEVELS[lvl - 1]];
}

export function bondPriceBonus(points: number): number {
  const lvl = bondLevel(points);
  return BOND_REWARDS.filter((r) => r.level <= lvl && r.priceBonus).reduce((s, r) => s + (r.priceBonus ?? 0), 0);
}

/**
 * Adds bond points from a source, respecting its daily cap. Returns the points actually added.
 * Mutates the world.
 */
export function addBond(w: WorldState, source: BondSource, now: number, times = 1): number {
  const b = w.bond ?? emptyBond(now);
  const today = dayIndex(now);
  if (b.day !== today) {
    b.day = today;
    b.got = {};
  }
  const def = BOND_SOURCES[source];
  const room = Math.max(0, def.cap - (b.got[source] ?? 0));
  const pts = Math.min(room, def.points * times);
  if (pts > 0) {
    b.points += pts;
    b.got[source] = (b.got[source] ?? 0) + pts;
  }
  w.bond = b;
  return pts;
}

// ---------- Gifts for each other ----------

export interface PartnerGift {
  id: string;
  from: PlayerId;
  to: PlayerId;
  /** An item id, `dish:<recipe>:<grade>` or `furn:<id>`. */
  key: string;
  count: number;
  msg: string;
  at: number;
}

// ---------- Photos ----------

export type PhotoSpot = 'fountain' | 'lovetree' | 'pond' | 'lane' | 'ranch';

export const PHOTO_SPOTS: Record<PhotoSpot, { name: string; area: AreaId; sky: string; ground: string }> = {
  fountain: { name: 'Town fountain', area: 'town', sky: '#9fd8ff', ground: '#c9c9d9' },
  lovetree: { name: 'Our Love Tree', area: 'farm', sky: '#ffd0e8', ground: '#8ad84f' },
  pond: { name: 'Forest pond', area: 'forest', sky: '#ffb88a', ground: '#45b34f' },
  lane: { name: 'Family Lane', area: 'lane', sky: '#c9b8ff', ground: '#a6ea63' },
  ranch: { name: 'Sunny Ranch', area: 'ranch', sky: '#fff0a8', ground: '#8ad84f' },
};

export interface Photo {
  id: string;
  spot: PhotoSpot;
  day: string;
  by: PlayerId;
  /** Both of you were there. */
  together: boolean;
  outfits: Partial<Record<PlayerId, Outfit>>;
}

export const MAX_PHOTOS = 60;

// ---------- Matching outfits ----------

/** Same outfit style in the same colour, or the same hat. */
export function outfitsMatch(a: Outfit, b: Outfit): boolean {
  if (a.hat !== 'none' && a.hat === b.hat) return true;
  return (a.top ?? 'overalls') === (b.top ?? 'overalls') && a.dye !== 'default' && a.dye === b.dye;
}
