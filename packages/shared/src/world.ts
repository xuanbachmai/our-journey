import { ANIMALS, ANIMAL_IDS, MAX_WAITING_PER_TYPE, type AnimalId, type ProducerState } from './animals';
import type { AreaId, PlayerPlace } from './areas';
import { DEFAULT_OUTFIT, type Outfit } from './clothing';
import { type PlayerId, type Postcard, type SpecialDay } from './couple';
import { cozyBonus, type FurnitureId, type PlacedFurniture } from './furniture';
import { emptyPlot, isRipe, MAX_CATCHUP_MS, simulatePlot, type PlotState } from './growth';
import type { ItemId } from './items';
import { makeOrder, ORDER_SLOTS, type Order } from './orders';
import type { PetState } from './pets';
import { dayIndex } from './prices';
import { dishPrice, GRADE_REP, type BookId, type Dish } from './recipes';
import { BASE_COUNTER_SLOTS, BASE_DISH_CAP, type UpgradeId } from './upgrades';
import { DAY_MS, dayStart, weatherFor } from './weather';

export const CUSTOMER_BUCKET_MS = 60_000;

export interface CounterSlot {
  dish: Dish | null;
}

export interface PlayerData {
  place: PlayerPlace | null;
  outfit: Outfit;
  pet: PetState | null;
  /** Local day keys this player opened the game. Feeds the Love Tree. */
  daysPlayed: string[];
}

export interface WorldState {
  version: 3;
  seed: number;
  createdAt: number;
  coins: number;
  reputation: number;
  inventory: Partial<Record<ItemId, number>>;
  dishes: Dish[];
  plots: Record<string, PlotState>;
  counter: CounterSlot[];
  upgrades: Partial<Record<UpgradeId, number>>;
  producers: Partial<Record<AnimalId, ProducerState>>;
  books: BookId[];
  clothingOwned: string[];
  furnitureOwned: Partial<Record<FurnitureId, number>>;
  furniturePlaced: PlacedFurniture[];
  players: Record<PlayerId, PlayerData>;
  /** forage spot key -> epoch ms it was picked. */
  forageTaken: Record<string, number>;
  orders: Order[];
  orderCounter: number;
  orderDay: number;
  discovered: AreaId[];
  specialDays: SpecialDay[];
  postcards: Postcard[];
  stats: Record<string, number>;
  questsClaimed: string[];
  /** Today's three small tasks; created by refreshDaily. */
  daily?: DailyState;
  lastSimulatedAt: number;
  lastRainDay: number;
  /** Bumped on every player-caused change; used to pick the freshest copy when syncing. */
  changeCounter: number;
}

export interface DailyState {
  day: number;
  ids: string[];
  /** Stat values at the start of the day, so progress only counts today. */
  base: Record<string, number>;
  claimed: string[];
}

export type WorldEvent =
  | { type: 'sale'; at: number; dish: Dish; price: number }
  | { type: 'customer_left'; at: number }
  | { type: 'ripe'; at: number; plotKey: string }
  | { type: 'produce'; at: number; animal: AnimalId; count: number }
  | { type: 'rain'; at: number }
  | { type: 'orders'; at: number };

export function newPlayerData(): PlayerData {
  return { place: null, outfit: { ...DEFAULT_OUTFIT }, pet: null, daysPlayed: [] };
}

export function newWorld(now: number, seed = (Math.random() * 1e9) | 0): WorldState {
  const w: WorldState = {
    version: 3,
    seed,
    createdAt: now,
    coins: 60,
    reputation: 0,
    inventory: { 'seed:wheat': 6, 'seed:carrot': 4, 'seed:tomato': 4, 'seed:strawberry': 2 },
    dishes: [],
    plots: {},
    counter: Array.from({ length: BASE_COUNTER_SLOTS }, () => ({ dish: null })),
    upgrades: {},
    producers: {},
    books: [],
    clothingOwned: [],
    furnitureOwned: {},
    furniturePlaced: [],
    players: { xb: newPlayerData(), qd: newPlayerData() },
    forageTaken: {},
    orders: [],
    orderCounter: 0,
    orderDay: -1,
    discovered: ['farm'],
    specialDays: [],
    postcards: [],
    stats: {},
    questsClaimed: [],
    lastSimulatedAt: now,
    lastRainDay: dayIndex(now) - 1,
    changeCounter: 0,
  };
  refreshOrders(w, now);
  return w;
}

export function upgradeLevel(w: WorldState, id: UpgradeId): number {
  return w.upgrades[id] ?? 0;
}

/** How many of an animal fit: the base, plus room from the bigger coop or the second pasture level. */
export function animalMax(w: WorldState, id: AnimalId): number {
  const def = ANIMALS[id];
  if (id === 'horse' || id === 'bee') return def.max;
  if (def.home === 'farm') return def.max + (upgradeLevel(w, 'bigcoop') > 0 ? 2 : 0);
  return def.max + (upgradeLevel(w, 'pasture') >= 2 ? 2 : 0);
}

export function counterSlots(w: WorldState): number {
  return BASE_COUNTER_SLOTS + upgradeLevel(w, 'counter');
}

export function dishCap(w: WorldState): number {
  return upgradeLevel(w, 'bigbag') ? 12 : BASE_DISH_CAP;
}

export function animalCount(w: WorldState, id: AnimalId): number {
  return w.producers[id]?.count ?? 0;
}

export function cozy(w: WorldState): number {
  return cozyBonus(w.furniturePlaced);
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

/** Counter customers per minute. Quieter at night. */
export function customerRate(reputation: number, atMs: number): number {
  const hour = new Date(atMs).getHours();
  const night = hour >= 23 || hour < 7;
  return (0.5 + reputation * 0.03) * (night ? 0.4 : 1);
}

function refreshOrders(w: WorldState, now: number): boolean {
  const today = dayIndex(now);
  let changed = false;
  if (w.orderDay !== today) {
    w.orders = [];
    w.orderDay = today;
    changed = true;
  }
  while (w.orders.length < ORDER_SLOTS) {
    w.orders.push(makeOrder(w.seed, w.orderCounter++, w.reputation, w.books));
    changed = true;
  }
  return changed;
}

export function cloneWorld(input: WorldState): WorldState {
  return JSON.parse(JSON.stringify(input)) as WorldState;
}

/**
 * Advance the whole world from its lastSimulatedAt to `now`.
 * Pure (returns a new state) and step-size independent: customers are decided
 * per absolute minute bucket, animals by absolute intervals, rain by local day.
 */
export function simulateWorld(input: WorldState, now: number): { world: WorldState; events: WorldEvent[] } {
  const events: WorldEvent[] = [];
  const w = cloneWorld(input);
  const from = Math.max(w.lastSimulatedAt, now - MAX_CATCHUP_MS);
  if (now <= from) return { world: w, events };

  // ---- crops, day by day so rain can water them ----
  const sprinkler = upgradeLevel(w, 'sprinkler') > 0;
  const ripeBefore = new Set(Object.keys(w.plots).filter((k) => isRipe(w.plots[k])));
  let t = from;
  while (t < now) {
    const day = dayIndex(t);
    const dayEnd = dayStart(t) + DAY_MS;
    if (day > w.lastRainDay) {
      w.lastRainDay = day;
      if (weatherFor(w.seed, t) === 'rain') {
        for (const k in w.plots) if (w.plots[k].crop) w.plots[k] = { ...w.plots[k], wateredUntil: Math.max(w.plots[k].wateredUntil, dayEnd) };
        events.push({ type: 'rain', at: t });
      }
    }
    const next = Math.min(now, dayEnd);
    for (const k in w.plots) {
      const p = w.plots[k];
      if (!p.crop) continue;
      const src = sprinkler ? { ...p, wateredUntil: Number.MAX_SAFE_INTEGER } : p;
      const after = simulatePlot(src, t, next);
      w.plots[k] = sprinkler ? { ...after, wateredUntil: p.wateredUntil } : after;
    }
    t = next;
  }
  for (const k in w.plots) if (isRipe(w.plots[k]) && !ripeBefore.has(k)) events.push({ type: 'ripe', at: now, plotKey: k });

  // ---- counter customers ----
  const bonus = cozy(w);
  const firstBucket = Math.floor(from / CUSTOMER_BUCKET_MS) + 1;
  const lastBucket = Math.floor(now / CUSTOMER_BUCKET_MS);
  for (let b = firstBucket; b <= lastBucket; b++) {
    const at = b * CUSTOMER_BUCKET_MS;
    const rate = customerRate(w.reputation, at);
    const arrivals = Math.floor(rate) + (roll(w.seed, b, 1) < rate - Math.floor(rate) ? 1 : 0);
    for (let i = 0; i < Math.min(3, arrivals); i++) {
      const slot = pickSlot(w, roll(w.seed, b, 10 + i), bonus);
      if (slot === -1) {
        events.push({ type: 'customer_left', at });
        continue;
      }
      const dish = w.counter[slot].dish as Dish;
      const price = dishPrice(dish, w.reputation, bonus);
      w.counter[slot].dish = null;
      w.coins += price;
      w.reputation = Math.min(100, w.reputation + GRADE_REP[dish.grade]);
      bump(w, 'sale');
      bump(w, 'earned', price);
      bump(w, `sale:${dish.recipe}`);
      events.push({ type: 'sale', at, dish, price });
    }
  }

  // ---- animals ----
  for (const id of ANIMAL_IDS) {
    const p = w.producers[id];
    if (!p || !ANIMALS[id].product) continue;
    if (p.count <= 0) {
      p.anchor = now;
      continue;
    }
    const interval = ANIMALS[id].intervalMin * 60_000;
    const rounds = Math.floor((now - p.anchor) / interval);
    if (rounds > 0) {
      const made = Math.min(MAX_WAITING_PER_TYPE - p.waiting, rounds * p.count);
      if (made > 0) {
        p.waiting += made;
        events.push({ type: 'produce', at: now, animal: id, count: made });
      }
      p.anchor += rounds * interval;
    }
  }

  // ---- daily orders ----
  if (refreshOrders(w, now)) events.push({ type: 'orders', at: now });

  w.lastSimulatedAt = now;
  return { world: w, events };
}

/** Customers prefer the priciest dish but sometimes grab another. -1 when the counter is empty. */
function pickSlot(w: WorldState, r: number, bonus: number): number {
  const filled = w.counter.map((s, i) => (s.dish ? i : -1)).filter((i) => i >= 0);
  if (!filled.length) return -1;
  if (r < 0.7) {
    let best = filled[0];
    for (const i of filled) if (dishPrice(w.counter[i].dish as Dish, w.reputation, bonus) > dishPrice(w.counter[best].dish as Dish, w.reputation, bonus)) best = i;
    return best;
  }
  return filled[Math.floor(r * filled.length) % filled.length];
}

export function plotAt(w: WorldState, key: string): PlotState {
  return w.plots[key] ?? emptyPlot();
}

/** Bring any older save shape up to version 3. Unknown shapes get a fresh world. */
export function migrateWorld(raw: unknown, now: number): WorldState {
  const r = raw as Partial<WorldState> & { eggsWaiting?: number; eggAnchor?: number; upgrades?: Record<string, number> };
  if (!r || typeof r !== 'object') return newWorld(now);
  const w = newWorld(now, typeof r.seed === 'number' ? r.seed : undefined);
  const copy = <K extends keyof WorldState>(k: K) => {
    if (r[k] !== undefined) (w as WorldState)[k] = r[k] as WorldState[K];
  };
  (['coins', 'reputation', 'inventory', 'dishes', 'plots', 'counter', 'books', 'clothingOwned', 'furnitureOwned', 'furniturePlaced', 'forageTaken', 'discovered', 'specialDays', 'postcards', 'stats', 'questsClaimed', 'daily', 'lastSimulatedAt', 'changeCounter', 'orders', 'orderCounter', 'orderDay', 'lastRainDay', 'createdAt'] as (keyof WorldState)[]).forEach(copy);
  if (r.upgrades) {
    w.upgrades = { ...r.upgrades } as WorldState['upgrades'];
    // v2 kept chickens as an upgrade level
    const hens = (r.upgrades as Record<string, number>).chicken ?? 0;
    delete (w.upgrades as Record<string, number>).chicken;
    if (hens > 0) w.producers.chicken = { count: hens, anchor: r.eggAnchor ?? now, waiting: r.eggsWaiting ?? 0 };
  }
  if (r.producers) w.producers = { ...w.producers, ...r.producers };
  if (r.players) w.players = { xb: { ...newPlayerData(), ...r.players.xb }, qd: { ...newPlayerData(), ...r.players.qd } };
  for (const p of ['xb', 'qd'] as const) w.players[p].outfit = { ...DEFAULT_OUTFIT, ...w.players[p].outfit };
  if (!w.discovered.includes('farm')) w.discovered.push('farm');
  while (w.counter.length < counterSlots(w)) w.counter.push({ dish: null });
  if (!w.orders.length) refreshOrders(w, now);
  return w;
}
