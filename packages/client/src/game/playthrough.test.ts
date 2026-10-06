import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CHAPTERS, isRipe, newWorld, RECIPES, simulateWorld, type CropId } from '@hh/shared';
import { GameState } from './state';

/**
 * A bot that plays the game the way a person does, through the same rules the
 * screens call. It is the automated version of sitting down and playing: if a
 * chapter stops completing, a shop stops taking coins or the economy drifts,
 * this fails without anyone opening a browser.
 */

beforeEach(() => {
  const values = new Map<string, string>();
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  });
});

const MIN = 60_000;

class Bot {
  readonly state: GameState;
  readonly log: string[] = [];
  /** The bot keeps its own clock so a session can cover days in milliseconds. */
  now = Date.now();

  constructor(seed = 7) {
    this.state = new GameState(newWorld(this.now, seed));
    this.state.markPlayedToday();
  }

  /** Let the world run forward: crops grow, animals produce, the counter sells. */
  advance(minutes: number) {
    this.now += minutes * MIN;
    const { world, events } = simulateWorld(this.state.world, this.now);
    this.state.replaceWorld(world);
    return events;
  }

  /** Till, plant and harvest a patch, skipping the waiting. */
  farm(crop: CropId, plots = 3) {
    const st = this.state;
    st.add(`seed:${crop}`, plots);
    for (let i = 0; i < plots; i++) {
      st.setPlot(i, 0, { tilled: true, crop: null, stage: 0, progress: 0, wateredUntil: 0 });
      st.stat('till');
      st.add(`seed:${crop}`, -1);
      st.setPlot(i, 0, { tilled: true, crop, stage: 0, progress: 0, wateredUntil: this.now + 2 * 60 * MIN });
      st.stat('plant');
      st.stat('water');
    }
    // let them grow, then pick them
    this.advance(8 * 60);
    let picked = 0;
    for (let i = 0; i < plots; i++) {
      const p = st.plot(i, 0);
      if (!isRipe(p)) continue;
      st.add(`crop:${crop}`, 2);
      st.setPlot(i, 0, { tilled: true, crop: null, stage: 0, progress: 0, wateredUntil: 0 });
      st.stat('harvest', 2);
      picked += 2;
    }
    this.log.push(`farmed ${picked} ${crop}`);
    return picked;
  }

  /** Cook a dish the way the kitchen does: pay the ingredients, keep the dish. */
  cook(recipe: keyof typeof RECIPES, grade: 0 | 1 | 2 | 3 = 2) {
    const st = this.state;
    const r = RECIPES[recipe];
    for (const [item, n] of Object.entries(r.ingredients)) {
      if (st.count(item as never) < (n ?? 0)) return false;
    }
    for (const [item, n] of Object.entries(r.ingredients)) st.add(item as never, -(n ?? 0));
    const ok = st.addDish({ recipe, grade });
    if (ok) {
      st.stat('cook');
      st.recordDishGrade(recipe, grade);
      this.log.push(`cooked ${r.name}`);
    }
    return ok;
  }

  /** Put a dish out and let the world sell it while nobody is playing. */
  sellFromCounter(hours: number) {
    const st = this.state;
    st.listDish(0);
    st.stat('listed');
    const before = st.coins;
    const events = this.advance(hours * 60);
    const sales = events.filter((e) => e.type === 'sale').length;
    this.log.push(`counter sold ${sales} for ${st.coins - before}c`);
    return { sales, earned: st.coins - before };
  }
}

describe('a first session', () => {
  it('plays chapter one from the letter to the first harvest', () => {
    const bot = new Bot();
    const st = bot.state;

    st.stat('mail');
    bot.farm('wheat', 3);
    const events = st.checkProgress();

    const claimed = st.world.questsClaimed;
    for (const id of ['c1_mail', 'c1_till', 'c1_plant', 'c1_water', 'c1_harvest']) {
      expect(claimed, `${id} should be claimed after doing it`).toContain(id);
    }
    expect(claimed).toContain('ch:ch1');
    expect(events.some((e) => e.kind === 'chapter')).toBe(true);
    expect(st.coins).toBeGreaterThan(60);
  });

  it('cooks, sells on the counter while away, and keeps the books straight', () => {
    const bot = new Bot();
    const st = bot.state;
    bot.farm('tomato', 3);

    const tomatoes = st.count('crop:tomato');
    expect(bot.cook('tomato_soup', 3)).toBe(true);
    expect(st.count('crop:tomato')).toBe(tomatoes - 2);
    expect(st.world.dishes).toHaveLength(1);

    const { sales, earned } = bot.sellFromCounter(6);
    expect(sales).toBeGreaterThan(0);
    expect(earned).toBeGreaterThan(0);
    expect(st.world.dishes).toHaveLength(0);
    expect(st.coins).toBeGreaterThan(0);
  });

  it('never leaves the player stuck without coins or seeds', () => {
    const bot = new Bot();
    const st = bot.state;
    // spend everything, then check the free path back: wheat seeds are affordable
    st.world.coins = 0;
    bot.farm('wheat', 2);
    expect(st.count('crop:wheat')).toBeGreaterThan(0);
    expect(st.sellItem('crop:wheat', 1)).toBeGreaterThan(0);
    expect(st.coins).toBeGreaterThan(0);
    expect(st.buySeed('wheat', 1)).toBe(true);
  });
});

describe('a long session', () => {
  it('works through the early chapters without getting stuck', () => {
    const bot = new Bot();
    const st = bot.state;
    st.world.coins = 5000;
    st.addRep(40);

    st.stat('mail');
    bot.farm('wheat', 3);
    bot.farm('tomato', 3);
    bot.cook('tomato_soup', 3);
    bot.sellFromCounter(4);
    st.stat('sold', 3);
    st.discover('town');
    st.stat('talk:mayor');
    st.buySeed('tomato', 2);
    st.stat('orders');
    st.checkProgress();

    const done = CHAPTERS.filter((c) => st.world.questsClaimed.includes(`ch:${c.id}`));
    expect(done.length, 'the first chapters should complete from ordinary play').toBeGreaterThanOrEqual(2);
    expect(st.coins).toBeGreaterThan(0);
    expect(st.reputation).toBeGreaterThan(0);
  });

  it('keeps animals, fish and friends in step', () => {
    const bot = new Bot();
    const st = bot.state;
    st.world.coins = 9000;
    st.buyUpgrade('coop');
    expect(st.buyAnimal('chicken')).toBe(true);

    // eggs pile up while away, and collecting empties the coop
    bot.advance(3 * 60);
    const waiting = st.waitingAt('farm', ['chicken']).reduce((s, w) => s + w.count, 0);
    expect(waiting).toBeGreaterThan(0);
    const got = st.collect('farm', ['chicken']);
    expect(got[0].item).toBe('egg');
    expect(st.waitingAt('farm', ['chicken'])).toHaveLength(0);

    // a fish is recorded once as new, then as a record
    const first = st.recordCatch({ id: 'minnow', name: 'Minnow', where: ['farm'], time: 'any', rarity: 'common', weight: 1, difficulty: 0.1, minSize: 4, maxSize: 8, units: 1, firstBonus: 20, color: '#fff', hint: '' }, 6);
    expect(first.isNew).toBe(true);
    expect(first.bonus).toBe(20);

    // talking and a loved gift move a villager's hearts
    st.add('crop:strawberry', 1);
    st.talkVillager('lily');
    const gift = st.giveGift('lily', 'crop:strawberry');
    expect(gift?.reaction).toBe('love');
    expect(st.friendHearts('lily')).toBeGreaterThanOrEqual(1);
  });

  it('grows the couple bond from ordinary gestures', () => {
    const bot = new Bot();
    const st = bot.state;
    const start = st.bondPoints;

    st.stat('note');
    st.bond('note');
    st.takePhoto('lovetree', true);
    st.add('crop:tomato', 1);
    expect(st.wrapGift('crop:tomato', 'for you')).toBe(true);
    st.checkProgress();

    expect(st.bondPoints).toBeGreaterThan(start);
    st.world.bond = { points: 999, day: 0, got: {} };
    const events = st.checkProgress();
    expect(events.some((e) => e.kind === 'bond'), 'bond rewards should pay out').toBe(true);
    expect(st.furnitureOwned('picnic')).toBeGreaterThan(0);
  });
});

describe('time away', () => {
  it('catches up three quiet days without anything going strange', () => {
    const bot = new Bot();
    const st = bot.state;
    st.world.coins = 500;
    st.buyUpgrade('coop');
    st.buyAnimal('chicken');
    bot.farm('wheat', 3);
    bot.cook('bread', 2);
    st.listDish(0);

    const before = st.coins;
    const events = bot.advance(3 * 24 * 60);

    expect(st.coins).toBeGreaterThanOrEqual(before);
    expect(st.coins).toBeLessThan(before + 100_000);
    expect(st.world.dishes.length).toBeLessThanOrEqual(st.dishCap);
    expect(events.length).toBeGreaterThan(0);
    for (const key of Object.keys(st.world.stats)) expect(st.world.stats[key]).toBeGreaterThanOrEqual(0);
    expect(Number.isFinite(st.coins)).toBe(true);
  });
});
