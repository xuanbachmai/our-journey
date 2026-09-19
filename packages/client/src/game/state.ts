import {
  ACCESSORIES,
  ANIMALS,
  animalCount,
  animalMax,
  BOOKS,
  bump,
  addBond,
  BOND_REWARDS,
  bondLevel,
  MAX_PHOTOS,
  otherPlayer,
  outfitsMatch,
  type BondSource,
  type PartnerGift,
  type Photo,
  type PhotoSpot,
  clothingDef,
  clothingKey,
  clothingSaleToday,
  furnitureSaleToday,
  isFreeClothing,
  salePrice,
  SEEDS_PER_CROP,
  type ClothingKind,
  counterSlots,
  cozy,
  CROPS,
  CHAPTERS,
  dayIndex,
  friendPoints,
  GIFT_POINTS,
  giftedToday,
  giftReaction,
  HEART_POINTS,
  heartsFor,
  MAX_HEARTS,
  TALK_POINTS,
  talkedToday,
  villager,
  type FishDef,
  type FriendReward,
  type GiftReaction,
  type RecipeId,
  type VillagerDef,
  currentChapter,
  DAILY_BONUS,
  dailyDefs,
  dailyProgress,
  refreshDaily,
  daysTogether,
  dayKey,
  dishCap,
  dishPrice,
  DYES,
  emptyPlot,
  FURNITURE,
  HAIR_COLORS,
  HATS,
  ITEMS,
  loveTreeStage,
  migrateWorld,
  newWorld,
  PET_AFFECTION_PER_PET,
  PET_COOLDOWN_MS,
  PET_GIFTS,
  PETS,
  POSTCARD_MILESTONES,
  SELLABLE,
  sellPriceToday,
  simulateWorld,
  UPGRADES,
  upgradeLevel,
  MAX_TABLES,
  BASE_TABLES,
  type AnimalId,
  type AreaId,
  type BookId,
  type CropId,
  type Dish,
  type FurnitureId,
  type ItemId,
  type Order,
  type Outfit,
  type PetId,
  type PlacedFurniture,
  type PlayerId,
  type PlotState,
  type Postcard,
  type UpgradeId,
  type WorldEvent,
  type WorldState,
} from '@hh/shared';

export interface SaveData {
  version: 3;
  world: WorldState;
  lastPlayer: PlayerId | null;
  selectedSeed: CropId;
  seenLetter: boolean;
  soundOn: boolean;
  musicOn: boolean;
  /** Show the bouncing arrow toward the next task. */
  guideOn: boolean;
}

const KEY = 'our-journey-save-v3';
const OLD_KEY = 'hearth-harvest-save-v1';

export function plotKey(tx: number, ty: number) {
  return `${tx},${ty}`;
}

export type ProgressEvent =
  | { kind: 'task'; title: string; reward: number }
  | { kind: 'chapter'; number: number; title: string; rewardText: string; next: string | null }
  | { kind: 'daily'; title: string; reward: number }
  | { kind: 'dailyAll'; reward: number }
  | { kind: 'friend'; name: string; hearts: number; text: string }
  | { kind: 'bond'; level: number; text: string }
  | { kind: 'match'; partner: PlayerId };

export interface AwaySummary {
  awayMs: number;
  events: WorldEvent[];
  /** What your partner did since you last looked. */
  partner?: { id: PlayerId; news: { key: string; n: number }[] };
}

/** Actions counted per player, so each of you can see what the other did. */
export const TRACKED_STATS = ['harvest', 'plant', 'water', 'cook', 'served', 'fish', 'forage', 'gifts', 'photos', 'note'];

/**
 * The world plus local preferences. Every player-caused change goes through
 * touch(), which bumps the change counter and notifies the sync layer.
 */
export class GameState {
  data: SaveData;
  away: AwaySummary | null = null;
  me: PlayerId = 'xb';
  /** Called after player-caused changes (used by online sync). */
  onChange: ((w: WorldState) => void) | null = null;
  private dirty = false;

  constructor(initialWorld?: WorldState) {
    const now = Date.now();
    this.data = this.load(now);
    // Hosted farms may have been created by an older client. Apply the same
    // migration path used for local saves before the simulator touches them.
    if (initialWorld) this.data.world = migrateWorld(initialWorld, now);
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
    const fresh = (): SaveData => ({ version: 3, world: newWorld(now), lastPlayer: null, selectedSeed: 'wheat', seenLetter: false, soundOn: true, musicOn: true, guideOn: true });
    try {
      const raw = localStorage.getItem(KEY) ?? localStorage.getItem(OLD_KEY);
      if (!raw) return fresh();
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      const d = fresh();
      if (parsed.version === 3 && parsed.world) {
        d.world = migrateWorld(parsed.world, now);
      } else if (parsed.version === 2 && parsed.world) {
        d.world = migrateWorld(parsed.world, now);
      } else if (parsed.version === 1) {
        d.world = migrateWorld({ coins: parsed.coins, inventory: parsed.inventory, plots: parsed.plots, lastSimulatedAt: parsed.lastSimulatedAt }, now);
      }
      d.lastPlayer = (parsed.lastPlayer as PlayerId) ?? null;
      d.selectedSeed = (parsed.selectedSeed as CropId) ?? 'wheat';
      if (!CROPS[d.selectedSeed]) d.selectedSeed = 'wheat';
      d.seenLetter = !!parsed.seenLetter;
      d.soundOn = parsed.soundOn !== false;
      d.musicOn = parsed.musicOn !== false;
      d.guideOn = parsed.guideOn !== false;
      return d;
    } catch {
      return fresh();
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

  /** Mark a player-caused change. */
  touch() {
    this.dirty = true;
    this.world.changeCounter++;
    this.onChange?.(this.world);
  }

  /** Adopt a copy received from the partner. Keeps nothing local; the caller refreshes the scene. */
  replaceWorld(w: WorldState) {
    this.data.world = w;
    this.dirty = true;
  }

  tick(now: number): WorldEvent[] {
    const { world, events } = simulateWorld(this.data.world, now);
    this.data.world = world;
    this.dirty = true;
    return events;
  }

  // ----- players -----
  get meData() {
    return this.world.players[this.me];
  }

  setPlace(area: AreaId, x: number, y: number) {
    this.meData.place = { area, x, y };
    this.dirty = true;
  }

  /** Records today for the Love Tree. Returns true if it is a new day for me. */
  markPlayedToday(): boolean {
    const k = dayKey(Date.now());
    const list = this.meData.daysPlayed;
    if (list.includes(k)) return false;
    list.push(k);
    this.touch();
    return true;
  }

  get daysTogether() {
    return daysTogether({ xb: this.world.players.xb.daysPlayed, qd: this.world.players.qd.daysPlayed });
  }

  get loveTreeStage() {
    return loveTreeStage(this.daysTogether);
  }

  discover(area: AreaId): boolean {
    if (this.world.discovered.includes(area)) return false;
    this.world.discovered.push(area);
    this.touch();
    return true;
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
    if (TRACKED_STATS.includes(key)) bump(this.world, `by:${this.me}:${key}`, n);
    this.touch();
  }

  /** Your partner's activity since you last looked; marks it seen. */
  partnerNews(): { key: string; n: number }[] {
    const w = this.world;
    const other = otherPlayer(this.me);
    const out: { key: string; n: number }[] = [];
    for (const key of TRACKED_STATS) {
      const cur = w.stats[`by:${other}:${key}`] ?? 0;
      const seenKey = `seen:${this.me}:${key}`;
      const seen = w.stats[seenKey] ?? 0;
      if (cur > seen) out.push({ key, n: cur - seen });
      w.stats[seenKey] = cur;
    }
    if (out.length) this.touch();
    return out;
  }

  get selectedSeed(): CropId {
    return this.data.selectedSeed;
  }

  set selectedSeed(c: CropId) {
    this.data.selectedSeed = c;
    this.dirty = true;
  }

  // ----- prices & selling -----
  sellPrice(item: ItemId) {
    return sellPriceToday(item, this.world.seed, Date.now());
  }

  sellAllProduce(): { total: number; count: number } {
    let total = 0;
    let count = 0;
    for (const id of SELLABLE) {
      const n = this.count(id);
      if (n > 0) {
        total += n * this.sellPrice(id);
        count += n;
        this.world.inventory[id] = 0;
      }
    }
    bump(this.world, 'sold', count);
    this.world.coins += total;
    this.touch();
    return { total, count };
  }

  sellItem(id: ItemId, qty: number): number {
    const n = Math.min(qty, this.count(id));
    if (n <= 0) return 0;
    const total = n * this.sellPrice(id);
    this.world.inventory[id] = this.count(id) - n;
    bump(this.world, 'sold', n);
    this.world.coins += total;
    this.touch();
    return total;
  }

  seedUnlocked(id: CropId) {
    return CROPS[id].unlockRep <= this.reputation;
  }

  buySeed(id: CropId, qty = 1): boolean {
    if (!Number.isInteger(qty) || qty <= 0) return false;
    const price = CROPS[id].seedPrice * qty;
    if (this.world.coins < price || !this.seedUnlocked(id)) return false;
    this.world.coins -= price;
    bump(this.world, 'buyseed', qty);
    this.add(`seed:${id}`, qty);
    return true;
  }

  // ----- upgrades & books -----
  upgradeLevel(id: UpgradeId) {
    return upgradeLevel(this.world, id);
  }

  upgradePrice(id: UpgradeId): number | null {
    const def = UPGRADES[id];
    const lvl = this.upgradeLevel(id);
    if (lvl >= def.prices.length) return null;
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
    this.world.coins -= this.upgradePrice(id) as number;
    this.world.upgrades[id] = this.upgradeLevel(id) + 1;
    if (id === 'counter') this.world.counter.push({ dish: null });
    if (id === 'flowers') this.world.reputation = Math.min(100, this.world.reputation + 5);
    this.touch();
    return true;
  }

  hasBook(id: BookId) {
    return this.world.books.includes(id);
  }

  buyBook(id: BookId): boolean {
    if (this.hasBook(id) || this.world.coins < BOOKS[id].price) return false;
    this.world.coins -= BOOKS[id].price;
    this.world.books.push(id);
    this.touch();
    return true;
  }

  get tables() {
    return Math.min(MAX_TABLES, BASE_TABLES + this.upgradeLevel('tables'));
  }

  // ----- dishes & counter -----
  get dishCap() {
    return dishCap(this.world);
  }

  addDish(d: Dish): boolean {
    if (this.world.dishes.length >= this.dishCap) return false;
    this.world.dishes.push(d);
    this.touch();
    return true;
  }

  removeDish(index: number): Dish | null {
    if (!Number.isInteger(index) || index < 0 || index >= this.world.dishes.length) return null;
    const d = this.world.dishes.splice(index, 1)[0] ?? null;
    if (d) this.touch();
    return d;
  }

  freeSlots(): number {
    return this.world.counter.filter((s) => !s.dish).length;
  }

  listDish(dishIndex: number): boolean {
    const slot = this.world.counter.findIndex((s) => !s.dish);
    if (slot === -1 || !this.world.dishes[dishIndex]) return false;
    const [d] = this.world.dishes.splice(dishIndex, 1);
    this.world.counter[slot].dish = d;
    bump(this.world, 'listed');
    this.touch();
    return true;
  }

  takeDish(slot: number): boolean {
    const s = this.world.counter[slot];
    if (!s?.dish || this.world.dishes.length >= this.dishCap) return false;
    this.world.dishes.push(s.dish);
    s.dish = null;
    this.touch();
    return true;
  }

  priceOf(d: Dish) {
    return dishPrice(d, this.world.reputation, cozy(this.world));
  }

  get cozyBonus() {
    return cozy(this.world);
  }

  slotCount() {
    return counterSlots(this.world);
  }

  // ----- animals -----
  animalCount(id: AnimalId) {
    return animalCount(this.world, id);
  }

  animalMax(id: AnimalId) {
    return animalMax(this.world, id);
  }

  animalPrice(id: AnimalId): number | null {
    const def = ANIMALS[id];
    if (this.animalCount(id) >= this.animalMax(id)) return null;
    return Math.round(def.price * (1 + this.animalCount(id) * 0.25));
  }

  canBuyAnimal(id: AnimalId): boolean {
    const def = ANIMALS[id];
    const price = this.animalPrice(id);
    if (price === null) return false;
    if (def.requires && this.upgradeLevel(def.requires) === 0) return false;
    return this.world.coins >= price;
  }

  buyAnimal(id: AnimalId): boolean {
    if (!this.canBuyAnimal(id)) return false;
    this.world.coins -= this.animalPrice(id) as number;
    const p = this.world.producers[id] ?? { count: 0, anchor: Date.now(), waiting: 0 };
    if (p.count === 0) p.anchor = Date.now();
    p.count++;
    this.world.producers[id] = p;
    this.touch();
    return true;
  }

  /** Products waiting at the given home (farm coop/hives or ranch barn). */
  waitingAt(home: 'farm' | 'ranch', only?: AnimalId[]): { animal: AnimalId; count: number }[] {
    const out: { animal: AnimalId; count: number }[] = [];
    for (const id of Object.keys(this.world.producers) as AnimalId[]) {
      if (ANIMALS[id].home !== home) continue;
      if (only && !only.includes(id)) continue;
      const w = this.world.producers[id]?.waiting ?? 0;
      if (w > 0) out.push({ animal: id, count: w });
    }
    return out;
  }

  collect(home: 'farm' | 'ranch', only?: AnimalId[]): { item: ItemId; count: number }[] {
    const got: { item: ItemId; count: number }[] = [];
    for (const { animal, count } of this.waitingAt(home, only)) {
      const p = this.world.producers[animal];
      if (!p) continue;
      p.waiting = 0;
      const item = ANIMALS[animal].product;
      if (!item) continue;
      this.world.inventory[item] = this.count(item) + count;
      bump(this.world, `collect:${item}`, count);
      got.push({ item, count });
    }
    if (got.length) this.touch();
    return got;
  }

  // ----- seed maker -----
  /** Turn crops into seeds at the seed maker. Returns seeds made. */
  makeSeeds(crop: CropId, n: number): number {
    const have = this.count(`crop:${crop}`);
    const k = Math.min(n, have);
    if (k <= 0 || this.upgradeLevel('seedmaker') === 0) return 0;
    this.add(`crop:${crop}`, -k);
    this.add(`seed:${crop}`, k * SEEDS_PER_CROP);
    bump(this.world, 'seedsmade', k * SEEDS_PER_CROP);
    this.touch();
    return k * SEEDS_PER_CROP;
  }

  // ----- forage -----
  forageAvailable(key: string, respawnMin: number): boolean {
    const t = this.world.forageTaken[key];
    return !t || Date.now() - t > respawnMin * 60_000;
  }

  takeForage(key: string, item: ItemId): number {
    const n = 1 + (Math.random() < 0.3 ? 1 : 0);
    this.world.forageTaken[key] = Date.now();
    this.world.inventory[item] = this.count(item) + n;
    bump(this.world, 'forage', n);
    bump(this.world, `by:${this.me}:forage`, n);
    this.touch();
    return n;
  }

  // ----- orders -----
  orderHave(o: Order): number {
    if (o.dish) return this.world.dishes.filter((d) => d.recipe === o.dish).length;
    return this.count(o.item as ItemId);
  }

  canComplete(o: Order) {
    return this.orderHave(o) >= o.qty;
  }

  completeOrder(index: number): Order | null {
    const o = this.world.orders[index];
    if (!o || !this.canComplete(o)) return null;
    if (o.dish) {
      let left = o.qty;
      this.world.dishes = this.world.dishes.filter((d) => {
        if (left > 0 && d.recipe === o.dish) {
          left--;
          return false;
        }
        return true;
      });
    } else {
      this.world.inventory[o.item as ItemId] = this.count(o.item as ItemId) - o.qty;
    }
    this.world.coins += o.reward;
    this.world.reputation = Math.min(100, this.world.reputation + o.rep);
    this.world.orders.splice(index, 1);
    bump(this.world, 'orders');
    bump(this.world, 'earned', o.reward);
    this.touch();
    return o;
  }

  // ----- furniture -----
  furnitureOwned(id: FurnitureId) {
    return this.world.furnitureOwned[id] ?? 0;
  }

  /** Today's discounted furniture piece (same for both players). */
  get furnitureSale(): FurnitureId {
    return furnitureSaleToday(this.world.seed, dayIndex(Date.now()));
  }

  furniturePrice(id: FurnitureId) {
    const p = FURNITURE[id].price;
    return id === this.furnitureSale ? salePrice(p) : p;
  }

  buyFurniture(id: FurnitureId): boolean {
    const def = FURNITURE[id];
    const price = this.furniturePrice(id);
    if (this.world.coins < price || def.unlockRep > this.reputation) return false;
    this.world.coins -= price;
    this.world.furnitureOwned[id] = this.furnitureOwned(id) + 1;
    bump(this.world, 'buyfurn');
    this.touch();
    return true;
  }

  placeFurniture(id: FurnitureId, tx: number, ty: number): boolean {
    if (this.furnitureOwned(id) <= 0) return false;
    this.world.furnitureOwned[id] = this.furnitureOwned(id) - 1;
    this.world.furniturePlaced.push({ id, tx, ty });
    bump(this.world, 'placed');
    this.touch();
    return true;
  }

  pickUpFurniture(index: number): PlacedFurniture | null {
    if (!Number.isInteger(index) || index < 0 || index >= this.world.furniturePlaced.length) return null;
    const p = this.world.furniturePlaced.splice(index, 1)[0] ?? null;
    if (p) {
      this.world.furnitureOwned[p.id] = this.furnitureOwned(p.id) + 1;
      this.touch();
    }
    return p;
  }

  // ----- clothing -----
  owns(kind: ClothingKind, id: string) {
    if (isFreeClothing(id)) return true;
    return this.world.clothingOwned.includes(clothingKey(kind, id));
  }

  /** Today's discounted clothing item at the tailor. */
  get clothingSale() {
    return clothingSaleToday(this.world.seed, Date.now());
  }

  isOnSale(kind: ClothingKind, id: string) {
    const s = this.clothingSale;
    return s.kind === kind && s.id === id;
  }

  clothingPrice(kind: ClothingKind, id: string): { price: number; unlockRep: number; full: number } {
    const def = clothingDef(kind, id);
    return { price: this.isOnSale(kind, id) ? salePrice(def.price) : def.price, unlockRep: def.unlockRep, full: def.price };
  }

  buyClothing(kind: ClothingKind, id: string): boolean {
    if (this.owns(kind, id)) return false;
    const { price, unlockRep } = this.clothingPrice(kind, id);
    if (this.world.coins < price || unlockRep > this.reputation) return false;
    this.world.coins -= price;
    this.world.clothingOwned.push(clothingKey(kind, id));
    bump(this.world, 'clothes');
    this.touch();
    return true;
  }

  get outfit(): Outfit {
    return this.meData.outfit;
  }

  setOutfit(o: Partial<Outfit>) {
    this.meData.outfit = { ...this.meData.outfit, ...o };
    this.touch();
  }

  // ----- pets -----
  get pet() {
    return this.meData.pet;
  }

  adoptPet(type: PetId, name: string): boolean {
    const price = PETS[type].price;
    if (this.world.coins < price) return false;
    this.world.coins -= price;
    this.meData.pet = { type, name, affection: 0, lastPetAt: 0, lastGiftAt: Date.now() };
    bump(this.world, 'adopt');
    this.touch();
    return true;
  }

  petPet(): boolean {
    const p = this.meData.pet;
    if (!p || Date.now() - p.lastPetAt < PET_COOLDOWN_MS) return false;
    p.lastPetAt = Date.now();
    p.affection = Math.min(100, p.affection + PET_AFFECTION_PER_PET);
    bump(this.world, 'petted');
    this.touch();
    return true;
  }

  /** Called from the game loop; returns a gift item when the pet found one. */
  petGiftCheck(): ItemId | null {
    const p = this.meData.pet;
    if (!p) return null;
    const every = PETS[p.type].giftMin * 60_000 * (1 - p.affection / 200);
    if (Date.now() - p.lastGiftAt < every) return null;
    p.lastGiftAt = Date.now();
    const total = PET_GIFTS.reduce((s, g) => s + g[1], 0);
    let r = Math.random() * total;
    let item = PET_GIFTS[0][0];
    for (const [id, wgt] of PET_GIFTS) {
      r -= wgt;
      if (r <= 0) {
        item = id;
        break;
      }
    }
    this.world.inventory[item as ItemId] = this.count(item as ItemId) + 1;
    bump(this.world, 'petgifts');
    this.touch();
    return item as ItemId;
  }

  // ----- postcards -----
  /** Returns newly earned postcards. */
  checkPostcards(): Postcard[] {
    const got: Postcard[] = [];
    const ctx = {
      stats: this.world.stats,
      daysTogether: this.daysTogether,
      coins: this.world.coins,
      pets: (this.world.players.xb.pet ? 1 : 0) + (this.world.players.qd.pet ? 1 : 0),
      specialToday: false,
    };
    for (const m of POSTCARD_MILESTONES) {
      if (this.world.postcards.some((p) => p.id === m.id)) continue;
      if (m.check(ctx)) {
        const card: Postcard = { id: m.id, title: m.title, day: dayKey(Date.now()), scene: m.scene };
        this.world.postcards.push(card);
        got.push(card);
      }
    }
    if (got.length) this.touch();
    return got;
  }

  // ----- journey (chapters & tasks) and daily tasks -----

  /**
   * Claims every finished task of the current chapter, then the chapter itself,
   * then any finished daily tasks. Returns what happened, for banners.
   */
  checkProgress(): ProgressEvent[] {
    const out: ProgressEvent[] = [];
    const w = this.world;
    for (let guard = 0; guard < CHAPTERS.length; guard++) {
      const ch = currentChapter(w);
      if (!ch) break;
      for (const t of ch.tasks) {
        if (w.questsClaimed.includes(t.id) || t.progress(w) < t.target) continue;
        w.questsClaimed.push(t.id);
        w.coins += t.reward;
        out.push({ kind: 'task', title: t.title, reward: t.reward });
      }
      if (!ch.tasks.every((t) => w.questsClaimed.includes(t.id))) break;
      w.questsClaimed.push(`ch:${ch.id}`);
      const r = ch.reward;
      w.coins += r.coins;
      if (r.rep) w.reputation = Math.min(100, w.reputation + r.rep);
      for (const [id, n] of Object.entries(r.items ?? {})) w.inventory[id as ItemId] = this.count(id as ItemId) + (n ?? 0);
      for (const [id, n] of Object.entries(r.furniture ?? {})) w.furnitureOwned[id as FurnitureId] = this.furnitureOwned(id as FurnitureId) + (n ?? 0);
      for (const key of r.clothing ?? []) if (!w.clothingOwned.includes(key)) w.clothingOwned.push(key);
      const next = currentChapter(w);
      out.push({ kind: 'chapter', number: CHAPTERS.indexOf(ch) + 1, title: ch.title, rewardText: r.text, next: next?.title ?? null });
    }
    this.checkBond(out);
    refreshDaily(w, Date.now());
    const d = w.daily;
    if (d) {
      for (const def of dailyDefs(w)) {
        if (d.claimed.includes(def.id) || dailyProgress(w, def) < def.target) continue;
        d.claimed.push(def.id);
        w.coins += def.reward;
        out.push({ kind: 'daily', title: def.title, reward: def.reward });
      }
      if (d.ids.length && d.ids.every((id) => d.claimed.includes(id)) && !d.claimed.includes('all')) {
        d.claimed.push('all');
        w.coins += DAILY_BONUS;
        w.reputation = Math.min(100, w.reputation + 1);
        out.push({ kind: 'dailyAll', reward: DAILY_BONUS });
      }
    }
    if (out.length) this.touch();
    return out;
  }

  // ----- couple bond -----
  /** Adds bond points from a source (daily caps apply). Returns points added. */
  bond(source: BondSource, times = 1): number {
    const n = addBond(this.world, source, Date.now(), times);
    if (n) this.touch();
    return n;
  }

  get bondPoints() {
    return this.world.bond?.points ?? 0;
  }

  get bondLevel() {
    return bondLevel(this.bondPoints);
  }

  get partnerOutfit() {
    return this.world.players[otherPlayer(this.me)].outfit;
  }

  get matching() {
    return outfitsMatch(this.outfit, this.partnerOutfit);
  }

  /** Both played today, matching outfits, and bond level rewards. */
  private checkBond(out: ProgressEvent[]) {
    const w = this.world;
    const now = Date.now();
    const days = this.daysTogether;
    if (days > (w.stats['bond:days'] ?? 0)) {
      w.stats['bond:days'] = days;
      addBond(w, 'together_day', now);
    }
    const today = dayIndex(now);
    if (this.matching && w.stats[`match:${this.me}`] !== today) {
      w.stats[`match:${this.me}`] = today;
      bump(w, 'matchday');
      addBond(w, 'matching', now);
      out.push({ kind: 'match', partner: otherPlayer(this.me) });
    }
    const lvl = bondLevel(w.bond?.points ?? 0);
    for (const r of BOND_REWARDS) {
      const key = `bond:${r.level}`;
      if (r.level > lvl || w.questsClaimed.includes(key)) continue;
      w.questsClaimed.push(key);
      if (r.coins) w.coins += r.coins;
      for (const [id, n] of Object.entries(r.furniture ?? {})) w.furnitureOwned[id as FurnitureId] = this.furnitureOwned(id as FurnitureId) + (n ?? 0);
      for (const c of r.clothing ?? []) if (!w.clothingOwned.includes(c)) w.clothingOwned.push(c);
      out.push({ kind: 'bond', level: r.level, text: r.text });
    }
  }

  // ----- gifts for each other -----
  /** Takes the item out of the bag and wraps it for the partner. */
  wrapGift(key: string, msg: string): boolean {
    const w = this.world;
    if (key.startsWith('dish:')) {
      const [, recipe, grade] = key.split(':');
      const i = w.dishes.findIndex((d) => d.recipe === recipe && d.grade === Number(grade));
      if (i < 0) return false;
      w.dishes.splice(i, 1);
    } else if (key.startsWith('furn:')) {
      const id = key.slice(5) as FurnitureId;
      if (this.furnitureOwned(id) <= 0) return false;
      w.furnitureOwned[id] = this.furnitureOwned(id) - 1;
    } else {
      if (this.count(key as ItemId) <= 0) return false;
      this.add(key as ItemId, -1);
    }
    const g: PartnerGift = { id: `${Date.now().toString(36)}${Math.floor(Math.random() * 1e4)}`, from: this.me, to: otherPlayer(this.me), key, count: 1, msg, at: Date.now() };
    w.giftBox = [...(w.giftBox ?? []), g];
    bump(w, 'giftsent');
    addBond(w, 'gift', Date.now());
    this.touch();
    return true;
  }

  get giftsForMe(): PartnerGift[] {
    return (this.world.giftBox ?? []).filter((g) => g.to === this.me);
  }

  get giftsWaiting(): PartnerGift[] {
    return (this.world.giftBox ?? []).filter((g) => g.from === this.me);
  }

  openGift(id: string): PartnerGift | null {
    const w = this.world;
    const g = (w.giftBox ?? []).find((x) => x.id === id && x.to === this.me);
    if (!g) return null;
    w.giftBox = (w.giftBox ?? []).filter((x) => x.id !== id);
    if (g.key.startsWith('dish:')) {
      const [, recipe, grade] = g.key.split(':');
      w.dishes.push({ recipe: recipe as RecipeId, grade: Number(grade) as Dish['grade'] });
    } else if (g.key.startsWith('furn:')) {
      const f = g.key.slice(5) as FurnitureId;
      w.furnitureOwned[f] = this.furnitureOwned(f) + g.count;
    } else this.add(g.key as ItemId, g.count);
    bump(w, 'giftopened');
    addBond(w, 'opened', Date.now());
    this.touch();
    return g;
  }

  // ----- photos -----
  takePhoto(spot: PhotoSpot, together: boolean): Photo {
    const w = this.world;
    const other = otherPlayer(this.me);
    const p: Photo = {
      id: `${Date.now().toString(36)}`,
      spot,
      day: dayKey(Date.now()),
      by: this.me,
      together,
      outfits: together ? { [this.me]: { ...this.outfit }, [other]: { ...this.partnerOutfit } } : { [this.me]: { ...this.outfit } },
    };
    w.photos = [...(w.photos ?? []), p].slice(-MAX_PHOTOS);
    bump(w, together ? 'photos_together' : 'photos');
    bump(w, `by:${this.me}:photos`);
    addBond(w, together ? 'photo' : 'selfie', Date.now());
    this.touch();
    return p;
  }

  /** "Thinking of you": a tiny note and a little bond. */
  sendHeart() {
    bump(this.world, 'heartsent');
    this.bond('heart');
  }

  // ----- collection book -----

  /** Adds a caught fish to the bag and the book. */
  recordCatch(fish: FishDef, size: number): { isNew: boolean; record: boolean; bonus: number } {
    const w = this.world;
    const isNew = !w.stats[`fish:${fish.id}`];
    const best = w.stats[`fishbest:${fish.id}`] ?? 0;
    bump(w, `fish:${fish.id}`);
    bump(w, 'fish');
    bump(w, `by:${this.me}:fish`);
    if (size > best) w.stats[`fishbest:${fish.id}`] = size;
    w.inventory.fish = this.count('fish') + fish.units;
    const bonus = isNew ? fish.firstBonus : 0;
    w.coins += bonus;
    this.touch();
    return { isNew, record: !isNew && size > best, bonus };
  }

  /** Remembers the best grade each recipe was cooked at (stored as grade + 1). */
  recordDishGrade(recipe: RecipeId, grade: number) {
    const key = `best:${recipe}`;
    if ((this.world.stats[key] ?? 0) < grade + 1) this.world.stats[key] = grade + 1;
    this.touch();
  }

  // ----- friendship -----

  friendHearts(id: string) {
    return heartsFor(friendPoints(this.world, id));
  }

  canGiftToday(id: string) {
    return !giftedToday(this.world, id, Date.now());
  }

  private addFriendPoints(id: string, n: number) {
    const key = `friend:${id}`;
    this.world.stats[key] = Math.max(0, Math.min(HEART_POINTS * MAX_HEARTS, (this.world.stats[key] ?? 0) + n));
  }

  /** Pays out heart rewards that are now unlocked. */
  private claimFriendRewards(v: VillagerDef): FriendReward[] {
    const w = this.world;
    const hearts = this.friendHearts(v.id);
    const got: FriendReward[] = [];
    for (const r of v.rewards) {
      const key = `fr:${v.id}:${r.hearts}`;
      if (hearts < r.hearts || w.questsClaimed.includes(key)) continue;
      w.questsClaimed.push(key);
      if (r.coins) w.coins += r.coins;
      for (const [id, n] of Object.entries(r.items ?? {})) w.inventory[id as ItemId] = this.count(id as ItemId) + (n ?? 0);
      for (const [id, n] of Object.entries(r.furniture ?? {})) w.furnitureOwned[id as FurnitureId] = this.furnitureOwned(id as FurnitureId) + (n ?? 0);
      for (const c of r.clothing ?? []) if (!w.clothingOwned.includes(c)) w.clothingOwned.push(c);
      if (r.book && !w.books.includes(r.book)) w.books.push(r.book);
      got.push(r);
    }
    return got;
  }

  /** First chat of the day with a villager earns a little friendship. */
  talkVillager(id: string): { hearts: number; heartUp: boolean; rewards: FriendReward[] } {
    const v = villager(id);
    if (!v) return { hearts: 0, heartUp: false, rewards: [] };
    const before = this.friendHearts(id);
    if (!talkedToday(this.world, id, Date.now())) {
      this.world.stats[`talkday:${id}`] = dayIndex(Date.now());
      this.addFriendPoints(id, TALK_POINTS);
    }
    const hearts = this.friendHearts(id);
    const rewards = this.claimFriendRewards(v);
    this.touch();
    return { hearts, heartUp: hearts > before, rewards };
  }

  /**
   * Gives one item or dish to a villager (one gift per villager per day).
   * `key` is an item id or "dish:<recipe>"; dishes give away the lowest grade.
   */
  giveGift(id: string, key: string): { reaction: GiftReaction; hearts: number; heartUp: boolean; rewards: FriendReward[] } | null {
    const v = villager(id);
    if (!v || !this.canGiftToday(id)) return null;
    const w = this.world;
    if (key.startsWith('dish:')) {
      const recipe = key.slice(5);
      let idx = -1;
      w.dishes.forEach((d, i) => {
        if (d.recipe === recipe && (idx < 0 || d.grade < w.dishes[idx].grade)) idx = i;
      });
      if (idx < 0) return null;
      w.dishes.splice(idx, 1);
    } else {
      if (this.count(key as ItemId) <= 0) return null;
      w.inventory[key as ItemId] = this.count(key as ItemId) - 1;
    }
    const before = this.friendHearts(id);
    const reaction = giftReaction(v, key);
    this.addFriendPoints(id, GIFT_POINTS[reaction]);
    w.stats[`giftday:${id}`] = dayIndex(Date.now());
    bump(w, 'gifts');
    bump(w, `by:${this.me}:gifts`);
    if (reaction === 'love') w.stats[`loveknown:${id}:${key}`] = 1;
    const hearts = this.friendHearts(id);
    const rewards = this.claimFriendRewards(v);
    this.touch();
    return { reaction, hearts, heartUp: hearts > before, rewards };
  }

  itemName(id: ItemId) {
    return ITEMS[id].name;
  }
}
