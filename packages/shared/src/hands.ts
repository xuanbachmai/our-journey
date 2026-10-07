/**
 * Hired help. You pay a week up front and someone keeps the farm ticking on
 * the mornings you are not there: the watering done, the barn emptied, the
 * machines reloaded. It is the one part of the game you buy instead of doing,
 * which is what makes the farm feel like it is yours even when it is quiet.
 */

export type HandId = 'water' | 'barn' | 'tend';

export interface HandDef {
  id: HandId;
  name: string;
  /** What they do each morning. */
  desc: string;
  /** Coins per day. Hiring pays a week at once. */
  wage: number;
  icon: string;
  unlockRep: number;
}

export const HANDS: Record<HandId, HandDef> = {
  water: { id: 'water', name: 'Mina the waterer', desc: 'Waters every planted row each morning', wage: 90, icon: 'can', unlockRep: 0 },
  barn: { id: 'barn', name: 'Bo the barn hand', desc: 'Gathers eggs, milk and wool into your bag', wage: 130, icon: 'egg', unlockRep: 8 },
  tend: { id: 'tend', name: 'Rue the tinker', desc: 'Reloads your machines from the bag', wage: 180, icon: 'mill', unlockRep: 14 },
};

export const HAND_IDS: HandId[] = ['water', 'barn', 'tend'];
/** A hire covers this many days. */
export const HIRE_DAYS = 7;

export type HandBook = Partial<Record<HandId, number>>;

export function hireCost(id: HandId, days = HIRE_DAYS): number {
  return HANDS[id].wage * days;
}

/** True while this hand is still being paid for on the given day. */
export function handWorking(hands: HandBook | undefined, id: HandId, day: number): boolean {
  return (hands?.[id] ?? -1) >= day;
}

/** Days left on the contract, 0 when they have gone home. */
export function handDaysLeft(hands: HandBook | undefined, id: HandId, today: number): number {
  return Math.max(0, (hands?.[id] ?? today - 1) - today + 1);
}
