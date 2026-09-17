import {
  bump,
  chickens,
  counterSlots,
  CROPS,
  currentQuest,
  dishPrice,
  emptyPlot,
  ITEMS,
  newWorld,
  questDone,
  SELLABLE,
  simulateWorld,
  UPGRADES,
  upgradeLevel,
  MAX_CHICKENS,
  type CropId,
  type Dish,
  type ItemId,
  type PlayerId,
  type PlotState,
  type UpgradeId,
  type WorldEvent,
  type WorldState,
} from '@hh/shared';

export interface SaveData {
  version: 2;
  world: WorldState;
  lastPlayer: PlayerId | null;
  selectedSeed: CropId;
  seenLetter: boolean;
  soundOn: boolean;
  musicOn: boolean;
}

const KEY = 'hearth-harvest-save-v1';

export function plotKey(tx: number, ty: number) {
  return `${tx},${ty}`;
}

function fresh(now: number): SaveData {
  return {
    version: 2,
    world: newWorld(now),
    lastPlayer: null,
    selectedSeed: 'tomato',
    seenLetter: false,
    soundOn: true,
    musicOn: true,
  };
}

export interface AwaySummary {
  awayMs: number;
  events: WorldEvent[];
}

/** Local-only world state. The server (M3) will own the WorldState later; this wrapper stays. */
export class GameState {
  data: SaveData;
  away: AwaySummary | null = null;
  private dirty = false;

  constructor() {
    const now = Date.now();
    this.data = this.load(now);
    const awayMs = now - this.data.world.lastSimulatedAt;
    const { world, events } = simulateWorld(this.data.world, now);
    this.data.world = world;
    if (awayMs > 30_000) this.away = { awayMs, events };
    this.save();
  }

  get world() {
    return this.data.world;
  }

  private load(now: number): SaveData {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return fresh(now);
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      if (parsed.version === 2) {
        const d = parsed as unknown as SaveData;
        d.world = { ...newWorld(now), ...d.world };
        return { ...fresh(now), ...d };
      }
      if (parsed.version === 1) {
        // migrate the first prototype's save
        const d = fresh(now);
        d.world.coins = (parsed.coins as number) ?? d.world.coins;
        d.world.inventory = (parsed.inventory as SaveData['world']['inventory']) ?? d.world.inventory;
        d.world.plots = (parsed.plots as SaveData['world']['plots']) ?? {};
        d.world.lastSimulatedAt = (parsed.lastSimulatedAt as number) ?? now;
        d.seenLetter = !!parsed.seenLetter;
        d.selectedSeed = (parsed.selectedSeed as CropId) ?? 'tomato';
        return d;
      }
      return fresh(now);
    } catch {
      return fresh(now);
    }
  }

  save() {
    try {
      localStorage.setItem(KEY, JSON.stringify(this.data));
      this.dirty = false;
    } catch {
      /* private mode etc. */
    }
  }

  saveIfDirty() {
    if (this.dirty) this.save();
  }

  touch() {
    this.dirty = true;
  }

  /** Advance to `now`; returns the events that happened. */
  tick(now: number): WorldEvent[] {
    const { world, events } = simulateWorld(this.data.world, now);
    this.data.world = world;
    this.dirty = true;
    return events;
  }

  // ----- plots -----
  plot(tx: number, ty: number): PlotState {
    return this.world.plots[plotKey(tx, ty)] ?? emptyPlot();
  }

  setPlot(tx: number, ty: number, p: PlotState) {
    this.world.plots[plotKey(tx, ty)] = p;
    this.touch();
  }

  // ----- inventory -----
  count(item: ItemId) {
    return this.world.inventory[item] ?? 0;
  }

  add(item: ItemId, n: number) {
    this.world.inventory[item] = Math.max(0, this.count(item) + n);
    this.touch();
  }

  get coins() {
    return this.world.coins;
  }

  addCoins(n: number) {
    this.world.coins = Math.max(0, this.world.coins + n);
    this.touch();
  }

  get reputation() {
    return this.world.reputation;
  }

  addRep(n: number) {
    this.world.reputation = Math.max(0, Math.min(100, this.world.reputation + n));
    this.touch();
  }

  stat(key: string, n = 1) {
    bump(this.world, key, n);
    this.touch();
  }

  get selectedSeed(): CropId {
    return this.data.selectedSeed;
  }

  set selectedSeed(c: CropId) {
    this.data.selectedSeed = c;
    this.touch();
  }

  // ----- market -----
  sellAllProduce(): { total: number; count: number } {
    let total = 0;
    let count = 0;
    for (const id of SELLABLE) {
      const n = this.count(id);
      if (n > 0) {
        total += n * ITEMS[id].sellPrice;
        count += n;
        this.world.inventory[id] = 0;
      }
    }
    this.world.coins += total;
    this.touch();
    return { total, count };
  }

  buySeed(id: CropId, qty = 1): boolean {
    const price = CROPS[id].seedPrice * qty;
    if (this.world.coins < price) return false;
    this.world.coins -= price;
    this.add(`seed:${id}`, qty);
    return true;
  }

  upgradeLevel(id: UpgradeId) {
    return upgradeLevel(this.world, id);
  }

  upgradePrice(id: UpgradeId): number | null {
    const def = UPGRADES[id];
    const lvl = this.upgradeLevel(id);
    if (lvl >= def.prices.length) return null;
    if (id === 'chicken' && lvl >= MAX_CHICKENS) return null;
    return def.prices[lvl];
  }

  canBuyUpgrade(id: UpgradeId): boolean {
    const def = UPGRADES[id];
    const price = this.upgradePrice(id);
    if (price === null) return false;
    if (def.requires && this.upgradeLevel(def.requires) === 0) return false;
    return this.world.coins >= price;
  }

  buyUpgrade(id: UpgradeId): boolean {
    if (!this.canBuyUpgrade(id)) return false;
    const price = this.upgradePrice(id) as number;
    this.world.coins -= price;
    this.world.upgrades[id] = this.upgradeLevel(id) + 1;
    if (id === 'counter') this.world.counter.push({ dish: null });
    if (id === 'flowers') this.addRep(5);
    if (id === 'chicken' && chickens(this.world) === 1) this.world.eggAnchor = Date.now();
    this.touch();
    return true;
  }

  // ----- dishes & counter -----
  addDish(d: Dish) {
    this.world.dishes.push(d);
    this.touch();
  }

  freeSlots(): number {
    return this.world.counter.filter((s) => !s.dish).length;
  }

  listDish(dishIndex: number): boolean {
    const slot = this.world.counter.findIndex((s) => !s.dish);
    if (slot === -1 || !this.world.dishes[dishIndex]) return false;
    const [d] = this.world.dishes.splice(dishIndex, 1);
    this.world.counter[slot].dish = d;
    this.stat('listed');
    return true;
  }

  takeDish(slot: number): boolean {
    const s = this.world.counter[slot];
    if (!s?.dish) return false;
    this.world.dishes.push(s.dish);
    s.dish = null;
    this.touch();
    return true;
  }

  priceOf(d: Dish) {
    return dishPrice(d, this.world.reputation);
  }

  slotCount() {
    return counterSlots(this.world);
  }

  // ----- chickens -----
  collectEggs(): number {
    const n = this.world.eggsWaiting;
    if (n <= 0) return 0;
    this.world.eggsWaiting = 0;
    this.add('egg', n);
    this.stat('egg', n);
    return n;
  }

  // ----- quests -----
  /** Returns the quest just completed (reward paid), if any. */
  checkQuest() {
    const q = currentQuest(this.world);
    if (q && questDone(q, this.world)) {
      this.world.questsClaimed.push(q.id);
      this.world.coins += q.reward;
      this.touch();
      return q;
    }
    return null;
  }
}
