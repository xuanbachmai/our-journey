import type { ItemId } from './items';
import { dishPrice, GRADE_REP, type Dish } from './recipes';
import { emptyPlot, isRipe, MAX_CATCHUP_MS, simulatePlot, type PlotState } from './growth';
import { BASE_COUNTER_SLOTS, type UpgradeId } from './upgrades';

/** Demo speeds. Production values will be far longer once the server exists. */
export const EGG_INTERVAL_MS = 3 * 60_000;
export const MAX_EGGS_WAITING = 8;
export const CUSTOMER_BUCKET_MS = 60_000;

export interface CounterSlot {
  dish: Dish | null;
}

export interface WorldState {
  coins: number;
  reputation: number;
  inventory: Partial<Record<ItemId, number>>;
  dishes: Dish[];
  plots: Record<string, PlotState>;
  counter: CounterSlot[];
  upgrades: Partial<Record<UpgradeId, number>>;
  eggsWaiting: number;
  eggAnchor: number;
  lastSimulatedAt: number;
  seed: number;
  stats: Record<string, number>;
  /** Ids of quests whose reward was claimed. */
  questsClaimed: string[];
}

export type WorldEvent =
  | { type: 'sale'; at: number; dish: Dish; price: number }
  | { type: 'customer_left'; at: number }
  | { type: 'ripe'; at: number; plotKey: string }
  | { type: 'eggs'; at: number; count: number };

export function newWorld(now: number, seed = (Math.random() * 1e9) | 0): WorldState {
  return {
    coins: 40,
    reputation: 0,
    inventory: { 'seed:tomato': 4, 'seed:carrot': 4, 'seed:wheat': 6, 'seed:strawberry': 2 },
    dishes: [],
    plots: {},
    counter: Array.from({ length: BASE_COUNTER_SLOTS }, () => ({ dish: null })),
    upgrades: {},
    eggsWaiting: 0,
    eggAnchor: now,
    lastSimulatedAt: now,
    seed,
    stats: {},
    questsClaimed: [],
  };
}

export function upgradeLevel(w: WorldState, id: UpgradeId): number {
  return w.upgrades[id] ?? 0;
}

export function counterSlots(w: WorldState): number {
  return BASE_COUNTER_SLOTS + upgradeLevel(w, 'counter');
}

export function chickens(w: WorldState): number {
  return upgradeLevel(w, 'chicken');
}

export function bump(w: WorldState, key: string, n = 1) {
  w.stats[key] = (w.stats[key] ?? 0) + n;
}

/** Deterministic 0..1 from (seed, bucket). Same bucket always gives the same roll. */
export function roll(seed: number, bucket: number, salt = 0): number {
  let h = (seed ^ 0x9e3779b9) >>> 0;
  h = Math.imul(h ^ bucket, 0x85ebca6b) >>> 0;
  h = Math.imul(h ^ (h >>> 13) ^ salt, 0xc2b2ae35) >>> 0;
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

/** Customers per minute. Quieter at night (local clock of the machine running the sim). */
export function customerRate(reputation: number, atMs: number): number {
  const hour = new Date(atMs).getHours();
  const night = hour >= 23 || hour < 7;
  return (0.5 + reputation * 0.03) * (night ? 0.4 : 1);
}

/**
 * Advance the whole world from its lastSimulatedAt to `now`.
 * Pure over the state object (returns a new one) and step-size independent:
 * customers are decided per absolute minute bucket, eggs by absolute intervals.
 */
export function simulateWorld(input: WorldState, now: number): { world: WorldState; events: WorldEvent[] } {
  const events: WorldEvent[] = [];
  const w: WorldState = {
    ...input,
    inventory: { ...input.inventory },
    dishes: input.dishes.slice(),
    plots: { ...input.plots },
    counter: input.counter.map((s) => ({ dish: s.dish })),
    upgrades: { ...input.upgrades },
    stats: { ...input.stats },
    questsClaimed: input.questsClaimed.slice(),
  };
  const from = Math.max(w.lastSimulatedAt, now - MAX_CATCHUP_MS);
  if (now <= from) return { world: w, events };

  // crops
  const sprinkler = upgradeLevel(w, 'sprinkler') > 0;
  for (const k in w.plots) {
    const before = w.plots[k];
    const src = sprinkler && before.crop ? { ...before, wateredUntil: Number.MAX_SAFE_INTEGER } : before;
    const after = simulatePlot(src, from, now);
    const out = sprinkler ? { ...after, wateredUntil: before.wateredUntil } : after;
    w.plots[k] = out;
    if (!isRipe(before) && isRipe(out)) events.push({ type: 'ripe', at: now, plotKey: k });
  }

  // customers: one roll per absolute minute bucket
  const firstBucket = Math.floor(from / CUSTOMER_BUCKET_MS) + 1;
  const lastBucket = Math.floor(now / CUSTOMER_BUCKET_MS);
  for (let b = firstBucket; b <= lastBucket; b++) {
    const at = b * CUSTOMER_BUCKET_MS;
    const rate = customerRate(w.reputation, at);
    // allow up to 3 arrivals in a busy minute
    const arrivals = Math.floor(rate) + (roll(w.seed, b, 1) < rate - Math.floor(rate) ? 1 : 0);
    for (let i = 0; i < Math.min(3, arrivals); i++) {
      const slot = pickSlot(w, roll(w.seed, b, 10 + i));
      if (slot === -1) {
        events.push({ type: 'customer_left', at });
        continue;
      }
      const dish = w.counter[slot].dish as Dish;
      const price = dishPrice(dish, w.reputation);
      w.counter[slot].dish = null;
      w.coins += price;
      w.reputation = Math.min(100, w.reputation + GRADE_REP[dish.grade]);
      bump(w, 'sale');
      bump(w, 'earned', price);
      bump(w, `sale:${dish.recipe}`);
      events.push({ type: 'sale', at, dish, price });
    }
  }

  // eggs
  const hens = chickens(w);
  if (hens > 0) {
    const laidRounds = Math.floor((now - w.eggAnchor) / EGG_INTERVAL_MS);
    if (laidRounds > 0) {
      const laid = Math.min(MAX_EGGS_WAITING - w.eggsWaiting, laidRounds * hens);
      if (laid > 0) {
        w.eggsWaiting += laid;
        events.push({ type: 'eggs', at: now, count: laid });
      }
      w.eggAnchor += laidRounds * EGG_INTERVAL_MS;
    }
  } else {
    w.eggAnchor = now;
  }

  w.lastSimulatedAt = now;
  return { world: w, events };
}

/** Customers prefer the priciest dish but sometimes grab another. -1 when the counter is empty. */
function pickSlot(w: WorldState, r: number): number {
  const filled = w.counter.map((s, i) => (s.dish ? i : -1)).filter((i) => i >= 0);
  if (!filled.length) return -1;
  if (r < 0.7) {
    let best = filled[0];
    for (const i of filled) if (dishPrice(w.counter[i].dish as Dish, w.reputation) > dishPrice(w.counter[best].dish as Dish, w.reputation)) best = i;
    return best;
  }
  return filled[Math.floor(r * filled.length) % filled.length];
}

export function plotAt(w: WorldState, key: string): PlotState {
  return w.plots[key] ?? emptyPlot();
}
