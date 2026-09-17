import { dishPrice, RECIPES, unlockedRecipes, type BookId, type Dish, type RecipeId } from './recipes';

export const BASE_TABLES = 2;
export const MAX_TABLES = 5;
/** Seconds a diner waits before leaving unhappy. */
export const PATIENCE_S = 75;

export interface DinerOrder {
  recipe: RecipeId;
  /** Seconds of patience left when created. */
  patience: number;
}

/**
 * Pick what a diner wants. Cheap dishes are far more likely early on, so
 * a new restaurant is never asked for something impossible.
 */
export function pickDinerOrder(reputation: number, books: BookId[], rnd: () => number): DinerOrder {
  const pool = unlockedRecipes(reputation, books);
  const weights = pool.map((id) => 1 / (1 + RECIPES[id].basePrice / 120));
  const total = weights.reduce((a, b) => a + b, 0);
  let r = rnd() * total;
  let pick = pool[0];
  for (let i = 0; i < pool.length; i++) {
    r -= weights[i];
    if (r <= 0) {
      pick = pool[i];
      break;
    }
  }
  return { recipe: pick, patience: PATIENCE_S };
}

/** Seconds between diners entering while the restaurant is open (player inside). */
export function dinerIntervalS(reputation: number): number {
  return Math.max(12, 40 - reputation * 0.35);
}

export interface ServeResult {
  paid: number;
  tip: number;
  rep: number;
}

/** Payment for serving a dish; grade matters and speed earns a tip. */
export function serveValue(dish: Dish, reputation: number, cozyBonus: number, patienceLeft: number, requested: RecipeId): ServeResult {
  const base = dishPrice(dish, reputation, cozyBonus);
  const match = dish.recipe === requested;
  const paid = Math.round(base * (match ? 1.3 : 0.7));
  const speed = patienceLeft / PATIENCE_S;
  const tip = match ? Math.round(base * 0.4 * speed) : 0;
  return { paid, tip, rep: match ? 2 + dish.grade * 0.5 : 0.2 };
}
