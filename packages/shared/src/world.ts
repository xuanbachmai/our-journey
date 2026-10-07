import { ANIMALS, ANIMAL_IDS, MAX_WAITING_PER_TYPE, type AnimalId, type ProducerState } from './animals';
import type { AreaId, PlayerPlace } from './areas';
import { DEFAULT_OUTFIT, type Outfit } from './clothing';
import { type PlayerId, type Postcard, type SpecialDay } from './couple';
import { bondPriceBonus, type BondState, type PartnerGift, type Photo } from './bond';
import { cozyBonus, type FurnitureId, type PlacedFurniture } from './furniture';
import { emptyPlot, isRipe, MAX_CATCHUP_MS, simulatePlot, type PlotState } from './growth';
import { ITEMS, type ItemId } from './items';
import { makeOrder, ORDER_SLOTS, type Order } from './orders';
import { CONTRACT_SLOTS, contractExpired, makeContract, type Contract } from './contracts';
import { HAND_IDS, handWorking, type HandBook } from './hands';
import { MACHINES, MACHINE_IDS, MAX_READY, machineFree, type MachineBook, type MachineId } from './machines';
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
  /** When this player last did something (for "last here 2h ago"). */
  lastSeen?: number;
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
  /** Machines standing on the farm, what they are working on and what is waiting. */
  machines?: MachineBook;
  /** Shipping contracts on the board, and the ones taken on. */
  contracts?: Contract[];
  activeContracts?: Contract[];
  contractCounter?: number;
  contractDay?: number;
  /** Hand id -> the last day index they are paid for. */
  hands?: HandBook;
  /** Last day the hired help did their round. */
  handDay?: number;
  discovered: AreaId[];
  specialDays: SpecialDay[];
  postcards: Postcard[];
  stats: Record<string, number>;
  questsClaimed: string[];
  /** Today's three small tasks; created by refreshDaily. */
  daily?: DailyState;
  /** The couple bond: shared level and daily caps. */
  bond?: BondState;
  /** Wrapped gifts waiting for the other player. */
  giftBox?: PartnerGift[];
  photos?: Photo[];
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
  | { type: 'orders'; at: number }
  | { type: 'crafted'; at: number; machine: MachineId; count: number }
  | { type: 'hand'; at: number; hand: string; did: string }
  | { type: 'contract_expired'; at: number; contract: Contract };

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
    machines: {},
    contracts: [],
    activeContracts: [],
    contractCounter: 0,
    contractDay: -1,
    hands: {},
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
  refreshContracts(w, now);
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

/** Extra dish price from coziness and the couple bond. */
export function cozy(w: WorldState): number {
  return cozyBonus(w.furniturePlaced) + bondPriceBonus(w.bond?.points ?? 0);
}

export function bump(w: WorldState, key: string, n = 1) {
  w.stats[key] = (w.stats[key] ?? 0) + n;
}

/** Put something in the bag. Used by the simulation; the client has its own wrapper. */
export function give(w: WorldState, item: ItemId, n = 1) {
  w.inventory[item] = (w.inventory[item] ?? 0) + n;
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

/** Let the animals lay up to `upTo`, tallying what each one made. */
function collectAnimals(w: WorldState, upTo: number, tally: Partial<Record<AnimalId, number>>) {
  for (const id of ANIMAL_IDS) {
    const p = w.producers[id];
    if (!p || !ANIMALS[id].product) continue;
    if (p.count <= 0) {
      p.anchor = upTo;
      continue;
    }
    const interval = ANIMALS[id].intervalMin * 60_000;
    const rounds = Math.floor((upTo - p.anchor) / interval);
    if (rounds <= 0) continue;
    const made = Math.min(MAX_WAITING_PER_TYPE - p.waiting, rounds * p.count);
    if (made > 0) {
      p.waiting += made;
      tally[id] = (tally[id] ?? 0) + made;
    }
    p.anchor += rounds * interval;
  }
}

/**
 * Fill every free machine slot from the bag, best margin first. The tinker
 * does this each morning; the player can call it from the farm screen too.
 */
export function loadMachines(w: WorldState, now: number): number {
  let loaded = 0;
  for (const id of MACHINE_IDS) {
    const m = w.machines?.[id];
    if (!m || m.count <= 0) continue;
    const accepts = [...MACHINES[id].accepts].sort((a, b) => (ITEMS[a]?.sellPrice ?? 0) - (ITEMS[b]?.sellPrice ?? 0));
    while (machineFree(w.machines, id) > 0) {
      const item = accepts.find((i) => (w.inventory[i] ?? 0) > 0);
      if (!item) break;
      w.inventory[item] = (w.inventory[item] ?? 0) - 1;
      m.jobs.push({ input: item, startedAt: now, doneAt: now + MACHINES[id].minutes * 60_000 });
      loaded++;
    }
  }
  return loaded;
}

/** Keep three offers on the shipping board, replacing any that went stale. */
function refreshContracts(w: WorldState, now: number): boolean {
  const today = dayIndex(now);
  let changed = false;
  if (!w.contracts) {
    w.contracts = [];
    w.contractCounter = w.contractCounter ?? 0;
    changed = true;
  }
  if (w.contractDay !== today) {
    w.contracts = [];
    w.contractDay = today;
    changed = true;
  }
  while (w.contracts.length < CONTRACT_SLOTS) {
    w.contracts.push(makeContract(w.seed, (w.contractCounter = (w.contractCounter ?? 0) + 1), w.reputation, today));
    changed = true;
  }
  return changed;
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
  // Animals lay through the day loop as well, so the barn hand's morning
  // round finds what was actually there that morning.
  const produced: Partial<Record<AnimalId, number>> = {};
  let t = from;
  while (t < now) {
    const day = dayIndex(t);
    const dayEnd = dayStart(t) + DAY_MS;
    const raining = weatherFor(w.seed, t) === 'rain';
    if (day > w.lastRainDay) {
      w.lastRainDay = day;
      if (raining) events.push({ type: 'rain', at: t });
    }
    // ---- the hired help's morning round, once per day they are paid for ----
    if (day > (w.handDay ?? day - 1)) {
      w.handDay = day;
      if (handWorking(w.hands, 'water', day)) {
        let rows = 0;
        for (const k in w.plots) {
          const p = w.plots[k];
          if (!p.crop || isRipe(p)) continue;
          if (p.wateredUntil < dayEnd) rows++;
          w.plots[k] = { ...p, wateredUntil: Math.max(p.wateredUntil, dayEnd) };
        }
        if (rows) events.push({ type: 'hand', at: t, hand: 'water', did: `watered ${rows} row${rows === 1 ? '' : 's'}` });
      }
      if (handWorking(w.hands, 'barn', day)) {
        let got = 0;
        for (const id of ANIMAL_IDS) {
          const p = w.producers[id];
          const product = ANIMALS[id].product;
          if (!p || !product || p.waiting <= 0) continue;
          give(w, product, p.waiting);
          bump(w, 'collect', p.waiting);
          got += p.waiting;
          p.waiting = 0;
        }
        if (got) events.push({ type: 'hand', at: t, hand: 'barn', did: `brought in ${got}` });
      }
      if (handWorking(w.hands, 'tend', day)) {
        const loaded = loadMachines(w, t);
        if (loaded) events.push({ type: 'hand', at: t, hand: 'tend', did: `loaded ${loaded} batch${loaded === 1 ? '' : 'es'}` });
      }
    }

    // Reapply this for every tick so crops planted after the day's first rain
    // simulation are watered too.
    if (raining) {
      for (const k in w.plots) {
        const p = w.plots[k];
        if (!p.crop) continue;
        // rain counts as watering, so watering tasks still finish on rainy days
        if (p.wateredUntil <= t && !isRipe(p)) bump(w, 'water');
        w.plots[k] = { ...p, wateredUntil: Math.max(p.wateredUntil, dayEnd) };
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
    collectAnimals(w, next, produced);
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

  for (const id of ANIMAL_IDS) {
    if (produced[id]) events.push({ type: 'produce', at: now, animal: id, count: produced[id] as number });
  }

  // ---- machines finish their batches ----
  for (const id of MACHINE_IDS) {
    const m = w.machines?.[id];
    if (!m || !m.jobs.length) continue;
    const done = m.jobs.filter((j) => j.doneAt <= now);
    if (!done.length) continue;
    m.jobs = m.jobs.filter((j) => j.doneAt > now);
    const made = Math.min(done.length, MAX_READY - m.ready);
    if (made > 0) {
      m.ready += made;
      events.push({ type: 'crafted', at: now, machine: id, count: made });
    }
  }

  // ---- daily orders and the contract board ----
  if (refreshOrders(w, now)) events.push({ type: 'orders', at: now });
  for (const c of w.activeContracts ?? []) {
    if (contractExpired(c, dayIndex(now))) events.push({ type: 'contract_expired', at: now, contract: c });
  }
  if (w.activeContracts) w.activeContracts = w.activeContracts.filter((c) => !contractExpired(c, dayIndex(now)));
  refreshContracts(w, now);

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
  (['coins', 'reputation', 'inventory', 'dishes', 'plots', 'counter', 'books', 'clothingOwned', 'furnitureOwned', 'furniturePlaced', 'forageTaken', 'discovered', 'specialDays', 'postcards', 'stats', 'questsClaimed', 'daily', 'bond', 'giftBox', 'photos', 'lastSimulatedAt', 'changeCounter', 'orders', 'orderCounter', 'orderDay', 'lastRainDay', 'createdAt', 'machines', 'contracts', 'activeContracts', 'contractCounter', 'contractDay', 'hands', 'handDay'] as (keyof WorldState)[]).forEach(copy);
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
