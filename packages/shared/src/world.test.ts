import { describe, expect, it } from 'vitest';
import { migrateWorld, newWorld, simulateWorld, type WorldState } from './world';
import { ANIMALS } from './animals';
import { weatherFor, dayStart, DAY_MS } from './weather';
import { makeOrder } from './orders';
import { daysTogether, loveTreeStage } from './couple';
import { pickDinerOrder, serveValue } from './restaurant';
import { sellPriceToday } from './prices';

const T0 = 1_700_000_000_000;

function stocked(): WorldState {
  const w = newWorld(T0, 1234);
  w.counter[0].dish = { recipe: 'tomato_soup', grade: 2 };
  w.counter[1].dish = { recipe: 'bread', grade: 1 };
  return w;
}

describe('simulateWorld', () => {
  it('sells dishes to counter customers over time and raises reputation', () => {
    const { world, events } = simulateWorld(stocked(), T0 + 60 * 60_000);
    const sales = events.filter((e) => e.type === 'sale');
    expect(sales.length).toBe(2);
    expect(world.coins).toBeGreaterThan(60);
    expect(world.reputation).toBeGreaterThan(0);
    expect(world.counter.every((s) => s.dish === null)).toBe(true);
  });

  it('records customers who found an empty counter', () => {
    const { events } = simulateWorld(newWorld(T0, 5), T0 + 30 * 60_000);
    expect(events.some((e) => e.type === 'customer_left')).toBe(true);
    expect(events.some((e) => e.type === 'sale')).toBe(false);
  });

  it('is step-size independent, including across a day boundary', () => {
    const start = dayStart(T0) + DAY_MS - 20 * 60_000;
    const mk = () => {
      const w = stocked();
      w.lastSimulatedAt = start;
      w.plots['1,1'] = { tilled: true, crop: 'tomato', stage: 0, progress: 0, wateredUntil: 0 };
      w.producers.cow = { count: 2, anchor: start, waiting: 0 };
      return w;
    };
    const end = start + 3 * 60 * 60_000;
    const one = simulateWorld(mk(), end).world;
    let stepped = mk();
    for (let t = start + 7_000; t < end; t += 7_000) stepped = simulateWorld(stepped, t).world;
    stepped = simulateWorld(stepped, end).world;
    expect(stepped.coins).toBe(one.coins);
    expect(stepped.reputation).toBeCloseTo(one.reputation, 6);
    expect(stepped.counter).toEqual(one.counter);
    expect(stepped.plots).toEqual(one.plots);
    expect(stepped.producers).toEqual(one.producers);
    expect(stepped.orders).toEqual(one.orders);
  });

  it('animals produce per interval, capped', () => {
    const w = newWorld(T0, 9);
    w.producers.chicken = { count: 2, anchor: T0, waiting: 0 };
    const interval = ANIMALS.chicken.intervalMin * 60_000;
    const { world } = simulateWorld(w, T0 + interval * 2 + 1000);
    expect(world.producers.chicken?.waiting).toBe(4);
    const later = simulateWorld(world, T0 + interval * 50).world;
    expect(later.producers.chicken?.waiting).toBe(12);
  });

  it('rain waters planted plots for the day', () => {
    // find a seed whose day is rainy
    let seed = 1;
    while (weatherFor(seed, T0) !== 'rain') seed++;
    const w = newWorld(T0, seed);
    w.lastRainDay = -1;
    w.plots['2,2'] = { tilled: true, crop: 'wheat', stage: 0, progress: 0, wateredUntil: 0 };
    const { world, events } = simulateWorld(w, T0 + 60_000);
    expect(events.some((e) => e.type === 'rain')).toBe(true);
    expect(world.plots['2,2'].stage).toBeGreaterThanOrEqual(1);
  });

  it('waters crops planted after rain already started', () => {
    let seed = 1;
    while (weatherFor(seed, T0) !== 'rain') seed++;
    const start = dayStart(T0) + 60_000;
    let world = newWorld(start, seed);
    world = simulateWorld(world, start + 60_000).world;
    world.plots['3,3'] = { tilled: true, crop: 'wheat', stage: 0, progress: 0, wateredUntil: 0 };

    const after = simulateWorld(world, start + 120_000).world;

    expect(after.plots['3,3'].wateredUntil).toBe(dayStart(start) + DAY_MS);
    expect(after.plots['3,3'].progress).toBeGreaterThan(0);
  });

  it('keeps two orders and refreshes them daily', () => {
    const w = newWorld(T0, 3);
    expect(w.orders.length).toBe(2);
    const { world } = simulateWorld(w, T0 + DAY_MS + 1000);
    expect(world.orders.length).toBe(2);
    expect(world.orderCounter).toBe(4);
  });

  it('does not mutate its input', () => {
    const w = stocked();
    const snapshot = JSON.stringify(w);
    simulateWorld(w, T0 + 60 * 60_000);
    expect(JSON.stringify(w)).toBe(snapshot);
  });

  it('migrates a v2 save with chickens', () => {
    const old = { version: 2, coins: 500, reputation: 12, inventory: { egg: 3 }, plots: {}, counter: [{ dish: null }, { dish: null }], upgrades: { coop: 1, chicken: 2, counter: 1 }, eggsWaiting: 5, eggAnchor: T0, lastSimulatedAt: T0, seed: 77, stats: { cook: 4 }, questsClaimed: ['till3'], dishes: [] };
    const w = migrateWorld(old, T0 + 1000);
    expect(w.version).toBe(3);
    expect(w.coins).toBe(500);
    expect(w.producers.chicken).toEqual({ count: 2, anchor: T0, waiting: 5 });
    expect((w.upgrades as Record<string, number>).chicken).toBeUndefined();
    expect(w.counter.length).toBe(3);
    expect(w.orders.length).toBe(2);
    expect(w.players.xb.outfit.hat).toBe('none');
  });
});

describe('helpers', () => {
  it('orders are deterministic', () => {
    expect(makeOrder(5, 3, 20, [])).toEqual(makeOrder(5, 3, 20, []));
    expect(makeOrder(5, 3, 20, []).id).not.toBe(makeOrder(5, 4, 20, []).id);
  });

  it('love tree grows only on shared days', () => {
    expect(daysTogether({ xb: ['a', 'b', 'c'], qd: ['b', 'c', 'd'] })).toBe(2);
    expect(loveTreeStage(0)).toBe(0);
    expect(loveTreeStage(7)).toBe(3);
    expect(loveTreeStage(1000)).toBe(7);
  });

  it('diners only order unlocked dishes and pay more for a match', () => {
    const o = pickDinerOrder(0, [], () => 0.5);
    expect(['tomato_soup', 'bread']).toContain(o.recipe);
    const good = serveValue({ recipe: 'bread', grade: 2 }, 0, 0, 60, 'bread');
    const wrong = serveValue({ recipe: 'tomato_soup', grade: 2 }, 0, 0, 60, 'bread');
    expect(good.paid + good.tip).toBeGreaterThan(wrong.paid + wrong.tip);
  });

  it('daily prices stay within range and are stable within a day', () => {
    const p1 = sellPriceToday('crop:tomato', 42, T0);
    const p2 = sellPriceToday('crop:tomato', 42, T0 + 3600_000);
    expect(p1).toBe(p2);
    expect(p1).toBeGreaterThanOrEqual(25);
    expect(p1).toBeLessThanOrEqual(40);
  });
});
