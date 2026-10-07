import { ITEMS, SELLABLE, type ItemId } from './items';
import { roll01 } from './prices';

/**
 * Shipping contracts: a town asks for a lot of one thing over a few days, and
 * pays well over the counter price for it. Where an order is something you can
 * fill this evening, a contract is something you plant for.
 */

export interface Contract {
  id: string;
  item: ItemId;
  qty: number;
  /** How much has been shipped so far. */
  done: number;
  reward: number;
  rep: number;
  /** Day index it must be finished by. */
  dueDay: number;
  from: string;
}

const BUYERS = ['Maple Grocers', 'The inn', 'Harbour market', 'The school kitchen', 'Nana Pim', 'The bakery', 'Riverside stall'];

/** How many contracts the board offers at once. */
export const CONTRACT_SLOTS = 3;
/** How many you may have running at once. */
export const MAX_ACTIVE_CONTRACTS = 2;

/** Contracts only ask for things a farm at this reputation can realistically make. */
function pool(reputation: number): ItemId[] {
  return SELLABLE.filter((i) => {
    const price = ITEMS[i].sellPrice;
    if (price > 60 && reputation < 8) return false;
    if (price > 110 && reputation < 18) return false;
    return true;
  });
}

/**
 * Deterministic from (seed, counter) the way daily orders are, so both players
 * see the same board without either of them having to be online.
 */
export function makeContract(seed: number, counter: number, reputation: number, day: number): Contract {
  const r = (salt: string) => roll01(`${seed}:contract:${counter}:${salt}`);
  const options = pool(reputation);
  const item = options[Math.floor(r('item') * options.length)];
  const price = ITEMS[item].sellPrice;
  // Big enough to need a plan, small enough to finish: cheap things in bulk,
  // dear things a handful at a time.
  const qty = Math.max(4, Math.round((120 + reputation * 8) / Math.max(8, price)) * (2 + Math.floor(r('qty') * 3)));
  const days = 2 + Math.floor(r('days') * 3);
  const reward = Math.round(price * qty * (1.8 + r('bonus') * 0.5));
  return { id: `c${counter}`, item, qty, done: 0, reward, rep: 3 + Math.floor(qty / 6), from: BUYERS[Math.floor(r('from') * BUYERS.length)], dueDay: day + days };
}

export function contractDone(c: Contract): boolean {
  return c.done >= c.qty;
}

export function contractExpired(c: Contract, day: number): boolean {
  return day > c.dueDay && !contractDone(c);
}

/** "today", "tomorrow", "in 3 days" — for the board. */
export function dueLabel(c: Contract, day: number): string {
  const left = c.dueDay - day;
  if (left <= 0) return 'today';
  if (left === 1) return 'tomorrow';
  return `in ${left} days`;
}
