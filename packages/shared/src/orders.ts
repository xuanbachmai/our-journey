import { ITEMS, SELLABLE, type ItemId } from './items';
import { RECIPES, unlockedRecipes, type BookId, type RecipeId } from './recipes';
import { roll01 } from './prices';

export interface Order {
  id: string;
  /** Either a dish or a produce item. */
  dish?: RecipeId;
  item?: ItemId;
  qty: number;
  reward: number;
  rep: number;
  /** Who asked, for flavour. */
  from: string;
}

const NAMES = ['Mabel', 'Finn', 'Rosa', 'Old Tom', 'Lily', 'The mayor', 'Grandma June', 'Pip', 'Hana', 'Bo'];

/** Deterministic order from (seed, counter); the counter advances with every order completed or day rolled. */
export function makeOrder(seed: number, counter: number, reputation: number, books: BookId[]): Order {
  const r = (salt: string) => roll01(`${seed}:order:${counter}:${salt}`);
  const from = NAMES[Math.floor(r('name') * NAMES.length)];
  const wantDish = r('kind') < 0.6;
  if (wantDish) {
    const pool = unlockedRecipes(reputation, books);
    const dish = pool[Math.floor(r('dish') * pool.length)];
    const qty = 1 + (r('qty') < 0.3 ? 1 : 0);
    const value = RECIPES[dish].basePrice * qty;
    return { id: `o${counter}`, dish, qty, reward: Math.round(value * 1.6), rep: 2 + qty, from };
  }
  const pool = SELLABLE.filter((i) => !['wool', 'honey', 'milk'].includes(i) || reputation >= 10);
  const item = pool[Math.floor(r('item') * pool.length)];
  const qty = 2 + Math.floor(r('qty') * 3);
  const value = ITEMS[item].sellPrice * qty;
  return { id: `o${counter}`, item, qty, reward: Math.round(value * 1.7), rep: 1 + Math.floor(qty / 2), from };
}

export const ORDER_SLOTS = 2;
